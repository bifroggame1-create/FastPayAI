'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { Product, ProductVariant } from '@/types'
import { productsApi, adminApi } from '@/lib/api'
import { initAuth, isAdmin as checkIsAdmin, getUser } from '@/lib/auth'

type Tab = 'products' | 'sellers' | 'reviews' | 'promo' | 'files' | 'orders' | 'admins'

interface Admin {
  id: string
  oderId?: string
  userId?: string
  username?: string
  name?: string
  addedAt: string
  addedBy?: string
}

type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

interface Order {
  id: string
  oderId: string
  userId: string
  userName?: string
  userUsername?: string
  productId: string
  productName: string
  variantId?: string
  variantName?: string
  amount: number
  paymentMethod: 'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'
  paymentId?: string
  status: OrderStatus
  deliveryData?: string
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

interface Seller {
  id: string
  name: string
  avatar: string
  rating: number
  isVerified?: boolean
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  text: string
  date: string
}

interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxUses: number
  usedCount: number
  isActive: boolean
  description: string
  expiresAt?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string  // base64 data URL
  uploadedAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Sellers state
  const [sellers, setSellers] = useState<Seller[]>([])
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)

  // Admins state
  const [admins, setAdmins] = useState<Admin[]>([])
  const [newAdminInput, setNewAdminInput] = useState('')
  const [newAdminName, setNewAdminName] = useState('')

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  // Promo state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)

  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null)
  const [ordersStats, setOrdersStats] = useState<any>(null)

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      const authUser = await initAuth()
      const hasAccess = authUser?.isAdmin || checkIsAdmin()
      setIsAdmin(hasAccess)

      if (hasAccess) {
        loadData()
      } else {
        setLoading(false)
      }
    }

    checkAccessAndLoad()
  }, [user])

  const loadData = async () => {
    try {
      const [productsData, promoData, ordersData, statsData, sellersData, adminsData, filesData, reviewsData] = await Promise.all([
        productsApi.getAll({}),
        adminApi.getPromoCodes().catch(() => []),
        adminApi.getOrders().catch(() => ({ orders: [], total: 0 })),
        adminApi.getOrdersStats().catch(() => ({ stats: {} })),
        adminApi.getSellers().catch(() => []),
        adminApi.getAdmins().catch(() => []),
        adminApi.getFiles().catch(() => ({ files: [] })),
        adminApi.getReviews().catch(() => ({ reviews: [] }))
      ])
      setProducts(productsData)
      setPromoCodes(promoData?.promoCodes || promoData || [])
      setOrders(ordersData.orders || [])
      setOrdersStats(statsData.stats || {})
      setSellers(sellersData?.sellers || sellersData || [])
      setAdmins(adminsData?.admins || adminsData || [])
      setUploadedFiles(filesData?.files || [])
      setReviews(reviewsData?.reviews || [])
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async (product: Product) => {
    try {
      if (isAddingNew) {
        const result = await adminApi.createProduct(product)
        if (result.success) {
          setProducts([result.product, ...products])
          alert('Товар успешно создан!')
        }
      } else {
        const result = await adminApi.updateProduct(product._id, product)
        if (result.success) {
          setProducts(products.map(p => p._id === product._id ? result.product : p))
          alert('Товар успешно обновлён!')
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Ошибка сохранения товара: ' + (error as any).message)
    }
    setEditingProduct(null)
    setIsAddingNew(false)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Удалить товар?')) {
      try {
        const result = await adminApi.deleteProduct(productId)
        if (result.success) {
          setProducts(products.filter(p => p._id !== productId))
          alert('Товар удалён')
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Ошибка удаления товара')
      }
    }
  }

  const handleSaveSeller = async (seller: Seller) => {
    try {
      const existingSeller = sellers.find(s => s.id === seller.id)
      if (existingSeller) {
        await adminApi.updateSeller(seller.id, seller)
        setSellers(sellers.map(s => s.id === seller.id ? seller : s))
      } else {
        const result = await adminApi.createSeller(seller)
        setSellers([...sellers, result.seller || { ...seller, id: seller.id || String(Date.now()) }])
      }
      setEditingSeller(null)
      alert('Продавец сохранён')
      // Reload products to get updated seller info
      const productsData = await productsApi.getAll({})
      setProducts(productsData)
    } catch (error: any) {
      console.error('Error saving seller:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка сохранения продавца'
      alert(errorMsg)
    }
  }

  const handleDeleteSeller = async (sellerId: string) => {
    if (!confirm('Удалить продавца?')) return
    try {
      await adminApi.deleteSeller(sellerId)
      setSellers(sellers.filter(s => s.id !== sellerId))
      alert('Продавец удалён')
    } catch (error) {
      console.error('Error deleting seller:', error)
      alert('Ошибка удаления продавца')
    }
  }

  // Admin handlers
  const handleAddAdmin = async () => {
    const input = newAdminInput.trim()
    if (!input) {
      alert('Введите user_id или @username')
      return
    }

    try {
      const isUsername = input.startsWith('@')
      const result = await adminApi.addAdmin({
        userId: isUsername ? undefined : input,
        username: isUsername ? input.substring(1) : undefined,
        name: newAdminName.trim() || undefined
      })

      if (result.success) {
        setAdmins([...admins, result.admin])
        setNewAdminInput('')
        setNewAdminName('')
        alert('Админ добавлен!')
      } else {
        alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'))
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка добавления админа'
      alert('Ошибка (' + (error.response?.status || 'сеть') + '): ' + errorMsg)
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Удалить админа?')) return
    try {
      await adminApi.removeAdmin(adminId)
      setAdmins(admins.filter(a => a.id !== adminId))
      alert('Админ удалён')
    } catch (error) {
      console.error('Error removing admin:', error)
      alert('Ошибка удаления админа')
    }
  }

  const handleSaveReview = async (review: Review) => {
    try {
      if (reviews.find(r => r.id === review.id)) {
        // Update existing review
        const result = await adminApi.updateReview(review.id, {
          userName: review.userName,
          rating: review.rating,
          text: review.text
        })
        if (result.success) {
          setReviews(reviews.map(r => r.id === review.id ? result.review : r))
          alert('Отзыв обновлён')
        }
      } else {
        // Create new review
        const result = await adminApi.createReview({
          productId: review.productId,
          userName: review.userName,
          rating: review.rating,
          text: review.text
        })
        if (result.success) {
          setReviews([result.review, ...reviews])
          alert('Отзыв создан')
        }
      }
      setEditingReview(null)
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Ошибка сохранения отзыва')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Удалить отзыв?')) return
    try {
      const result = await adminApi.deleteReview(reviewId)
      if (result.success) {
        setReviews(reviews.filter(r => r.id !== reviewId))
        alert('Отзыв удалён')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Ошибка удаления отзыва')
    }
  }

  const handleSavePromo = async (promo: PromoCode) => {
    try {
      const existingPromo = promoCodes.find(p => p.code === promo.code)
      if (existingPromo) {
        await adminApi.updatePromoCode(promo.code, promo)
        setPromoCodes(promoCodes.map(p => p.code === promo.code ? promo : p))
      } else {
        await adminApi.createPromoCode(promo)
        setPromoCodes([...promoCodes, promo])
      }
      setEditingPromo(null)
      alert('Промокод сохранён')
    } catch (error) {
      console.error('Error saving promo:', error)
      alert('Ошибка сохранения промокода')
    }
  }

  const handleDeletePromo = async (code: string) => {
    if (confirm('Удалить промокод?')) {
      try {
        await adminApi.deletePromoCode(code)
        setPromoCodes(promoCodes.filter(p => p.code !== code))
        alert('Промокод удалён')
      } catch (error) {
        console.error('Error deleting promo:', error)
        alert('Ошибка удаления промокода')
      }
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return

    for (const file of Array.from(files)) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой. Максимум 5MB`)
        continue
      }

      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const result = await adminApi.uploadFile({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string
          })
          if (result.success) {
            setUploadedFiles(prev => [result.file, ...prev])
          }
        } catch (error) {
          console.error('Error uploading file:', error)
          alert(`Ошибка загрузки файла ${file.name}`)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Удалить файл?')) return
    try {
      const result = await adminApi.deleteFile(fileId)
      if (result.success) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Ошибка удаления файла')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Скопировано!')
  }

  // Order handlers
  const handleDeliverOrder = async (orderId: string, deliveryData: string, deliveryNote?: string) => {
    try {
      const result = await adminApi.deliverOrder(orderId, deliveryData, deliveryNote)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
        setDeliveringOrder(null)
        alert('Товар выдан успешно!')
      }
    } catch (error) {
      console.error('Error delivering order:', error)
      alert('Ошибка выдачи товара')
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Отменить заказ?')) return
    try {
      const result = await adminApi.cancelOrder(orderId)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
        alert('Заказ отменён')
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('Ошибка отмены заказа')
    }
  }

  const handleRefundOrder = async (orderId: string) => {
    if (!confirm('Вернуть деньги за заказ?')) return
    try {
      const result = await adminApi.refundOrder(orderId)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
        alert('Возврат оформлен')
      }
    } catch (error) {
      console.error('Error refunding order:', error)
      alert('Ошибка возврата')
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачен',
      processing: 'В обработке',
      delivered: 'Выдан',
      cancelled: 'Отменён',
      refunded: 'Возврат'
    }
    return labels[status]
  }

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      paid: 'bg-green-500/20 text-green-500',
      processing: 'bg-blue-500/20 text-blue-500',
      delivered: 'bg-accent-cyan/20 text-accent-cyan',
      cancelled: 'bg-red-500/20 text-red-500',
      refunded: 'bg-gray-500/20 text-gray-500'
    }
    return colors[status]
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'cryptobot': 'CryptoBot',
      'cactuspay-sbp': 'СБП',
      'cactuspay-card': 'Карта'
    }
    return labels[method] || method
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  // Access denied screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col items-center justify-center px-4">
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-8 text-center max-w-sm w-full border border-light-border dark:border-dark-border">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-light-text dark:text-dark-text mb-2">
            Доступ запрещён
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
            У вас нет прав для просмотра этой страницы
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header title="Админ-панель v3.0" showBack onBack={() => router.push('/')} showNavButtons={false} />

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'orders', label: 'Заказы', count: orders.length },
          { id: 'products', label: 'Товары', count: products.length },
          { id: 'sellers', label: 'Продавцы', count: sellers.length },
          { id: 'admins', label: 'Админы', count: admins.length },
          { id: 'reviews', label: 'Отзывы', count: reviews.length },
          { id: 'promo', label: 'Промокоды', count: promoCodes.length },
          { id: 'files', label: 'Файлы', count: uploadedFiles.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-accent-cyan text-white'
                : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-light-bg dark:bg-dark-bg'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Stats */}
            {ordersStats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-green-500/10 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-500">{ordersStats.paid || 0}</div>
                  <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Оплачено</div>
                </div>
                <div className="bg-accent-cyan/10 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-accent-cyan">{ordersStats.delivered || 0}</div>
                  <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Выдано</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-yellow-500">{(ordersStats.totalRevenue || 0).toLocaleString()}₽</div>
                  <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Выручка</div>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Заказов пока нет
              </p>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-light-text dark:text-dark-text">
                        {order.productName}
                      </h3>
                      {order.variantName && (
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {order.variantName}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
                    <div className="flex justify-between">
                      <span>Сумма:</span>
                      <span className="font-medium text-light-text dark:text-dark-text">{order.amount.toLocaleString()}₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Оплата:</span>
                      <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Покупатель:</span>
                      <span>{order.userName || order.userUsername || order.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Дата:</span>
                      <span>{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    {order.paidAt && (
                      <div className="flex justify-between">
                        <span>Оплачен:</span>
                        <span>{new Date(order.paidAt).toLocaleString('ru-RU')}</span>
                      </div>
                    )}
                    {order.deliveryData && (
                      <div className="mt-2 p-2 bg-light-bg dark:bg-dark-bg rounded-lg">
                        <span className="text-xs font-medium">Выданные данные:</span>
                        <p className="text-xs break-all">{order.deliveryData}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {order.status === 'paid' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeliveringOrder(order)}
                        className="flex-1 py-2 bg-accent-cyan text-white rounded-lg text-sm font-medium"
                      >
                        Выдать товар
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => handleRefundOrder(order.id)}
                      className="w-full py-2 bg-gray-500 text-white rounded-lg text-sm font-medium"
                    >
                      Оформить возврат
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setIsAddingNew(true)
                setEditingProduct({
                  _id: '',
                  name: '',
                  price: 0,
                  images: ['/products/placeholder.png'],
                  condition: 'new',
                  category: 'ai-subscriptions',
                  seller: sellers[0],
                  rating: 5.0,
                  description: '',
                  inStock: true,
                  createdAt: new Date().toISOString(),
                  variants: []
                })
              }}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить товар
            </button>

            {products.map(product => (
              <div
                key={product._id}
                className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
              >
                <div className="flex gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-light-text dark:text-dark-text truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {product.category} • {product.price.toLocaleString()}₽
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {product.variants?.length || 0} вариантов
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setIsAddingNew(false)
                        setEditingProduct(product)
                      }}
                      className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingSeller({ id: '', name: '', avatar: '', rating: 5.0, isVerified: false })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить продавца
            </button>

            {sellers.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Продавцов пока нет
              </p>
            ) : (
              sellers.map(seller => (
                <div
                  key={seller.id}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border flex items-center gap-3"
                >
                  <img
                    src={seller.avatar || '/default-avatar.png'}
                    alt={seller.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-light-text dark:text-dark-text">{seller.name}</h3>
                      {seller.isVerified && (
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      ID: {seller.id} • Рейтинг: {seller.rating}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSeller(seller)}
                      className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteSeller(seller.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="space-y-4">
            {/* Add Admin Form */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border space-y-3">
              <h3 className="font-semibold text-light-text dark:text-dark-text">Добавить админа</h3>
              <div>
                <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  User ID или @username
                </label>
                <input
                  type="text"
                  value={newAdminInput}
                  onChange={e => setNewAdminInput(e.target.value)}
                  placeholder="1234567890 или @username"
                  className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                />
              </div>
              <div>
                <label className="block text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  Имя (опционально)
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                />
              </div>
              <button
                onClick={handleAddAdmin}
                className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
              >
                + Добавить админа
              </button>
            </div>

            {/* Admins List */}
            {admins.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Админов пока нет. Добавьте первого админа выше.
              </p>
            ) : (
              admins.map(admin => (
                <div
                  key={admin.id}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">
                        {admin.name || 'Без имени'}
                      </h3>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {admin.userId && `ID: ${admin.userId}`}
                        {admin.userId && admin.username && ' • '}
                        {admin.username && `@${admin.username}`}
                      </p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        Добавлен: {new Date(admin.addedAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingReview({
                id: '',
                productId: products[0]?._id || '',
                userId: '',
                userName: '',
                rating: 5,
                text: '',
                date: new Date().toISOString()
              })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить отзыв
            </button>

            {reviews.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Отзывов пока нет
              </p>
            ) : (
              reviews.map(review => (
                <div
                  key={review.id}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">{review.userName}</h3>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-lg ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => setReviews(reviews.filter(r => r.id !== review.id))}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{review.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Promo Tab */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingPromo({
                code: '',
                discountType: 'percentage',
                discountValue: 10,
                minOrderAmount: 0,
                maxUses: 100,
                usedCount: 0,
                isActive: true,
                description: ''
              })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить промокод
            </button>

            {promoCodes.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Промокодов пока нет
              </p>
            ) : (
              promoCodes.map(promo => (
                <div
                  key={promo.code}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-mono font-bold text-lg text-accent-cyan">{promo.code}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${promo.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {promo.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                      <p className="text-sm text-light-text dark:text-dark-text mb-1">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue}₽`} скидка
                      </p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Использовано: {promo.usedCount}/{promo.maxUses} • Мин. сумма: {promo.minOrderAmount}₽
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPromo(promo)}
                        className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeletePromo(promo.code)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <FileUploader onUpload={handleFileUpload} />

            {uploadedFiles.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Файлов пока нет. Загрузите изображения или текстовые файлы.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {uploadedFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden"
                  >
                    {file.type.startsWith('image/') ? (
                      <img src={file.data} alt={file.name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-light-bg dark:bg-dark-bg">
                        <svg className="w-12 h-12 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium text-light-text dark:text-dark-text truncate">{file.name}</p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => copyToClipboard(file.data)}
                          className="flex-1 py-1 bg-accent-cyan text-white text-xs rounded"
                        >
                          Копировать
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          sellers={sellers}
          uploadedFiles={uploadedFiles}
          onSave={handleSaveProduct}
          onClose={() => {
            setEditingProduct(null)
            setIsAddingNew(false)
          }}
          isNew={isAddingNew}
        />
      )}

      {/* Seller Editor Modal */}
      {editingSeller && (
        <SellerEditor
          seller={editingSeller}
          uploadedFiles={uploadedFiles}
          onSave={handleSaveSeller}
          onClose={() => setEditingSeller(null)}
          isNew={!editingSeller.id}
        />
      )}

      {/* Review Editor Modal */}
      {editingReview && (
        <ReviewEditor
          review={editingReview}
          products={products}
          onSave={handleSaveReview}
          onClose={() => setEditingReview(null)}
        />
      )}

      {/* Promo Editor Modal */}
      {editingPromo && (
        <PromoEditor
          promo={editingPromo}
          onSave={handleSavePromo}
          onClose={() => setEditingPromo(null)}
        />
      )}

      {/* Order Delivery Modal */}
      {deliveringOrder && (
        <OrderDeliveryEditor
          order={deliveringOrder}
          onDeliver={handleDeliverOrder}
          onClose={() => setDeliveringOrder(null)}
        />
      )}
    </div>
  )
}

// File Uploader Component
function FileUploader({ onUpload }: { onUpload: (files: FileList | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="w-full py-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent-cyan transition-colors"
    >
      <svg className="w-10 h-10 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
        Нажмите для загрузки файлов
      </p>
      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
        Изображения, TXT, PDF
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.pdf,.json"
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}

// Product Editor Component
function ProductEditor({
  product,
  sellers,
  uploadedFiles,
  onSave,
  onClose,
  isNew
}: {
  product: Product
  sellers: Seller[]
  uploadedFiles: UploadedFile[]
  onSave: (product: Product) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState({
    ...product,
    price: product.price || 0
  })
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants || [])
  const [showFilePicker, setShowFilePicker] = useState(false)

  const handleAddVariant = () => {
    setVariants([...variants, {
      id: `var-${Date.now()}`,
      name: '',
      price: 0,
      period: '',
      features: []
    }])
  }

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants]
    if (field === 'features') {
      updated[index] = { ...updated[index], features: value.split(',').map((f: string) => f.trim()).filter(Boolean) }
    } else if (field === 'price') {
      updated[index] = { ...updated[index], price: parseInt(value) || 0 }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setVariants(updated)
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('Введите название товара')
      return
    }

    const finalPrice = variants.length > 0 ? variants[0].price : form.price

    onSave({
      ...form,
      price: finalPrice,
      variants: variants.filter(v => v.name.trim())
    })
  }

  const selectImage = (url: string) => {
    setForm({ ...form, images: [url] })
    setShowFilePicker(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
            {isNew ? 'Новый товар' : 'Редактирование'}
          </h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <div className="flex gap-3 items-start">
            <img
              src={form.images[0] || '/products/placeholder.png'}
              alt="Preview"
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Изображение</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.images[0]}
                  onChange={e => setForm({...form, images: [e.target.value]})}
                  placeholder="/brands/example.webp"
                  className="flex-1 px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                />
                <button
                  onClick={() => setShowFilePicker(true)}
                  className="px-3 py-2 bg-accent-cyan text-white rounded-lg text-sm"
                >
                  Выбрать
                </button>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="ChatGPT Plus"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Category & Seller */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Категория</label>
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="ai-subscriptions">AI Подписки</option>
                <option value="vpn">VLESS + Shadowsocks</option>
                <option value="streaming">Стриминг</option>
                <option value="gaming">Игры</option>
                <option value="software">Софт</option>
                <option value="education">Образование</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Продавец</label>
              <select
                value={form.seller.id}
                onChange={e => {
                  const seller = sellers.find(s => s.id === e.target.value)
                  if (seller) setForm({...form, seller})
                }}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Price (if no variants) */}
          {variants.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Базовая цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-light-text dark:text-dark-text">Варианты товара</label>
              <button
                onClick={handleAddVariant}
                className="px-3 py-1 bg-accent-cyan text-white rounded-lg text-sm"
              >
                + Добавить
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary py-4 text-center">
                Добавьте варианты товара (например, разные периоды подписки)
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={variant.id} className="bg-light-bg dark:bg-dark-bg rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
                        Вариант {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveVariant(index)}
                        className="text-red-500 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={e => handleUpdateVariant(index, 'name', e.target.value)}
                        placeholder="Pro (1 месяц)"
                        className="px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={e => handleUpdateVariant(index, 'price', e.target.value)}
                        placeholder="Цена"
                        className="px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={variant.period || ''}
                      onChange={e => handleUpdateVariant(index, 'period', e.target.value)}
                      placeholder="Период (1 месяц, 3 месяца...)"
                      className="w-full px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                    />
                    <input
                      type="text"
                      value={variant.features?.join(', ') || ''}
                      onChange={e => handleUpdateVariant(index, 'features', e.target.value)}
                      placeholder="Особенности через запятую"
                      className="w-full px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 pb-8">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              Сохранить
            </button>
          </div>
        </div>

        {/* File Picker Modal */}
        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-light-text dark:text-dark-text">Выберите изображение</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-2xl">×</button>
              </div>

              {/* Static brand images - persistent */}
              <div className="mb-4">
                <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Статические (сохраняются):
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Claude', url: '/brands/claude.webp' },
                    { name: 'OpenAI', url: '/brands/openai.webp' },
                    { name: 'Gemini', url: '/brands/gemini.webp' },
                    { name: 'Perplexity', url: '/brands/perp.webp' },
                    { name: 'Adobe', url: '/brands/adobe.webp' },
                    { name: 'Apple', url: '/brands/apple.webp' },
                    { name: 'Spotify', url: '/brands/spotify.webp' },
                    { name: 'NordVPN', url: '/brands/nord.webp' },
                    { name: 'Steam', url: '/brands/steam.webp' },
                    { name: 'Xbox', url: '/brands/xbox.webp' },
                    { name: 'PlayStation', url: '/brands/Platstation.webp' },
                  ].map(brand => (
                    <button
                      key={brand.url}
                      onClick={() => selectImage(brand.url)}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent-cyan bg-light-bg dark:bg-dark-bg"
                      title={brand.name}
                    >
                      <img src={brand.url} alt={brand.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Uploaded files - temporary */}
              {uploadedFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Загруженные (временные):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                      <button
                        key={file.id}
                        onClick={() => selectImage(file.data)}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent-cyan"
                      >
                        <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-3 p-2 bg-yellow-500/10 rounded-lg">
                Статические изображения сохраняются при рестарте сервера. Загруженные - только до перезагрузки.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Seller Editor Component
function SellerEditor({
  seller,
  uploadedFiles,
  onSave,
  onClose,
  isNew
}: {
  seller: Seller
  uploadedFiles: UploadedFile[]
  onSave: (seller: Seller) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState(seller)
  const [showFilePicker, setShowFilePicker] = useState(false)

  const selectImage = (url: string) => {
    setForm({ ...form, avatar: url })
    setShowFilePicker(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl relative">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
            {isNew ? 'Новый продавец' : 'Редактирование продавца'}
          </h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img
              src={form.avatar || '/default-avatar.png'}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
            <button
              onClick={() => setShowFilePicker(true)}
              className="px-4 py-2 bg-accent-cyan text-white rounded-lg text-sm"
            >
              Изменить аватар
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">ID</label>
            <input
              type="text"
              value={form.id}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="Telegram ID"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Рейтинг</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={e => setForm({...form, rating: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={form.isVerified || false}
              onChange={e => setForm({...form, isVerified: e.target.checked})}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="verified" className="text-sm text-light-text dark:text-dark-text">
              Верифицированный продавец
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={() => onSave(form)} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Сохранить
            </button>
          </div>
        </div>

        {/* File Picker */}
        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-light-text dark:text-dark-text">Выберите аватар</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-2xl">×</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                  <button
                    key={file.id}
                    onClick={() => selectImage(file.data)}
                    className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-accent-cyan"
                  >
                    <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Review Editor Component
function ReviewEditor({
  review,
  products,
  onSave,
  onClose
}: {
  review: Review
  products: Product[]
  onSave: (review: Review) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(review)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование отзыва</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Товар</label>
            <select
              value={form.productId}
              onChange={e => setForm({...form, productId: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            >
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Имя пользователя</label>
            <input
              type="text"
              value={form.userName}
              onChange={e => setForm({...form, userName: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Рейтинг</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => setForm({...form, rating: star})}
                  className={`text-3xl ${star <= form.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Текст отзыва</label>
            <textarea
              value={form.text}
              onChange={e => setForm({...form, text: e.target.value})}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={() => onSave(form)} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Promo Editor Component
function PromoEditor({
  promo,
  onSave,
  onClose
}: {
  promo: PromoCode
  onSave: (promo: PromoCode) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(promo)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование промокода</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Код</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
              placeholder="PROMO2025"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Описание</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Скидка на первый заказ"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Тип скидки</label>
              <select
                value={form.discountType}
                onChange={e => setForm({...form, discountType: e.target.value as 'percentage' | 'fixed'})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Размер скидки</label>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => setForm({...form, discountValue: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Мин. сумма заказа</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => setForm({...form, minOrderAmount: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Макс. использований</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => setForm({...form, maxUses: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="promo-active"
              checked={form.isActive}
              onChange={e => setForm({...form, isActive: e.target.checked})}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="promo-active" className="text-sm text-light-text dark:text-dark-text">
              Активен
            </label>
          </div>

          <div className="flex gap-2 pt-4 pb-8">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={() => onSave(form)} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Order Delivery Editor Component
function OrderDeliveryEditor({
  order,
  onDeliver,
  onClose
}: {
  order: Order
  onDeliver: (orderId: string, deliveryData: string, deliveryNote?: string) => void
  onClose: () => void
}) {
  const [deliveryData, setDeliveryData] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')

  const handleSubmit = () => {
    if (!deliveryData.trim()) {
      alert('Введите данные для выдачи')
      return
    }
    onDeliver(order.id, deliveryData.trim(), deliveryNote.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Выдача товара</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Order Info */}
          <div className="bg-light-bg dark:bg-dark-bg rounded-xl p-3">
            <h3 className="font-semibold text-light-text dark:text-dark-text">{order.productName}</h3>
            {order.variantName && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{order.variantName}</p>
            )}
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
              Покупатель: {order.userName || order.userUsername || order.userId}
            </p>
            <p className="text-sm font-medium text-accent-cyan mt-1">{order.amount.toLocaleString()}₽</p>
          </div>

          {/* Delivery Data */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
              Данные для выдачи *
            </label>
            <textarea
              value={deliveryData}
              onChange={e => setDeliveryData(e.target.value)}
              placeholder="Ключ, ссылка, логин:пароль и т.д."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Delivery Note */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
              Заметка (опционально)
            </label>
            <input
              type="text"
              value={deliveryNote}
              onChange={e => setDeliveryNote(e.target.value)}
              placeholder="Дополнительная информация для себя"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Выдать товар
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

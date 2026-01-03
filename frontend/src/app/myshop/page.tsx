'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Product } from '@/types'
import { productsApi, adminApi } from '@/lib/api'
import { initAuth, getUser } from '@/lib/auth'
import { formatPrice } from '@/lib/currency'
import BottomNav from '@/components/BottomNav'

type Tab = 'dashboard' | 'orders' | 'products' | 'promo' | 'files' | 'settings'

interface Order {
  id: string
  oderId: string
  userId: string
  userName?: string
  productId: string
  productName: string
  variantName?: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled'
  deliveryData?: string
  createdAt: string
  paidAt?: string
}

interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxUses: number
  usedCount: number
  isActive: boolean
  expiresAt?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
  uploadedAt: string
}

export default function MyShopPage() {
  const router = useRouter()
  const { language, currency } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cryptobot'])

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  })

  // Forms
  const [newPromo, setNewPromo] = useState({
    code: '',
    discountType: 'percentage' as const,
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 100
  })

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  const checkAccessAndLoad = async () => {
    const user = await initAuth()
    // For now, allow if user exists or is admin
    // In production, check if user is a seller
    if (user) {
      setIsSeller(true)
      loadData()
    } else {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [productsData, ordersData, promoData, filesData] = await Promise.all([
        productsApi.getAll({}),
        adminApi.getOrders().catch(() => ({ orders: [] })),
        adminApi.getPromoCodes().catch(() => []),
        adminApi.getFiles().catch(() => ({ files: [] }))
      ])

      setProducts(productsData)
      setOrders(ordersData.orders || [])
      setPromoCodes(promoData?.promoCodes || promoData || [])
      setFiles(filesData?.files || [])

      // Calculate stats
      const activeProducts = productsData.filter((p: Product) => p.isEnabled !== false).length
      const deliveredOrders = (ordersData.orders || []).filter((o: Order) => o.status === 'delivered')
      const revenue = deliveredOrders.reduce((acc: number, o: Order) => acc + (o.amount || 0), 0)

      setStats({
        totalProducts: productsData.length,
        activeProducts,
        totalOrders: (ordersData.orders || []).length,
        pendingOrders: (ordersData.orders || []).filter((o: Order) => o.status === 'paid').length,
        totalRevenue: revenue
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProduct = async (productId: string, currentState: boolean) => {
    try {
      const result = await adminApi.toggleProduct(productId, !currentState)
      if (result.success) {
        setProducts(products.map(p => p._id === productId ? { ...p, isEnabled: !currentState } : p))
        setStats(prev => ({
          ...prev,
          activeProducts: !currentState ? prev.activeProducts + 1 : prev.activeProducts - 1
        }))
      }
    } catch (error) {
      console.error('Error toggling product:', error)
    }
  }

  const handleDeliverOrder = async (orderId: string, deliveryData: string) => {
    try {
      const result = await adminApi.deliverOrder(orderId, deliveryData)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'delivered', deliveryData } : o))
      }
    } catch (error) {
      console.error('Error delivering order:', error)
    }
  }

  const handleCreatePromo = async () => {
    if (!newPromo.code) return
    try {
      const result = await adminApi.createPromoCode({
        ...newPromo,
        isActive: true,
        usedCount: 0
      })
      if (result.success) {
        setPromoCodes([result.promoCode, ...promoCodes])
        setNewPromo({ code: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, maxUses: 100 })
      }
    } catch (error) {
      console.error('Error creating promo:', error)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = e.target?.result as string
        try {
          const result = await adminApi.uploadFile({
            name: file.name,
            type: file.type,
            size: file.size,
            data
          })
          if (result.success) {
            setFiles(prev => [result.file, ...prev])
          }
        } catch (error) {
          console.error('Error uploading file:', error)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTogglePaymentMethod = async (methodId: string) => {
    const newMethods = paymentMethods.includes(methodId)
      ? paymentMethods.filter(m => m !== methodId)
      : [...paymentMethods, methodId]

    try {
      await adminApi.updatePaymentMethods(newMethods)
      setPaymentMethods(newMethods)
    } catch (error) {
      console.error('Error updating payment methods:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSeller) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center pb-16">
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-tg-secondary-bg rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-[17px] font-semibold text-tg-text mb-2">Доступ ограничен</h1>
          <p className="text-[14px] text-tg-hint mb-4">Эта страница доступна только продавцам</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-tg-button text-white rounded-tg-sm font-medium"
          >
            На главную
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Обзор' },
    { id: 'orders', label: 'Заказы', count: stats.pendingOrders },
    { id: 'products', label: 'Товары', count: stats.totalProducts },
    { id: 'promo', label: 'Промо' },
    { id: 'files', label: 'Файлы' },
    { id: 'settings', label: 'Настройки' },
  ]

  return (
    <div className="min-h-screen bg-tg-bg pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg border-b border-tg-separator">
        <div className="px-4 py-3">
          <h1 className="text-[20px] font-bold text-tg-text">Мой магазин</h1>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-tg-button text-white'
                  : 'bg-tg-secondary-bg text-tg-text'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-tg-button/20 text-tg-button'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-tg-secondary-bg rounded-tg p-4">
                <p className="text-[12px] text-tg-hint mb-1">Товаров</p>
                <p className="text-2xl font-bold text-tg-text">{stats.totalProducts}</p>
                <p className="text-[12px] text-app-success">{stats.activeProducts} активных</p>
              </div>
              <div className="bg-tg-secondary-bg rounded-tg p-4">
                <p className="text-[12px] text-tg-hint mb-1">Заказов</p>
                <p className="text-2xl font-bold text-tg-text">{stats.totalOrders}</p>
                <p className="text-[12px] text-tg-accent">{stats.pendingOrders} к выдаче</p>
              </div>
              <div className="col-span-2 bg-tg-secondary-bg rounded-tg p-4">
                <p className="text-[12px] text-tg-hint mb-1">Выручка</p>
                <p className="text-2xl font-bold text-app-success">{formatPrice(stats.totalRevenue, currency)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-tg-hint">Заказов пока нет</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-tg-secondary-bg rounded-tg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[14px] font-medium text-tg-text">{order.productName}</p>
                      <p className="text-[12px] text-tg-hint">{order.oderId?.slice(0, 8)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-tg-sm text-[11px] font-medium ${
                      order.status === 'delivered' ? 'bg-app-success/10 text-app-success' :
                      order.status === 'paid' ? 'bg-tg-accent/10 text-tg-accent' :
                      'bg-tg-hint/10 text-tg-hint'
                    }`}>
                      {order.status === 'delivered' ? 'Выдан' : order.status === 'paid' ? 'Оплачен' : order.status}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-tg-text mb-2">{formatPrice(order.amount, currency)}</p>

                  {order.status === 'paid' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Данные для доставки..."
                        className="flex-1 px-3 py-2 bg-tg-bg rounded-tg-sm text-[14px] text-tg-text placeholder:text-tg-hint outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDeliverOrder(order.id, (e.target as HTMLInputElement).value)
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                          if (input.value) {
                            handleDeliverOrder(order.id, input.value)
                          }
                        }}
                        className="px-4 py-2 bg-tg-button text-white rounded-tg-sm text-[13px] font-medium"
                      >
                        Выдать
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-3">
            {products.map(product => (
              <div key={product._id} className={`bg-tg-secondary-bg rounded-tg p-3 flex items-center gap-3 ${product.isEnabled === false ? 'opacity-50' : ''}`}>
                <img src={product.images[0]} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-tg-text truncate">{product.name}</p>
                  <p className="text-[13px] text-tg-hint">{formatPrice(product.price, currency)}</p>
                </div>
                <button
                  onClick={() => handleToggleProduct(product._id, product.isEnabled !== false)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${product.isEnabled !== false ? 'bg-app-success' : 'bg-tg-hint/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${product.isEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Promo Tab */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <div className="bg-tg-secondary-bg rounded-tg p-4">
              <h3 className="text-[15px] font-medium text-tg-text mb-3">Новый промокод</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Код (например: SALE20)"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 bg-tg-bg rounded-tg-sm text-[14px] text-tg-text placeholder:text-tg-hint outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newPromo.discountType}
                    onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as any })}
                    className="flex-1 px-3 py-2.5 bg-tg-bg rounded-tg-sm text-[14px] text-tg-text outline-none"
                  >
                    <option value="percentage">Процент %</option>
                    <option value="fixed">Фикс. сумма</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Скидка"
                    value={newPromo.discountValue}
                    onChange={(e) => setNewPromo({ ...newPromo, discountValue: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-2.5 bg-tg-bg rounded-tg-sm text-[14px] text-tg-text outline-none"
                  />
                </div>
                <button
                  onClick={handleCreatePromo}
                  className="w-full py-2.5 bg-tg-button text-white rounded-tg-sm text-[14px] font-medium"
                >
                  Создать
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {promoCodes.map(promo => (
                <div key={promo.code} className="bg-tg-secondary-bg rounded-tg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-tg-text font-mono">{promo.code}</p>
                    <p className="text-[12px] text-tg-hint">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatPrice(promo.discountValue, currency)} • Использовано: {promo.usedCount}/{promo.maxUses}
                    </p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${promo.isActive ? 'bg-app-success' : 'bg-tg-hint'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <label className="block w-full py-8 border-2 border-dashed border-tg-separator rounded-tg text-center cursor-pointer hover:border-tg-button/50 transition-colors">
              <svg className="w-8 h-8 mx-auto mb-2 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-[14px] text-tg-hint">Нажмите для загрузки</p>
              <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {files.map(file => (
                <div key={file.id} className="bg-tg-secondary-bg rounded-tg overflow-hidden">
                  {file.type.startsWith('image/') && (
                    <img src={file.data} alt={file.name} className="w-full aspect-square object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-[11px] text-tg-text truncate">{file.name}</p>
                    <button
                      onClick={() => copyToClipboard(file.data)}
                      className="text-[11px] text-tg-accent mt-1"
                    >
                      Скопировать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-tg-secondary-bg rounded-tg p-4">
              <h3 className="text-[15px] font-medium text-tg-text mb-3">Методы оплаты</h3>
              <p className="text-[13px] text-tg-hint mb-4">Выберите доступные способы оплаты</p>

              <div className="space-y-2">
                {[
                  { id: 'cryptobot', name: 'CryptoBot', desc: 'Криптовалюта' },
                  { id: 'xrocket', name: 'xRocket', desc: 'TON кошелёк' },
                  { id: 'telegram-stars', name: 'Telegram Stars', desc: 'Звёзды' },
                  { id: 'cactuspay-sbp', name: 'СБП', desc: 'Быстрые платежи' },
                  { id: 'cactuspay-card', name: 'Карта', desc: 'Банковская карта' },
                ].map(method => (
                  <div key={method.id} className="flex items-center justify-between p-3 bg-tg-bg rounded-tg-sm">
                    <div>
                      <p className="text-[14px] font-medium text-tg-text">{method.name}</p>
                      <p className="text-[12px] text-tg-hint">{method.desc}</p>
                    </div>
                    <button
                      onClick={() => handleTogglePaymentMethod(method.id)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${paymentMethods.includes(method.id) ? 'bg-app-success' : 'bg-tg-hint/30'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${paymentMethods.includes(method.id) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

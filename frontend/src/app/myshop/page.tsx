'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Product } from '@/types'
import { productsApi, adminApi } from '@/lib/api'
import { initAuth } from '@/lib/auth'
import { formatPrice } from '@/lib/currency'
import BottomNav from '@/components/BottomNav'

type Tab = 'dashboard' | 'orders' | 'products' | 'promo' | 'files' | 'settings'
type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

interface Order {
  id: string
  oderId: string
  userId: string
  userName?: string
  userUsername?: string
  productId: string
  productName: string
  variantName?: string
  amount: number
  paymentMethod: string
  status: OrderStatus
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

// Icons
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  promo: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  files: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
}

export default function MyShopPage() {
  const router = useRouter()
  const { currency, theme, toggleTheme, language } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    deliveredOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0
  })

  // Forms
  const [newPromo, setNewPromo] = useState<{
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    minOrderAmount: number
    maxUses: number
  }>({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 100
  })

  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null)
  const [deliveryInput, setDeliveryInput] = useState('')

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  const checkAccessAndLoad = async () => {
    const user = await initAuth()
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

      const today = new Date().toDateString()
      const todayOrders = (ordersData.orders || []).filter((o: Order) =>
        o.status === 'delivered' && new Date(o.paidAt || o.createdAt).toDateString() === today
      )
      const todayRevenue = todayOrders.reduce((acc: number, o: Order) => acc + (o.amount || 0), 0)

      setStats({
        totalProducts: productsData.length,
        activeProducts,
        totalOrders: (ordersData.orders || []).length,
        pendingOrders: (ordersData.orders || []).filter((o: Order) => o.status === 'paid').length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue: revenue,
        todayRevenue
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
        setDeliveringOrderId(null)
        setDeliveryInput('')
        setStats(prev => ({
          ...prev,
          pendingOrders: prev.pendingOrders - 1,
          deliveredOrders: prev.deliveredOrders + 1
        }))
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

  const handleFileUpload = async (filesList: FileList | null) => {
    if (!filesList) return
    for (const file of Array.from(filesList)) {
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

  const getStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { label: string; class: string }> = {
      pending: { label: 'Ожидает', class: 'bg-amber-500/10 text-amber-500' },
      paid: { label: 'Оплачен', class: 'bg-emerald-500/10 text-emerald-500' },
      processing: { label: 'В работе', class: 'bg-blue-500/10 text-blue-500' },
      delivered: { label: 'Выдан', class: 'bg-cyan-500/10 text-cyan-500' },
      cancelled: { label: 'Отменён', class: 'bg-red-500/10 text-red-500' },
      refunded: { label: 'Возврат', class: 'bg-gray-500/10 text-gray-400' }
    }
    return config[status]
  }

  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: Icons.dashboard },
    { id: 'orders', label: 'Заказы', icon: Icons.orders, count: stats.pendingOrders },
    { id: 'products', label: 'Товары', icon: Icons.products, count: stats.totalProducts },
    { id: 'promo', label: 'Промокоды', icon: Icons.promo },
    { id: 'files', label: 'Файлы', icon: Icons.files, count: files.length },
    { id: 'settings', label: 'Настройки', icon: Icons.settings },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSeller) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center pb-16">
        <div className="bg-[#1a1d27] rounded-xl p-8 text-center max-w-sm mx-4 border border-[#2a2d37]">
          <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Доступ ограничен</h1>
          <p className="text-gray-400 text-sm mb-6">Эта страница доступна только продавцам</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            На главную
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-16">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1117] border-r border-[#1e2028] transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#1e2028]">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            <span className="ml-3 font-semibold text-white">Мой магазин</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-4 px-2 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as Tab); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600/10 text-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27]'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#2a2d37] text-gray-400">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Theme Toggle */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27] transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 h-14 bg-[#0f1117] border-b border-[#1e2028] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1d27] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">
            {navItems.find(n => n.id === activeTab)?.label}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1d27] transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-4">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-gray-400 text-xs">Заказов</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
                <div className="text-xs text-emerald-500">+{stats.pendingOrders} к выдаче</div>
              </div>

              <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-400 text-xs">Выдано</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.deliveredOrders}</div>
                <div className="text-xs text-gray-500">{stats.totalProducts} товаров</div>
              </div>

              <div className="col-span-2 bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-400 text-xs">Выручка</span>
                </div>
                <div className="text-3xl font-bold text-white">{formatPrice(stats.totalRevenue, currency)}</div>
                <div className="text-xs text-emerald-500">+{formatPrice(stats.todayRevenue, currency)} сегодня</div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d37]">
              <div className="px-4 py-3 border-b border-[#2a2d37] flex items-center justify-between">
                <h2 className="font-medium text-white text-sm">Последние заказы</h2>
                <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-500">
                  Все →
                </button>
              </div>
              <div className="divide-y divide-[#2a2d37]">
                {orders.slice(0, 5).map(order => {
                  const badge = getStatusBadge(order.status)
                  return (
                    <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{order.productName}</p>
                        <p className="text-xs text-gray-500">{order.userName || order.userUsername || 'Покупатель'}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-medium text-white">{formatPrice(order.amount, currency)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>
                      </div>
                    </div>
                  )
                })}
                {orders.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    Заказов пока нет
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-[#1a1d27] rounded-xl p-8 text-center border border-[#2a2d37]">
                <p className="text-gray-400">Заказов пока нет</p>
              </div>
            ) : (
              orders.map(order => {
                const badge = getStatusBadge(order.status)
                return (
                  <div key={order.id} className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-medium text-white">{order.productName}</p>
                        <p className="text-xs text-gray-500">{order.oderId?.slice(0, 12)}...</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg ${badge.class}`}>{badge.label}</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">
                          {(order.userName || order.userUsername || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-300">{order.userName || order.userUsername || order.userId}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatPrice(order.amount, currency)}</span>
                    </div>

                    {order.status === 'paid' && (
                      deliveringOrderId === order.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={deliveryInput}
                            onChange={(e) => setDeliveryInput(e.target.value)}
                            placeholder="Ключ/ссылка для выдачи..."
                            className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                          />
                          <button
                            onClick={() => handleDeliverOrder(order.id, deliveryInput)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                          >
                            Выдать
                          </button>
                          <button
                            onClick={() => { setDeliveringOrderId(null); setDeliveryInput('') }}
                            className="px-3 py-2 bg-[#2a2d37] text-gray-400 rounded-lg text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeliveringOrderId(order.id)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Выдать товар
                        </button>
                      )
                    )}

                    {order.status === 'delivered' && order.deliveryData && (
                      <div className="mt-2 p-2 bg-[#0f1117] rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Выдано:</p>
                        <p className="text-xs text-gray-300 font-mono break-all">{order.deliveryData}</p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div className="space-y-3">
            {products.map(product => (
              <div
                key={product._id}
                className={`bg-[#1a1d27] rounded-xl p-3 border border-[#2a2d37] flex items-center gap-3 ${
                  product.isEnabled === false ? 'opacity-50' : ''
                }`}
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(product.price, currency)}</p>
                </div>
                <button
                  onClick={() => handleToggleProduct(product._id, product.isEnabled !== false)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    product.isEnabled !== false ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    product.isEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Promo */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h3 className="text-sm font-medium text-white mb-4">Новый промокод</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Код (SALE20)"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <div className="flex gap-2">
                  <select
                    value={newPromo.discountType}
                    onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as 'percentage' | 'fixed' })}
                    className="flex-1 px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="percentage">Процент %</option>
                    <option value="fixed">Фикс. сумма</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Скидка"
                    value={newPromo.discountValue}
                    onChange={(e) => setNewPromo({ ...newPromo, discountValue: parseInt(e.target.value) || 0 })}
                    className="w-24 px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCreatePromo}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Создать
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {promoCodes.map(promo => (
                <div key={promo.code} className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white font-mono">{promo.code}</p>
                    <p className="text-xs text-gray-500">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatPrice(promo.discountValue, currency)}
                      {' • '}{promo.usedCount}/{promo.maxUses} использований
                    </p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${promo.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                </div>
              ))}
              {promoCodes.length === 0 && (
                <div className="bg-[#1a1d27] rounded-xl p-8 text-center border border-[#2a2d37]">
                  <p className="text-gray-400 text-sm">Промокодов пока нет</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <label className="block w-full py-10 border-2 border-dashed border-[#2a2d37] rounded-xl text-center cursor-pointer hover:border-blue-500/50 transition-colors bg-[#1a1d27]">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-400">Нажмите для загрузки</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {files.map(file => (
                <div key={file.id} className="bg-[#1a1d27] rounded-xl overflow-hidden border border-[#2a2d37]">
                  {file.type.startsWith('image/') && (
                    <img src={file.data} alt={file.name} className="w-full aspect-square object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-xs text-white truncate">{file.name}</p>
                    <button
                      onClick={() => copyToClipboard(file.data)}
                      className="text-xs text-blue-500 mt-1"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h3 className="text-sm font-medium text-white mb-1">Методы оплаты</h3>
              <p className="text-xs text-gray-500 mb-4">Выберите доступные способы оплаты для вашего магазина</p>

              <div className="space-y-2">
                {[
                  { id: 'cryptobot', name: 'CryptoBot', desc: 'Криптовалюта через CryptoBot' },
                  { id: 'xrocket', name: 'xRocket', desc: 'TON кошелёк' },
                  { id: 'telegram-stars', name: 'Telegram Stars', desc: 'Оплата звёздами Telegram' },
                  { id: 'cactuspay-sbp', name: 'СБП', desc: 'Система быстрых платежей' },
                  { id: 'cactuspay-card', name: 'Банковская карта', desc: 'Visa, Mastercard, МИР' },
                ].map(method => (
                  <div key={method.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-[#2a2d37]">
                    <div>
                      <p className="text-sm font-medium text-white">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.desc}</p>
                    </div>
                    <button
                      onClick={() => handleTogglePaymentMethod(method.id)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        paymentMethods.includes(method.id) ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        paymentMethods.includes(method.id) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Toggle Card */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h3 className="text-sm font-medium text-white mb-1">Тема оформления</h3>
              <p className="text-xs text-gray-500 mb-4">Выберите цветовую схему интерфейса</p>

              <div className="flex gap-3">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#2a2d37] bg-[#0f1117]'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white text-center">Светлая</p>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#2a2d37] bg-[#0f1117]'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white text-center">Тёмная</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

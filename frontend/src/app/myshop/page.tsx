'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Product, ProductVariant } from '@/types'
import { productsApi, adminApi } from '@/lib/api'
import { initAuth, getUser } from '@/lib/auth'
import { formatPrice } from '@/lib/currency'
import BottomNav from '@/components/BottomNav'

type Tab = 'dashboard' | 'analytics' | 'orders' | 'products' | 'reviews' | 'promo' | 'files' | 'settings' | 'profile' | 'wallet'
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

interface Seller {
  id: string
  name: string
  avatar?: string
  rating: number
}

interface SellerReview {
  id: string
  productId: string
  productName?: string
  userId: string
  userName: string
  rating: number
  text: string
  sellerReply?: string
  sellerReplyAt?: string
  createdAt: string
}

interface Analytics {
  period: string
  summary: {
    totalRevenue: number
    totalOrders: number
    deliveredOrders: number
    conversionRate: number
    averageOrderValue: number
  }
  dailyRevenue: { date: string; revenue: number; orders: number }[]
  topProducts: { id: string; name: string; sales: number; revenue: number }[]
}

interface ShopProfile {
  id: string
  name: string
  description: string
  avatar: string
  banner: string
  contacts: { telegram?: string; email?: string; phone?: string }
  workingHours: string
  rating: number
  ratingCount: number
  isVerified: boolean
  badges: string[]
}

interface NotificationSettings {
  newOrders: boolean
  orderDelivered: boolean
  newReviews: boolean
  lowStock: boolean
  disputes: boolean
  emailNotifications: boolean
}

// Toggle Switch Component
const ToggleSwitch = ({
  enabled,
  onChange,
  disabled = false
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) {
          onChange(!enabled)
        }
      }}
      className={`
        relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${enabled ? 'bg-emerald-500' : 'bg-gray-600'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
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
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  reviews: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
}

// Delivery Keys Manager Component
function DeliveryKeysManager({ productId }: { productId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deliveryType, setDeliveryType] = useState<'manual' | 'auto'>('manual')
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'image'>('text')

  // Text keys input
  const [textKeys, setTextKeys] = useState('')

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Load delivery stats
  const loadStats = async () => {
    if (!productId) return
    try {
      setLoading(true)
      const response = await adminApi.getDeliveryStats(productId)
      setStats(response.stats)
      setDeliveryType(response.deliveryType || 'manual')
    } catch (error) {
      console.error('Failed to load delivery stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [productId])

  const handleAddTextKeys = async () => {
    if (!textKeys.trim()) return
    try {
      const keys = textKeys.split('\n').filter(k => k.trim())
      await adminApi.addDeliveryKeys(productId, keys)
      setTextKeys('')
      await loadStats()
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const fileUrl = event.target?.result as string
          await adminApi.addDeliveryKeys(productId, [{
            key: file.name,
            type: 'file',
            fileUrl: fileUrl,
            fileName: file.name
          }])
          await loadStats()
        }
        reader.readAsDataURL(file)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const fileUrl = event.target?.result as string
          await adminApi.addDeliveryKeys(productId, [{
            key: file.name,
            type: 'image',
            fileUrl: fileUrl,
            fileName: file.name
          }])
          await loadStats()
        }
        reader.readAsDataURL(file)
      }
      if (imageInputRef.current) imageInputRef.current.value = ''
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleRemoveKey = async (keyId: string) => {
    if (!confirm('Удалить этот ключ?')) return
    try {
      await adminApi.removeDeliveryKey(productId, keyId)
      await loadStats()
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleToggleDeliveryType = async () => {
    const newType = deliveryType === 'manual' ? 'auto' : 'manual'
    try {
      await adminApi.updateProductDelivery(productId, { deliveryType: newType })
      setDeliveryType(newType)
      await loadStats()
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400">Загрузка...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Склад товаров</label>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d37]">
            <div className="text-xs text-gray-500 mb-1">Всего</div>
            <div className="text-lg font-semibold text-white">{stats?.total || 0}</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d37]">
            <div className="text-xs text-gray-500 mb-1">Доступно</div>
            <div className="text-lg font-semibold text-emerald-400">{stats?.available || 0}</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d37]">
            <div className="text-xs text-gray-500 mb-1">Использовано</div>
            <div className="text-lg font-semibold text-gray-400">{stats?.used || 0}</div>
          </div>
        </div>

        {/* Delivery Type Toggle */}
        <div className="flex items-center justify-between bg-[#0f1117] rounded-lg p-3 border border-[#2a2d37] mb-4">
          <div>
            <div className="text-sm text-white mb-1">Автоматическая выдача</div>
            <div className="text-xs text-gray-500">
              {deliveryType === 'auto'
                ? 'Ключи выдаются автоматически после оплаты'
                : 'Требуется ручная выдача товара'}
            </div>
          </div>
          <ToggleSwitch enabled={deliveryType === 'auto'} onChange={handleToggleDeliveryType} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0f1117] text-gray-400 hover:text-white'
            }`}
          >
            📝 Текст
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0f1117] text-gray-400 hover:text-white'
            }`}
          >
            📁 Файлы
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'image'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0f1117] text-gray-400 hover:text-white'
            }`}
          >
            🖼️ Фото
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <textarea
              value={textKeys}
              onChange={e => setTextKeys(e.target.value)}
              placeholder="Введите ключи по одному на строку&#10;key1&#10;key2&#10;key3"
              rows={5}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white text-sm font-mono"
            />
            <button
              onClick={handleAddTextKeys}
              disabled={!textKeys.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              Добавить ключи
            </button>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border border-dashed border-[#2a2d37] rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors bg-[#0f1117]"
            >
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-400">Нажмите для загрузки файлов</p>
              <p className="text-xs text-gray-500">TXT, PDF, ZIP, любые документы</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.zip,.doc,.docx,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-3">
            <div
              onClick={() => imageInputRef.current?.click()}
              className="w-full py-8 border border-dashed border-[#2a2d37] rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors bg-[#0f1117]"
            >
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">Нажмите для загрузки изображений</p>
              <p className="text-xs text-gray-500">JPG, PNG, WEBP</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyShopPage() {
  const router = useRouter()
  const { currency, theme, toggleTheme } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null)

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cryptobot'])

  // Seller payment credentials
  const [sellerPaymentConfig, setSellerPaymentConfig] = useState<{
    cryptobotToken?: string
    xrocketApiKey?: string
  }>({})
  const [showCryptobotConfig, setShowCryptobotConfig] = useState(false)
  const [showXrocketConfig, setShowXrocketConfig] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)

  // Wallet
  const [wallet, setWallet] = useState({ balance: 0, pendingBalance: 0, totalEarned: 0, totalWithdrawn: 0 })
  const [walletTransactions, setWalletTransactions] = useState<any[]>([])
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('bank_card')
  const [withdrawDetails, setWithdrawDetails] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d')
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Reviews
  const [reviews, setReviews] = useState<SellerReview[]>([])
  const [reviewStats, setReviewStats] = useState({ total: 0, averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Shop Profile
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    avatar: '',
    banner: '',
    contacts: { telegram: '', email: '', phone: '' },
    workingHours: ''
  })
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newOrders: true,
    orderDelivered: true,
    newReviews: true,
    lowStock: true,
    disputes: true,
    emailNotifications: false
  })

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
  const [newPromo, setNewPromo] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    maxUses: 100
  })

  // Product creation state
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    description: '',
    category: 'services',
    images: ['/products/placeholder.png'],
    variants: [] as ProductVariant[]
  })

  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null)
  const [deliveryInput, setDeliveryInput] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [creatingPromo, setCreatingPromo] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  const checkAccessAndLoad = async () => {
    const user = await initAuth()
    if (user) {
      setIsSeller(true)
      // Get seller info from user
      setCurrentSeller({
        id: user.id || String(user.id),
        name: user.name || user.username || 'Продавец',
        avatar: user.avatar,
        rating: 5
      })
      loadData()
    } else {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [productsData, ordersData, statsData, promoData, filesData, settingsData, walletData, paymentConfigData, profileData, notifData] = await Promise.all([
        adminApi.getMyShopProducts().catch(() => ({ products: [] })),
        adminApi.getMyShopOrders().catch(() => ({ orders: [] })),
        adminApi.getMyShopStats().catch(() => ({ stats: {} })),
        adminApi.getPromoCodes().catch(() => []),
        adminApi.getFiles().catch(() => ({ files: [] })),
        adminApi.getSettings().catch(() => ({ settings: {} })),
        adminApi.getWallet().catch(() => ({ wallet: { balance: 0, pendingBalance: 0 } })),
        adminApi.getSellerPaymentConfig().catch(() => ({ config: {} })),
        adminApi.getMyShopProfile().catch(() => ({ profile: null })),
        adminApi.getMyShopNotifications().catch(() => ({ notifications: {} }))
      ])

      // Set profile
      if (profileData?.profile) {
        setShopProfile(profileData.profile)
        setProfileForm({
          name: profileData.profile.name || '',
          description: profileData.profile.description || '',
          avatar: profileData.profile.avatar || '',
          banner: profileData.profile.banner || '',
          contacts: profileData.profile.contacts || { telegram: '', email: '', phone: '' },
          workingHours: profileData.profile.workingHours || ''
        })
      }

      // Set notifications
      if (notifData?.notifications) {
        setNotifications(notifData.notifications)
      }

      // Set wallet data
      if (walletData?.wallet) {
        setWallet(walletData.wallet)
      }

      const myProducts = productsData?.products || []
      const myOrders = ordersData?.orders || []
      const myStats = statsData?.stats || {}

      setProducts(myProducts)
      setOrders(myOrders)
      setPromoCodes(promoData?.promoCodes || promoData || [])
      setFiles(filesData?.files || [])

      // Load payment methods from settings
      const enabledMethods = settingsData?.settings?.paymentConfig?.enabledMethods || ['cryptobot']
      setPaymentMethods(enabledMethods)

      // Load seller payment config (for showing configured status)
      if (paymentConfigData?.config) {
        // We don't store actual tokens, just show if configured
        setSellerPaymentConfig({
          cryptobotToken: paymentConfigData.config.hasCryptobotToken ? '••••••••' : '',
          xrocketApiKey: paymentConfigData.config.hasXrocketApiKey ? '••••••••' : ''
        })
      }

      // Calculate stats
      const today = new Date().toDateString()
      const todayOrders = myOrders.filter((o: Order) =>
        o.status === 'delivered' && new Date(o.paidAt || o.createdAt).toDateString() === today
      )
      const todayRevenue = todayOrders.reduce((acc: number, o: Order) => acc + (o.amount || 0), 0)

      setStats({
        totalProducts: myStats.productsCount || myProducts.length,
        activeProducts: myStats.activeProducts || myProducts.filter((p: Product) => p.isEnabled !== false).length,
        totalOrders: myStats.totalOrders || myOrders.length,
        pendingOrders: myOrders.filter((o: Order) => o.status === 'paid').length,
        deliveredOrders: myStats.deliveredOrders || myOrders.filter((o: Order) => o.status === 'delivered').length,
        totalRevenue: myStats.revenue || 0,
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
      alert('Ошибка при изменении статуса товара')
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
      alert('Ошибка при выдаче заказа')
    }
  }

  // Load analytics
  const loadAnalytics = async (period: string) => {
    setLoadingAnalytics(true)
    try {
      const result = await adminApi.getMyShopAnalytics(period)
      if (result.success) {
        setAnalytics(result.analytics)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Load reviews
  const loadReviews = async () => {
    try {
      const result = await adminApi.getMyShopReviews()
      if (result.success) {
        setReviews(result.reviews || [])
        setReviewStats(result.stats || { total: 0, averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    }
  }

  // Reply to review
  const handleReplyToReview = async (reviewId: string) => {
    if (!replyText.trim()) return
    try {
      const result = await adminApi.replyToReview(reviewId, replyText)
      if (result.success) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, sellerReply: replyText, sellerReplyAt: new Date().toISOString() } : r))
        setReplyingReviewId(null)
        setReplyText('')
      }
    } catch (error) {
      console.error('Error replying to review:', error)
      alert('Ошибка при отправке ответа')
    }
  }

  // Handle avatar file selection and upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер изображения не должен превышать 5 МБ')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewAvatar(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await adminApi.uploadShopImage(formData)
      if (result.url) {
        setProfileForm({ ...profileForm, avatar: result.url })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Ошибка при загрузке аватара')
      setPreviewAvatar(null)
    } finally {
      setUploadingAvatar(false)
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  // Save profile
  const handleSaveProfile = async () => {
    try {
      const result = await adminApi.updateMyShopProfile(profileForm)
      if (result.success) {
        setShopProfile({ ...shopProfile, ...profileForm } as ShopProfile)
        setEditingProfile(false)
        setPreviewAvatar(null)
        alert('Профиль сохранён')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Ошибка сохранения профиля')
    }
  }

  // Save notifications
  const handleSaveNotifications = async (newSettings: NotificationSettings) => {
    try {
      await adminApi.updateMyShopNotifications(newSettings)
      setNotifications(newSettings)
    } catch (error) {
      console.error('Error saving notifications:', error)
    }
  }

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics(analyticsPeriod)
    }
    if (activeTab === 'reviews' && reviews.length === 0) {
      loadReviews()
    }
    if (activeTab === 'wallet' && walletTransactions.length === 0) {
      loadWalletTransactions()
    }
  }, [activeTab])

  const loadWalletTransactions = async () => {
    try {
      const transactions = await adminApi.getWalletTransactions()
      setWalletTransactions(transactions.transactions || [])
    } catch (error) {
      console.error('Error loading wallet transactions:', error)
    }
  }

  const handleCreatePromo = async () => {
    if (!newPromo.code.trim()) {
      alert('Введите код промокода')
      return
    }

    setCreatingPromo(true)
    try {
      const result = await adminApi.createPromoCode({
        code: newPromo.code.toUpperCase(),
        discountType: newPromo.discountType,
        discountValue: newPromo.discountValue,
        maxUses: newPromo.maxUses,
        isActive: true,
        sellerId: currentSeller?.id // Make promo seller-specific
      })

      if (result.success && result.promo) {
        setPromoCodes([result.promo, ...promoCodes])
        setNewPromo({ code: '', discountType: 'percentage', discountValue: 10, maxUses: 100 })
        alert('Промокод создан!')
      } else {
        alert(result.error || 'Ошибка при создании промокода')
      }
    } catch (error: any) {
      console.error('Error creating promo:', error)
      alert(error?.response?.data?.error || 'Ошибка при создании промокода')
    } finally {
      setCreatingPromo(false)
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
    setSavingPayment(true)
    const newMethods = paymentMethods.includes(methodId)
      ? paymentMethods.filter(m => m !== methodId)
      : [...paymentMethods, methodId]

    // Optimistic update
    setPaymentMethods(newMethods)

    try {
      const result = await adminApi.updatePaymentMethods(newMethods)
      if (!result.success) {
        // Revert on failure
        setPaymentMethods(paymentMethods)
        alert('Ошибка при сохранении настроек')
      }
    } catch (error) {
      console.error('Error updating payment methods:', error)
      // Revert on error
      setPaymentMethods(paymentMethods)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleSavePaymentCredentials = async () => {
    setSavingCredentials(true)
    try {
      const result = await adminApi.updateSellerPaymentConfig(sellerPaymentConfig)
      if (result.success) {
        alert('Платёжные данные сохранены!')
        setShowCryptobotConfig(false)
        setShowXrocketConfig(false)
      } else {
        alert('Ошибка: ' + (result.error || 'Не удалось сохранить'))
      }
    } catch (error: any) {
      console.error('Error saving payment credentials:', error)
      alert('Ошибка при сохранении платёжных данных')
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleProductImageUpload = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return

    setUploadingImage(true)
    try {
      const file = filesList[0]

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 5MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Можно загружать только изображения')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        // Add image to the beginning of array, replacing placeholder if it's the only one
        setProductForm(prev => {
          const currentImages = prev.images.filter(img => img !== '/products/placeholder.png')
          return {
            ...prev,
            images: [dataUrl, ...currentImages]
          }
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Ошибка при загрузке изображения')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveProductImage = (index: number) => {
    setProductForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index)
      // If no images left, add placeholder
      if (newImages.length === 0) {
        return { ...prev, images: ['/products/placeholder.png'] }
      }
      return { ...prev, images: newImages }
    })
  }

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      alert('Введите название товара')
      return
    }
    if (productForm.price <= 0) {
      alert('Укажите цену товара')
      return
    }
    if (!currentSeller) {
      alert('Ошибка: информация о продавце не найдена')
      return
    }

    try {
      const productData = {
        name: productForm.name,
        price: productForm.price,
        description: productForm.description,
        category: productForm.category,
        images: productForm.images,
        condition: 'new' as const,
        inStock: true,
        isEnabled: true,
        variants: productForm.variants,
        seller: currentSeller
      }

      let result: { success: boolean; product?: Product; error?: string }
      if (editingProduct) {
        // Update existing product
        result = await adminApi.updateProduct(editingProduct._id, productData)
        if (result.success && result.product) {
          setProducts(products.map(p => p._id === editingProduct._id ? result.product! : p))
          alert('Товар обновлён!')
        }
      } else {
        // Create new product
        result = await adminApi.createProduct(productData)
        if (result.success && result.product) {
          setProducts([result.product, ...products])
          setStats(prev => ({
            ...prev,
            totalProducts: prev.totalProducts + 1,
            activeProducts: prev.activeProducts + 1
          }))
          alert('Товар создан!')
        }
      }

      if (result.success) {
        setShowProductForm(false)
        setEditingProduct(null)
        setProductForm({
          name: '',
          price: 0,
          description: '',
          category: 'services',
          images: ['/products/placeholder.png'],
          variants: []
        })
      } else {
        alert(result.error || 'Ошибка при сохранении товара')
      }
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(error?.response?.data?.error || 'Ошибка при сохранении товара')
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      alert('Введите сумму для вывода')
      return
    }
    if (amount > wallet.balance) {
      alert('Недостаточно средств')
      return
    }
    if (!withdrawDetails.trim()) {
      alert('Введите реквизиты для вывода')
      return
    }

    setWithdrawing(true)
    try {
      const result = await adminApi.requestWithdrawal({
        amount,
        method: withdrawMethod,
        methodDetails: { details: withdrawDetails }
      })
      if (result.success) {
        setWallet(prev => ({
          ...prev,
          balance: prev.balance - amount,
          pendingBalance: prev.pendingBalance + amount
        }))
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        setWithdrawDetails('')
        // Reload wallet data after successful withdrawal
        await loadWalletTransactions()
        alert('Заявка на вывод создана!')
      } else {
        alert(result.error || 'Ошибка при создании заявки')
      }
    } catch (error: any) {
      console.error('Error withdrawing:', error)
      alert(error?.response?.data?.error || 'Ошибка при выводе средств')
    } finally {
      setWithdrawing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Скопировано!')
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
    { id: 'analytics', label: 'Аналитика', icon: Icons.analytics },
    { id: 'wallet', label: 'Кошелёк', icon: Icons.promo },
    { id: 'orders', label: 'Заказы', icon: Icons.orders, count: stats.pendingOrders },
    { id: 'products', label: 'Товары', icon: Icons.products, count: stats.totalProducts },
    { id: 'reviews', label: 'Отзывы', icon: Icons.reviews },
    { id: 'promo', label: 'Промо', icon: Icons.promo },
    { id: 'files', label: 'Файлы', icon: Icons.files },
    { id: 'profile', label: 'Профиль', icon: Icons.profile },
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

            {/* Wallet Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium">Кошелёк</span>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Вывести
                </button>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{formatPrice(wallet.balance, currency)}</div>
              {wallet.pendingBalance > 0 && (
                <div className="text-xs text-white/60">
                  В обработке: {formatPrice(wallet.pendingBalance, currency)}
                </div>
              )}
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
            {/* Add Product Button */}
            <button
              onClick={() => setShowProductForm(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {Icons.plus}
              Добавить товар
            </button>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowProductForm(false)
                        setEditingProduct(null)
                        setProductForm({
                          name: '',
                          price: 0,
                          description: '',
                          category: 'services',
                          images: ['/products/placeholder.png'],
                          variants: []
                        })
                      }}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Image Upload Section */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Изображения товара</label>
                      <div className="flex gap-2 flex-wrap">
                        {/* Current images */}
                        {productForm.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Product ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-[#2a2d37]"
                            />
                            {img !== '/products/placeholder.png' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProductImage(index)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Upload button */}
                        <label className="w-20 h-20 border-2 border-dashed border-[#2a2d37] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors bg-[#0f1117]">
                          {uploadingImage ? (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-6 h-6 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs text-gray-500">Фото</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleProductImageUpload(e.target.files)}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Первое изображение будет обложкой. Макс. 5MB</p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Название</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="Название товара"
                        className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Цена (₽)</label>
                      <input
                        type="number"
                        value={productForm.price || ''}
                        onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white focus:outline-none"
                      >
                        <option value="services">Услуги</option>
                        <option value="ai-subscriptions">AI подписки</option>
                        <option value="software">Софт</option>
                        <option value="accounts">Аккаунты</option>
                        <option value="gaming">Игры</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Описание</label>
                      <textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Описание товара..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                      />
                    </div>

                    {/* Варианты товара */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Варианты (опционально)</label>
                        <button
                          type="button"
                          onClick={() => setProductForm({
                            ...productForm,
                            variants: [...productForm.variants, { id: `var-${Date.now()}`, name: '', price: 0, period: '', features: [] }]
                          })}
                          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          + Добавить
                        </button>
                      </div>
                      {productForm.variants.length > 0 && (
                        <p className="text-xs text-gray-500 mb-2">Если есть варианты, цена берётся из первого варианта</p>
                      )}
                      {productForm.variants.map((variant, index) => (
                        <div key={variant.id} className="bg-[#0f1117] rounded-lg p-3 mb-2 space-y-2 border border-[#2a2d37]">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Вариант {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => setProductForm({
                                ...productForm,
                                variants: productForm.variants.filter((_, i) => i !== index)
                              })}
                              className="text-xs text-red-500 hover:text-red-400"
                            >
                              Удалить
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => {
                                const updated = [...productForm.variants]
                                updated[index] = { ...updated[index], name: e.target.value }
                                setProductForm({ ...productForm, variants: updated })
                              }}
                              placeholder="Название"
                              className="px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                            />
                            <input
                              type="number"
                              value={variant.price || ''}
                              onChange={(e) => {
                                const updated = [...productForm.variants]
                                updated[index] = { ...updated[index], price: parseInt(e.target.value) || 0 }
                                setProductForm({ ...productForm, variants: updated })
                              }}
                              placeholder="Цена"
                              className="px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                          <input
                            type="text"
                            value={variant.period || ''}
                            onChange={(e) => {
                              const updated = [...productForm.variants]
                              updated[index] = { ...updated[index], period: e.target.value }
                              setProductForm({ ...productForm, variants: updated })
                            }}
                            placeholder="Период (напр. 1 месяц)"
                            className="w-full px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                          />
                          <input
                            type="text"
                            value={variant.features?.join(', ') || ''}
                            onChange={(e) => {
                              const updated = [...productForm.variants]
                              updated[index] = { ...updated[index], features: e.target.value.split(',').map(f => f.trim()).filter(Boolean) }
                              setProductForm({ ...productForm, variants: updated })
                            }}
                            placeholder="Особенности (через запятую)"
                            className="w-full px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Delivery Keys Manager - only for existing products */}
                    {editingProduct && editingProduct._id && (
                      <DeliveryKeysManager productId={editingProduct._id} />
                    )}

                    <button
                      onClick={handleCreateProduct}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products List */}
            {products.length === 0 ? (
              <div className="bg-[#1a1d27] rounded-xl p-8 text-center border border-[#2a2d37]">
                <p className="text-gray-400 mb-4">У вас пока нет товаров</p>
              </div>
            ) : (
              products.map(product => (
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(product)
                        setProductForm({
                          name: product.name,
                          price: product.price,
                          description: product.description || '',
                          category: product.category,
                          images: product.images,
                          variants: product.variants || []
                        })
                        setShowProductForm(true)
                      }}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <ToggleSwitch
                      enabled={product.isEnabled !== false}
                      onChange={() => handleToggleProduct(product._id, product.isEnabled !== false)}
                    />
                  </div>
                </div>
              ))
            )}
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
                  placeholder="Код (например: SALE20)"
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
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Макс. использований</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={newPromo.maxUses}
                    onChange={(e) => setNewPromo({ ...newPromo, maxUses: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCreatePromo}
                  disabled={creatingPromo || !newPromo.code.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {creatingPromo ? 'Создание...' : 'Создать'}
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
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${promo.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                    <button
                      onClick={async () => {
                        if (!confirm(`Удалить промокод ${promo.code}?`)) return
                        try {
                          await adminApi.deletePromoCode(promo.code)
                          setPromoCodes(promoCodes.filter(p => p.code !== promo.code))
                        } catch (error) {
                          console.error('Error deleting promo:', error)
                          alert('Ошибка при удалении промокода')
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Period Selector */}
            <div className="flex gap-2">
              {['7d', '30d', '90d', '365d'].map(p => (
                <button
                  key={p}
                  onClick={() => { setAnalyticsPeriod(p); loadAnalytics(p) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    analyticsPeriod === p ? 'bg-blue-600 text-white' : 'bg-[#1a1d27] text-gray-400 hover:text-white'
                  }`}
                >
                  {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : p === '90d' ? '90 дней' : 'Год'}
                </button>
              ))}
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : analytics ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <p className="text-xs text-gray-400">Выручка</p>
                    <p className="text-xl font-bold text-white">{formatPrice(analytics.summary.totalRevenue, currency)}</p>
                  </div>
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <p className="text-xs text-gray-400">Заказов</p>
                    <p className="text-xl font-bold text-white">{analytics.summary.deliveredOrders}</p>
                  </div>
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <p className="text-xs text-gray-400">Средний чек</p>
                    <p className="text-xl font-bold text-white">{formatPrice(analytics.summary.averageOrderValue, currency)}</p>
                  </div>
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <p className="text-xs text-gray-400">Конверсия</p>
                    <p className="text-xl font-bold text-green-400">{analytics.summary.conversionRate}%</p>
                  </div>
                </div>

                {/* Revenue Chart */}
                {analytics.dailyRevenue.length > 0 && (
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <h3 className="text-sm font-medium text-white mb-3">Выручка по дням</h3>
                    <div className="h-32 flex items-end gap-1">
                      {analytics.dailyRevenue.slice(-14).map((d, i) => {
                        const maxRev = Math.max(...analytics.dailyRevenue.map(x => x.revenue))
                        const height = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-blue-500 rounded-t"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${d.date}: ${formatPrice(d.revenue, currency)}`}
                            />
                            <span className="text-[8px] text-gray-500">{d.date.slice(-2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Top Products */}
                {analytics.topProducts.length > 0 && (
                  <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <h3 className="text-sm font-medium text-white mb-3">Топ товаров</h3>
                    <div className="space-y-2">
                      {analytics.topProducts.slice(0, 5).map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                            <span className="text-sm text-white truncate max-w-[180px]">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-white">{formatPrice(p.revenue, currency)}</span>
                            <span className="text-xs text-gray-500 ml-2">{p.sales} шт</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">Нет данных</div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{reviewStats.averageRating.toFixed(1)}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={s <= Math.round(reviewStats.averageRating) ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{reviewStats.total} отзывов</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map(rating => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-3">{rating}</span>
                      <div className="flex-1 h-2 bg-[#0f1117] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${reviewStats.total > 0 ? (reviewStats.distribution[rating as keyof typeof reviewStats.distribution] / reviewStats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-6">{reviewStats.distribution[rating as keyof typeof reviewStats.distribution]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Пока нет отзывов</div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{review.userName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-sm ${s <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{review.text}</p>

                    {review.sellerReply ? (
                      <div className="mt-3 pl-3 border-l-2 border-blue-500">
                        <p className="text-xs text-gray-400 mb-1">Ваш ответ:</p>
                        <p className="text-sm text-gray-300">{review.sellerReply}</p>
                      </div>
                    ) : replyingReviewId === review.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Напишите ответ..."
                          className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReplyToReview(review.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                          >
                            Отправить
                          </button>
                          <button
                            onClick={() => { setReplyingReviewId(null); setReplyText('') }}
                            className="px-3 py-1.5 bg-[#2a2d37] text-gray-300 rounded-lg text-xs"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingReviewId(review.id)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Ответить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-white">Кошелёк</h1>
              <button
                onClick={async () => {
                  try {
                    const wallet = await adminApi.getWallet()
                    setWallet(wallet.wallet)
                    await loadWalletTransactions()
                  } catch (e: any) {
                    console.error('Failed to load wallet:', e)
                    alert('Ошибка загрузки кошелька: ' + (e.response?.data?.error || e.message))
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                Обновить
              </button>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 mb-1">Доступно для вывода</p>
                <p className="text-2xl font-bold text-white">{formatPrice(wallet.balance, currency)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-4 border border-yellow-500/20">
                <p className="text-xs text-yellow-400 mb-1">В обработке</p>
                <p className="text-2xl font-bold text-white">{formatPrice(wallet.pendingBalance, currency)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-1">Всего заработано</p>
                <p className="text-2xl font-bold text-white">{formatPrice(wallet.totalEarned || 0, currency)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-1">Всего выведено</p>
                <p className="text-2xl font-bold text-white">{formatPrice(wallet.totalWithdrawn || 0, currency)}</p>
              </div>
            </div>

            {/* Request Withdrawal Button */}
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Вывести средства
            </button>

            {/* Transaction History */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h2 className="text-sm font-medium text-white mb-3">История транзакций</h2>
              {walletTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Нет транзакций</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {walletTransactions.map((tx: any) => (
                    <div key={tx._id || tx.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-lg border border-[#2a2d37]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {tx.type === 'withdrawal_request' && (
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          )}
                          {tx.type === 'withdrawal_completed' && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          )}
                          {tx.type === 'sale' && (
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          )}
                          <div>
                            <p className="text-sm text-white font-medium">{formatPrice(Math.abs(tx.amount), currency)}</p>
                            <p className="text-xs text-gray-400">
                              {tx.type === 'withdrawal_request' && 'Заявка на вывод'}
                              {tx.type === 'withdrawal_completed' && 'Выплата выведена'}
                              {tx.type === 'sale' && 'Продажа'}
                              {tx.type === 'refund' && 'Возврат'}
                              {' • '}
                              {new Date(tx.createdAt || tx.date).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Shop Info */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Профиль магазина</h3>
                <button
                  onClick={() => editingProfile ? handleSaveProfile() : setEditingProfile(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                >
                  {editingProfile ? 'Сохранить' : 'Редактировать'}
                </button>
              </div>

              <div className="space-y-3">
                {/* Avatar Section */}
                {editingProfile && (
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Аватар магазина</label>
                    <div className="flex gap-4 items-start">
                      {/* Current Avatar Display */}
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 bg-[#0f1117] rounded-lg border-2 border-[#2a2d37] flex items-center justify-center overflow-hidden">
                          {previewAvatar || profileForm.avatar ? (
                            <img
                              src={previewAvatar || profileForm.avatar}
                              alt="Avatar preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Upload Input */}
                      <div className="flex-1">
                        <label className="block">
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="w-full px-4 py-2 bg-[#0f1117] hover:bg-[#1a1e2e] border border-[#2a2d37] rounded-lg text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingAvatar ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Загрузка...
                              </span>
                            ) : previewAvatar || profileForm.avatar ? (
                              'Изменить аватар'
                            ) : (
                              'Выбрать аватар'
                            )}
                          </button>
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Допускаются: JPG, PNG, GIF. Максимум 5 МБ
                        </p>
                        {previewAvatar && (
                          <button
                            type="button"
                            onClick={() => setPreviewAvatar(null)}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-300 underline"
                          >
                            Отменить изменение
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Avatar (when not editing) */}
                {!editingProfile && profileForm.avatar && (
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Аватар магазина</label>
                    <div className="w-24 h-24 bg-[#0f1117] rounded-lg border border-[#2a2d37] overflow-hidden">
                      <img
                        src={profileForm.avatar}
                        alt="Shop avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Название магазина</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Описание</label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    disabled={!editingProfile}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white disabled:opacity-50 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Часы работы</label>
                  <input
                    type="text"
                    value={profileForm.workingHours}
                    onChange={(e) => setProfileForm({ ...profileForm, workingHours: e.target.value })}
                    disabled={!editingProfile}
                    placeholder="Например: 9:00-21:00"
                    className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h3 className="text-sm font-medium text-white mb-3">Контакты</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Telegram</label>
                  <input
                    type="text"
                    value={profileForm.contacts.telegram}
                    onChange={(e) => setProfileForm({ ...profileForm, contacts: { ...profileForm.contacts, telegram: e.target.value } })}
                    disabled={!editingProfile}
                    placeholder="@username"
                    className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={profileForm.contacts.email}
                    onChange={(e) => setProfileForm({ ...profileForm, contacts: { ...profileForm.contacts, email: e.target.value } })}
                    disabled={!editingProfile}
                    className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-[#1a1d27] rounded-xl p-4 border border-[#2a2d37]">
              <h3 className="text-sm font-medium text-white mb-3">Уведомления</h3>
              <div className="space-y-3">
                {[
                  { key: 'newOrders', label: 'Новые заказы' },
                  { key: 'orderDelivered', label: 'Доставка заказа' },
                  { key: 'newReviews', label: 'Новые отзывы' },
                  { key: 'lowStock', label: 'Мало товара' },
                  { key: 'disputes', label: 'Споры' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <ToggleSwitch
                      enabled={notifications[item.key as keyof NotificationSettings] as boolean}
                      onChange={(v: boolean) => handleSaveNotifications({ ...notifications, [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Вывод средств</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-400 mb-1">Доступно для вывода</p>
              <p className="text-xl font-bold text-white">{formatPrice(wallet.balance, currency)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Сумма вывода</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Способ вывода</label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white focus:outline-none"
                >
                  <option value="bank_card">Банковская карта</option>
                  <option value="crypto">Криптовалюта</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  {withdrawMethod === 'bank_card' ? 'Номер карты' :
                   withdrawMethod === 'crypto' ? 'Адрес кошелька' : 'Email PayPal'}
                </label>
                <input
                  type="text"
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  placeholder={withdrawMethod === 'bank_card' ? '0000 0000 0000 0000' :
                               withdrawMethod === 'crypto' ? 'wallet address...' : 'email@example.com'}
                  className="w-full px-3 py-2.5 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount || !withdrawDetails}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {withdrawing ? 'Обработка...' : 'Отправить заявку'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Заявки обрабатываются в течение 24 часов
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

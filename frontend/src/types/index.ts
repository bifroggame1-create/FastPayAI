export interface ProductVariant {
  id: string
  name: string
  price: number
  description?: string
  period?: string // например "1 месяц", "3 месяца"
  features?: string[] // дополнительные особенности
}

export interface Product {
  _id: string
  name: string
  price: number
  oldPrice?: number // старая цена для скидок
  images: string[]
  condition: 'new' | 'used'
  category: string
  seller: Seller
  rating: number
  reviewsCount?: number
  salesCount?: number // количество продаж
  createdAt: string
  description?: string
  inStock: boolean
  isEnabled?: boolean // если false - товар скрыт с главной
  variants?: ProductVariant[] // варианты услуги
  badges?: ('sale' | 'hit' | 'new')[] // бейджи товара
  tags?: string[] // теги товара (массив ID тегов)
  deliveryType?: 'auto' | 'manual' // тип доставки
}

// Tag for product categorization
export interface Tag {
  _id?: string
  id: string
  name: string
  color?: string // hex color for display
  createdAt: string
  productCount?: number // computed field
}

export interface Seller {
  id: string
  name: string
  avatar?: string
  rating: number
}

// Extended seller profile from marketplace API
export type SellerBadge = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky' | 'vip' | 'busy' | 'offline' | 'on_hold'

export interface SellerProfile {
  id: string
  name: string
  avatar?: string
  rating: number  // 0-100 score
  ratingCount: number
  badges: SellerBadge[]
  stats: {
    totalOrders: number
    successfulOrders: number
  }
  memberSince: string
  isVerified: boolean
}

export interface User {
  id: string
  username?: string
  name: string
  avatar?: string
  joinedAt: string
  stats: UserStats
  referralCode?: string
  referredBy?: string
  referralCount?: number
  bonusBalance?: number // бонусный баланс в рублях
  isAdmin?: boolean // флаг админа
}

export interface UserStats {
  rating: number
  reviewsCount: number
  ordersCount: number
  returnsCount: number
}

export interface Category {
  id: string
  name: string
  icon?: string
}

export interface Order {
  _id: string
  oderId?: string
  userId: string
  products: OrderProduct[]
  totalPrice: number
  discountAmount?: number
  promoCode?: string
  usedBonuses?: number
  status: 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
  paymentMethod?: 'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'
  deliveryData?: string
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

export interface OrderProduct {
  productId: string
  productName?: string
  productImage?: string
  variantId?: string
  variantName?: string
  quantity: number
  price: number
}

export interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
}

export type FilterType = 'all' | 'new' | 'used'

export interface Review {
  _id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  text: string
  orderId?: string
  createdAt: string
  isVerifiedPurchase?: boolean
}

export type SortType = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest'

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock?: boolean
  search?: string
  sort?: SortType
  tags?: string[] // filter by tag IDs
}

// API Request Types
export interface ProductQueryParams {
  category?: string
  tag?: string
  search?: string
  sort?: SortType
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
}

export interface CreateProductInput {
  name: string
  price: number
  oldPrice?: number
  images: string[]
  condition: 'new' | 'used'
  category: string
  description?: string
  inStock?: boolean
  isEnabled?: boolean
  variants?: ProductVariant[]
  badges?: ('sale' | 'hit' | 'new')[]
  tags?: string[]
  deliveryType?: 'auto' | 'manual'
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  _id?: string
}

export interface CreateSellerInput {
  id: string
  name: string
  avatar?: string
  rating?: number
}

export interface UpdateSellerInput extends Partial<CreateSellerInput> {}

export interface UpdateUserInput {
  name?: string
  avatar?: string
  bonusBalance?: number
  isAdmin?: boolean
  // Admin panel fields
  username?: string
  firstName?: string
  lastName?: string
  isBlocked?: boolean
  blockReason?: string
  isPremium?: boolean
}

export interface CreatePromoInput {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  expiresAt?: string
  isActive?: boolean
  sellerId?: string // For seller-specific promo codes
  description?: string
}

export interface UpdatePromoInput extends Partial<CreatePromoInput> {}

export interface BrandingSettings {
  shopName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  welcomeMessage?: string
}

// Telegram WebApp Types
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    query_id?: string
    auth_date?: number
    hash?: string
    start_param?: string
  }
  version?: string
  platform?: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
  }
  isExpanded?: boolean
  viewportHeight?: number
  viewportStableHeight?: number
  headerColor?: string
  backgroundColor?: string
  ready: () => void
  expand: () => void
  close: () => void
  openLink?: (url: string) => void
  openTelegramLink?: (url: string) => void
  showPopup?: (params: { title?: string; message: string; buttons?: Array<{ type: string; text?: string }> }) => void
  showAlert?: (message: string) => void
  showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void
  openInvoice?: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible?: boolean
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress?: (leaveActive?: boolean) => void
    hideProgress?: () => void
  }
  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

// Error with message
export interface ApiError {
  message: string
  code?: string
  status?: number
}

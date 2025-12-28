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
  variants?: ProductVariant[] // варианты услуги
  badges?: ('sale' | 'hit' | 'new')[] // бейджи товара
}

export interface Seller {
  id: string
  name: string
  avatar?: string
  rating: number
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
}

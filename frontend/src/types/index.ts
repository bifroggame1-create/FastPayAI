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
  images: string[]
  condition: 'new' | 'used'
  category: string
  seller: Seller
  rating: number
  createdAt: string
  description?: string
  inStock: boolean
  variants?: ProductVariant[] // варианты услуги
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
  userId: string
  products: OrderProduct[]
  totalPrice: number
  discountAmount?: number
  promoCode?: string
  usedBonuses?: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
}

export interface OrderProduct {
  productId: string
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

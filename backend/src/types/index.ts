export interface Product {
  _id?: string
  name: string
  price: number
  images: string[]
  condition: 'new' | 'used'
  category: string
  seller: Seller
  rating: number
  createdAt: Date
  description?: string
  inStock: boolean
}

export interface Seller {
  id: string
  name: string
  avatar?: string
  rating: number
}

export interface User {
  _id?: string
  id: string
  name: string
  avatar?: string
  joinedAt: Date
  stats: UserStats
}

export interface UserStats {
  rating: number
  reviewsCount: number
  ordersCount: number
  returnsCount: number
}

export interface Order {
  _id?: string
  userId: string
  products: OrderProduct[]
  totalPrice: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: Date
}

export interface OrderProduct {
  productId: string
  quantity: number
  price: number
}

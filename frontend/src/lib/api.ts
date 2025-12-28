import axios from 'axios'
import { Product, User, Order, Review, ProductFilters } from '@/types'
import { getToken } from './auth'

// Use backend URL from environment variable, fallback to production Render URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai.onrender.com'

// Log the API URL for debugging
console.log('[FastPay] API URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const productsApi = {
  getAll: async (params?: ProductFilters & { category?: string; condition?: string; search?: string }) => {
    const { data } = await api.get<Product[]>('/products', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Product>(`/products/${id}`)
    return data
  },

  getFavorites: async (userId: string, favoriteIds: string[]) => {
    const { data } = await api.post<Product[]>('/products/favorites', { favoriteIds })
    return data
  },
}

export const reviewsApi = {
  getByProduct: async (productId: string) => {
    const { data } = await api.get<Review[]>(`/reviews/product/${productId}`)
    return data
  },

  create: async (review: { productId: string; userId: string; userName: string; userAvatar?: string; rating: number; text: string; orderId?: string }) => {
    const { data } = await api.post<Review>('/reviews', review)
    return data
  },

  getByUser: async (userId: string) => {
    const { data } = await api.get<Review[]>(`/reviews/user/${userId}`)
    return data
  },

  canReview: async (userId: string, productId: string) => {
    const { data } = await api.get<{ canReview: boolean; orderId?: string }>(`/reviews/can-review/${userId}/${productId}`)
    return data
  },

  getStats: async (productId: string) => {
    const { data } = await api.get<{ count: number; average: number; distribution: Record<number, number> }>(`/reviews/product/${productId}/stats`)
    return data
  },
}

export const userApi = {
  getById: async (id: string) => {
    const { data } = await api.get<User>(`/users/${id}`)
    return data
  },

  create: async (userData: Partial<User>) => {
    const { data } = await api.post<User>('/users', userData)
    return data
  },
}

export const ordersApi = {
  getByUserId: async (userId: string) => {
    const { data } = await api.get<Order[]>(`/orders/user/${userId}`)
    return data
  },

  create: async (orderData: Partial<Order>) => {
    const { data } = await api.post<Order>('/orders', orderData)
    return data
  },
}

export const promoApi = {
  validate: async (code: string, orderAmount: number) => {
    const { data } = await api.post('/promo/validate', { code, orderAmount })
    return data
  },

  getActive: async () => {
    const { data } = await api.get('/promo/active')
    return data
  },
}

export const paymentApi = {
  // CryptoBot payments
  createInvoice: async (params: {
    amount: number
    description?: string
    productId: string
    variantId?: string
    asset?: string
  }) => {
    const { data } = await api.post('/payment/create-invoice', params)
    return data
  },

  getInvoice: async (invoiceId: number) => {
    const { data } = await api.get(`/payment/invoice/${invoiceId}`)
    return data
  },

  getBalance: async () => {
    const { data } = await api.get('/payment/balance')
    return data
  },

  // CactusPay payments
  createCactusPayment: async (params: {
    amount: number
    description?: string
    productId: string
    variantId?: string
    method?: 'card' | 'sbp' | 'yoomoney' | 'crypto' | 'nspk'
    userIp?: string
  }) => {
    const { data } = await api.post('/payment/cactuspay/create', params)
    return data
  },

  getCactusPaymentStatus: async (orderId: string) => {
    const { data } = await api.get(`/payment/cactuspay/status/${orderId}`)
    return data
  },

  cancelCactusPayment: async (orderId: string) => {
    const { data } = await api.post('/payment/cactuspay/cancel', { orderId })
    return data
  },
}

export const adminApi = {
  // Products
  createProduct: async (product: any) => {
    const { data } = await api.post('/admin/products', product)
    return data
  },

  updateProduct: async (id: string, updates: any) => {
    const { data } = await api.put(`/admin/products/${id}`, updates)
    return data
  },

  deleteProduct: async (id: string) => {
    const { data } = await api.delete(`/admin/products/${id}`)
    return data
  },

  // Sellers
  getSellers: async () => {
    const { data } = await api.get('/admin/sellers')
    return data
  },

  createSeller: async (seller: any) => {
    const { data } = await api.post('/admin/sellers', seller)
    return data
  },

  updateSeller: async (id: string, updates: any) => {
    const { data } = await api.put(`/admin/sellers/${id}`, updates)
    return data
  },

  deleteSeller: async (id: string) => {
    const { data } = await api.delete(`/admin/sellers/${id}`)
    return data
  },

  // Admins
  getAdmins: async () => {
    const { data } = await api.get('/admin/admins')
    return data
  },

  addAdmin: async (admin: { userId?: string; username?: string; name?: string }) => {
    const { data } = await api.post('/admin/admins', admin)
    return data
  },

  removeAdmin: async (id: string) => {
    const { data } = await api.delete(`/admin/admins/${id}`)
    return data
  },

  // Promo
  getPromoCodes: async () => {
    const { data } = await api.get('/admin/promo')
    return data
  },

  createPromoCode: async (promo: any) => {
    const { data } = await api.post('/admin/promo', promo)
    return data
  },

  updatePromoCode: async (code: string, updates: any) => {
    const { data } = await api.put(`/admin/promo/${code}`, updates)
    return data
  },

  deletePromoCode: async (code: string) => {
    const { data } = await api.delete(`/admin/promo/${code}`)
    return data
  },

  // Orders
  getOrders: async (params?: { status?: string; userId?: string; limit?: number; offset?: number }) => {
    const { data } = await api.get('/admin/orders', { params })
    return data
  },

  getOrder: async (id: string) => {
    const { data } = await api.get(`/admin/orders/${id}`)
    return data
  },

  updateOrderStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/admin/orders/${id}/status`, { status })
    return data
  },

  deliverOrder: async (id: string, deliveryData: string, deliveryNote?: string) => {
    const { data } = await api.post(`/admin/orders/${id}/deliver`, { deliveryData, deliveryNote })
    return data
  },

  cancelOrder: async (id: string) => {
    const { data } = await api.post(`/admin/orders/${id}/cancel`)
    return data
  },

  refundOrder: async (id: string) => {
    const { data } = await api.post(`/admin/orders/${id}/refund`)
    return data
  },

  getOrdersStats: async () => {
    const { data } = await api.get('/admin/orders/stats')
    return data
  },

  // Delivery management
  getProductDelivery: async (productId: string) => {
    const { data } = await api.get(`/admin/products/${productId}/delivery`)
    return data
  },

  updateProductDelivery: async (productId: string, settings: {
    deliveryType?: 'manual' | 'auto'
    deliveryInstructions?: string
  }) => {
    const { data } = await api.put(`/admin/products/${productId}/delivery`, settings)
    return data
  },

  addDeliveryKeys: async (productId: string, keys: string[], variantId?: string) => {
    const { data } = await api.post(`/admin/products/${productId}/delivery/keys`, { keys, variantId })
    return data
  },

  removeDeliveryKey: async (productId: string, keyId: string) => {
    const { data } = await api.delete(`/admin/products/${productId}/delivery/keys/${keyId}`)
    return data
  },
}

export const chatApi = {
  createChat: async (params: {
    buyerId: string
    sellerId: string
    productId: string
    productName: string
  }) => {
    const { data } = await api.post('/chats/create', params)
    return data
  },

  getChat: async (chatId: string) => {
    const { data } = await api.get(`/chats/${chatId}`)
    return data
  },

  getUserChats: async (userId: string) => {
    const { data } = await api.get(`/chats/user/${userId}`)
    return data
  },

  getMessages: async (chatId: string, limit = 50, offset = 0) => {
    const { data } = await api.get(`/chats/${chatId}/messages`, { params: { limit, offset } })
    return data
  },

  sendMessage: async (chatId: string, params: {
    senderId: string
    senderName?: string
    content: string
    messageType?: 'text' | 'image' | 'file'
    fileUrl?: string
    fileName?: string
    fileSize?: number
  }) => {
    const { data } = await api.post(`/chats/${chatId}/messages`, params)
    return data
  },

  uploadFile: async (chatId: string, params: {
    file: string // base64
    fileName: string
    fileType: string
    senderId: string
    senderName?: string
  }) => {
    const { data } = await api.post(`/chats/${chatId}/upload`, params)
    return data
  },
}

export const referralApi = {
  // Track referral when user joins via referral link
  trackReferral: async (params: { userId: string; referrerId: string }) => {
    const { data } = await api.post('/referral/track', params)
    return data
  },

  // Get referral stats for user
  getStats: async (userId: string) => {
    const { data } = await api.get(`/referral/stats/${userId}`)
    return data
  },

  // Get list of referred users
  getReferrals: async (userId: string) => {
    const { data } = await api.get(`/referral/list/${userId}`)
    return data
  },

  // Use bonus balance for checkout
  useBonus: async (userId: string, amount: number) => {
    const { data } = await api.post('/referral/use-bonus', { userId, amount })
    return data
  },
}

export default api

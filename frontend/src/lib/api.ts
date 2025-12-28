import axios from 'axios'
import { Product, User, Order } from '@/types'

// Use backend URL from environment variable, fallback to production Render URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai-back.onrender.com'

// Log the API URL for debugging
console.log('[FastPay] API URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

export const productsApi = {
  getAll: async (params?: { category?: string; condition?: string; search?: string }) => {
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
}

export default api

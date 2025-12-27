import axios from 'axios'
import { Product, User, Order } from '@/types'

// Use backend URL from environment variable, fallback to production Render URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai.onrender.com'

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

  // Promo
  getPromoCodes: async () => {
    const { data } = await api.get('/admin/promo')
    return data
  },

  createPromoCode: async (promo: any) => {
    const { data } = await api.post('/admin/promo', promo)
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

import axios from 'axios'
import { Product, User, Order } from '@/types'

// Use relative URL to go through Next.js proxy (configured in next.config.js)
// This ensures API calls work both locally and through ngrok/production
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api

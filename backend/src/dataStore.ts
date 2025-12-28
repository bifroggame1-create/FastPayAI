import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(__dirname, '..', 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const PROMO_CODES_FILE = path.join(DATA_DIR, 'promoCodes.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

// Order status types
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

// Order interface
export interface Order {
  id: string
  oderId: string // external order ID (from payment system)
  userId: string
  userName?: string
  userUsername?: string
  productId: string
  productName: string
  variantId?: string
  variantName?: string
  amount: number
  paymentMethod: 'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'
  paymentId?: string // payment system ID
  status: OrderStatus
  deliveryData?: string // delivered product data (key, link, etc.)
  deliveryNote?: string // admin note about delivery
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Helper functions
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
  return defaultValue
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
  }
}

// Products
export function loadProducts(): any[] {
  return readJsonFile(PRODUCTS_FILE, [])
}

export function saveProducts(products: any[]): void {
  writeJsonFile(PRODUCTS_FILE, products)
}

// Promo codes
export function loadPromoCodes(): any[] {
  return readJsonFile(PROMO_CODES_FILE, [])
}

export function savePromoCodes(promoCodes: any[]): void {
  writeJsonFile(PROMO_CODES_FILE, promoCodes)
}

// Orders
export function loadOrders(): Order[] {
  return readJsonFile<Order[]>(ORDERS_FILE, [])
}

export function saveOrders(orders: Order[]): void {
  writeJsonFile(ORDERS_FILE, orders)
}

export function addOrder(order: Order): void {
  const orders = loadOrders()
  orders.unshift(order) // Add to beginning (newest first)
  saveOrders(orders)
}

export function updateOrder(orderId: string, updates: Partial<Order>): Order | null {
  const orders = loadOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index === -1) return null

  orders[index] = { ...orders[index], ...updates }
  saveOrders(orders)
  return orders[index]
}

export function getOrderById(orderId: string): Order | null {
  const orders = loadOrders()
  return orders.find(o => o.id === orderId) || null
}

export function getOrdersByUserId(userId: string): Order[] {
  const orders = loadOrders()
  return orders.filter(o => o.userId === userId)
}

export function getOrdersByStatus(status: OrderStatus): Order[] {
  const orders = loadOrders()
  return orders.filter(o => o.status === status)
}

// Users (persistent)
export function loadUsers(): any[] {
  return readJsonFile(USERS_FILE, [])
}

export function saveUsers(users: any[]): void {
  writeJsonFile(USERS_FILE, users)
}

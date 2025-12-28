import { MongoClient, Db, Collection, ObjectId } from 'mongodb'

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB_NAME || 'techshop'

let client: MongoClient | null = null
let db: Db | null = null

// Collection interfaces
export interface Product {
  _id?: string | ObjectId
  name: string
  price: number
  oldPrice?: number
  images: string[]
  condition: 'new' | 'used'
  category: string
  description?: string
  inStock: boolean
  rating?: number
  createdAt?: string
  variants?: ProductVariant[]
  seller: {
    id: string
    name: string
    avatar?: string
    rating?: number
  }
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  period?: string
  description?: string
  features?: string[]
}

export interface PromoCode {
  _id?: string | ObjectId
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
  description?: string
  createdAt: string
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

export interface Order {
  _id?: string | ObjectId
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
  paymentId?: string
  status: OrderStatus
  deliveryData?: string
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

export interface User {
  _id?: string | ObjectId
  id: string
  name?: string
  username?: string
  avatar?: string
  referredBy?: string
  createdAt: string
  lastSeen?: string
}

export interface Seller {
  _id?: string | ObjectId
  id: string
  name: string
  avatar?: string
  rating?: number
  createdAt: string
}

export interface Chat {
  _id?: string | ObjectId
  id: string
  participants: string[]
  productId?: string
  productName?: string
  createdAt: string
  lastMessageAt?: string
}

export interface ChatMessage {
  _id?: string | ObjectId
  id?: string
  chatId: string
  senderId: string
  senderName?: string
  content: string
  messageType?: 'text' | 'image' | 'file'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isRead?: boolean
  createdAt: string
}

export interface Admin {
  _id?: string | ObjectId
  id: string
  userId?: string
  username?: string
  name?: string
  addedAt: string
  addedBy?: string
}

// Connect to MongoDB
export async function connectDB(): Promise<Db> {
  if (db) return db

  try {
    console.log('🔌 Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)

    // Create indexes
    await createIndexes(db)

    console.log('✅ Connected to MongoDB:', DB_NAME)
    return db
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

// Create indexes for better performance
async function createIndexes(database: Db): Promise<void> {
  try {
    // Products
    await database.collection('products').createIndex({ category: 1 })
    await database.collection('products').createIndex({ 'seller.id': 1 })
    await database.collection('products').createIndex({ name: 'text', description: 'text' })

    // Orders
    await database.collection('orders').createIndex({ oderId: 1 }, { unique: true })
    await database.collection('orders').createIndex({ userId: 1 })
    await database.collection('orders').createIndex({ status: 1 })
    await database.collection('orders').createIndex({ createdAt: -1 })

    // Users
    await database.collection('users').createIndex({ id: 1 }, { unique: true })

    // Promo codes
    await database.collection('promoCodes').createIndex({ code: 1 }, { unique: true })

    // Chats
    await database.collection('chats').createIndex({ participants: 1 })
    await database.collection('chatMessages').createIndex({ chatId: 1, createdAt: 1 })

    // Admins
    await database.collection('admins').createIndex({ userId: 1 }, { sparse: true })
    await database.collection('admins').createIndex({ username: 1 }, { sparse: true })

    // Sellers
    await database.collection('sellers').createIndex({ id: 1 }, { unique: true })

    console.log('✅ Database indexes created')
  } catch (error) {
    console.error('⚠️ Error creating indexes:', error)
  }
}

// Get database instance
export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.')
  }
  return db
}

// Get collections
export function getProductsCollection(): Collection<Product> {
  return getDB().collection<Product>('products')
}

export function getOrdersCollection(): Collection<Order> {
  return getDB().collection<Order>('orders')
}

export function getUsersCollection(): Collection<User> {
  return getDB().collection<User>('users')
}

export function getPromoCodesCollection(): Collection<PromoCode> {
  return getDB().collection<PromoCode>('promoCodes')
}

export function getSellersCollection(): Collection<Seller> {
  return getDB().collection<Seller>('sellers')
}

export function getChatsCollection(): Collection<Chat> {
  return getDB().collection<Chat>('chats')
}

export function getChatMessagesCollection(): Collection<ChatMessage> {
  return getDB().collection<ChatMessage>('chatMessages')
}

export function getAdminsCollection(): Collection<Admin> {
  return getDB().collection<Admin>('admins')
}

// Close connection
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('🔌 MongoDB connection closed')
  }
}

// Helper to convert ObjectId to string in documents
export function toClientDoc<T extends { _id?: string | ObjectId }>(doc: T): T {
  if (doc._id) {
    return { ...doc, _id: doc._id.toString() }
  }
  return doc
}

console.log('📦 Database module loaded')

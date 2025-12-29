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
  // Auto-delivery settings
  deliveryType?: DeliveryType  // 'manual' | 'auto'
  deliveryKeys?: DeliveryKey[] // Pool of keys/codes for auto-delivery
  deliveryInstructions?: string // Instructions to show after delivery
  // Tags/labels for product categorization
  tags?: string[] // Array of tag IDs
}

// Tag for product categorization and filtering
export interface Tag {
  _id?: string | ObjectId
  id: string
  name: string
  color?: string  // Optional hex color for display (e.g., "#FF5733")
  createdAt: string
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  period?: string
  description?: string
  features?: string[]
}

// Digital delivery key/code
export interface DeliveryKey {
  id: string
  key: string           // The actual key/code/link to deliver
  variantId?: string    // Optional: specific to a variant
  isUsed: boolean
  usedByOrderId?: string
  usedAt?: string
  addedAt: string
}

export type DeliveryType = 'manual' | 'auto'

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
  promoCode?: string // promo code used for this order
  deliveryData?: string | { iv: string; content: string; tag: string } // plaintext or AES-256-GCM encrypted
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
  referralCode?: string    // Unique referral code (generated from id)
  referralCount?: number   // Number of users referred
  bonusBalance?: number    // Bonus balance from referrals
  createdAt: string
  lastSeen?: string
}

// Referral tracking
export interface Referral {
  _id?: string | ObjectId
  userId: string           // The referred user
  referrerId: string       // Who referred them
  bonusAwarded: number     // Bonus given for this referral
  createdAt: string
}

export function getReferralsCollection(): Collection<Referral> {
  return getDB().collection<Referral>('referrals')
}

// Product reviews
export interface Review {
  _id?: string | ObjectId
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  orderId?: string          // Order that allowed this review
  rating: number            // 1-5
  text: string
  createdAt: string
}

export function getReviewsCollection(): Collection<Review> {
  return getDB().collection<Review>('reviews')
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

// Uploaded files (images, etc.)
export interface UploadedFile {
  _id?: string | ObjectId
  id: string
  name: string
  type: string
  size: number
  data: string  // base64 data
  uploadedAt: string
  uploadedBy?: string
}

// Audit log for tracking admin actions
export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'status_change' | 'deliver' | 'cancel' | 'refund'
  | 'add_keys' | 'remove_key' | 'restore'

export type AuditEntityType =
  | 'product' | 'order' | 'user' | 'seller'
  | 'admin' | 'promo_code' | 'review' | 'file' | 'backup'

export interface AuditLog {
  _id?: string | ObjectId
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  adminId: string
  adminName?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>  // Additional context like key count, etc.
  ipAddress?: string
  userAgent?: string
  timestamp: string
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

    // Referrals
    await database.collection('referrals').createIndex({ userId: 1 }, { unique: true })
    await database.collection('referrals').createIndex({ referrerId: 1 })

    // Reviews
    await database.collection('reviews').createIndex({ productId: 1 })
    await database.collection('reviews').createIndex({ userId: 1 })
    await database.collection('reviews').createIndex({ orderId: 1 })

    // Audit logs
    await database.collection('auditLogs').createIndex({ timestamp: -1 })
    await database.collection('auditLogs').createIndex({ entityType: 1, entityId: 1 })
    await database.collection('auditLogs').createIndex({ adminId: 1 })
    await database.collection('auditLogs').createIndex({ action: 1 })

    // Tags
    await database.collection('tags').createIndex({ id: 1 }, { unique: true })
    await database.collection('tags').createIndex({ name: 1 })

    // Products tags index
    await database.collection('products').createIndex({ tags: 1 })

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

export function getFilesCollection(): Collection<UploadedFile> {
  return getDB().collection<UploadedFile>('files')
}

export function getAuditLogsCollection(): Collection<AuditLog> {
  return getDB().collection<AuditLog>('auditLogs')
}

export function getTagsCollection(): Collection<Tag> {
  return getDB().collection<Tag>('tags')
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

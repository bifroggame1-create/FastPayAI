import {
  getProductsCollection,
  getOrdersCollection,
  getUsersCollection,
  getPromoCodesCollection,
  getSellersCollection,
  getChatsCollection,
  getChatMessagesCollection,
  getAdminsCollection,
  getAuditLogsCollection,
  getTagsCollection,
  toClientDoc,
  Product,
  Order,
  OrderStatus,
  User,
  PromoCode,
  Seller,
  Chat,
  ChatMessage,
  Admin,
  AuditLog,
  AuditAction,
  AuditEntityType,
  Tag
} from './database'
import { ObjectId } from 'mongodb'
import { redis, CACHE_KEYS, CACHE_TTL } from './redis'

// Re-export types
export { Order, OrderStatus, Product, User, PromoCode, Seller, Chat, ChatMessage, Admin, AuditLog, AuditAction, AuditEntityType, Tag }

// ============================================
// Products
// ============================================

export async function loadProducts(): Promise<Product[]> {
  return redis.getOrSet(
    CACHE_KEYS.PRODUCTS,
    async () => {
      const products = await getProductsCollection().find({}).toArray()
      return products.map(p => toClientDoc(p))
    },
    CACHE_TTL.PRODUCTS
  )
}

export async function saveProducts(products: Product[]): Promise<void> {
  const collection = getProductsCollection()
  // Clear and insert all (for bulk updates)
  await collection.deleteMany({})
  if (products.length > 0) {
    await collection.insertMany(products)
  }
  // Invalidate cache
  await redis.invalidateProducts()
}

export async function getProductById(productId: string): Promise<Product | null> {
  return redis.getOrSet(
    CACHE_KEYS.PRODUCT(productId),
    async () => {
      const collection = getProductsCollection()
      let product: Product | null = null

      // Try as ObjectId first
      if (ObjectId.isValid(productId)) {
        product = await collection.findOne({ _id: new ObjectId(productId) as any })
      }

      // Try as string _id
      if (!product) {
        product = await collection.findOne({ _id: productId as any })
      }

      return product ? toClientDoc(product) : null
    },
    CACHE_TTL.PRODUCT
  )
}

export async function addProduct(product: Product): Promise<Product> {
  const collection = getProductsCollection()
  const result = await collection.insertOne(product as any)
  // Invalidate cache
  await redis.invalidateProducts()
  return { ...product, _id: result.insertedId.toString() }
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product | null> {
  const collection = getProductsCollection()
  let filter: any = {}

  if (ObjectId.isValid(productId)) {
    filter._id = new ObjectId(productId)
  } else {
    filter._id = productId
  }

  const result = await collection.findOneAndUpdate(
    filter,
    { $set: updates },
    { returnDocument: 'after' }
  )

  // Invalidate cache
  await redis.invalidateProducts()

  return result ? toClientDoc(result) : null
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const collection = getProductsCollection()
  let result

  if (ObjectId.isValid(productId)) {
    result = await collection.deleteOne({ _id: new ObjectId(productId) as any })
  } else {
    result = await collection.deleteOne({ _id: productId as any })
  }

  // Invalidate cache
  await redis.invalidateProducts()

  return result.deletedCount > 0
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const products = await getProductsCollection().find({ category }).toArray()
  return products.map(p => toClientDoc(p))
}

export async function getProductsBySeller(sellerId: string): Promise<Product[]> {
  const products = await getProductsCollection().find({ 'seller.id': sellerId }).toArray()
  return products.map(p => toClientDoc(p))
}

// ============================================
// Promo Codes
// ============================================

export async function loadPromoCodes(): Promise<PromoCode[]> {
  return redis.getOrSet(
    CACHE_KEYS.PROMO_CODES,
    async () => {
      const codes = await getPromoCodesCollection().find({}).toArray()
      return codes.map(c => toClientDoc(c))
    },
    CACHE_TTL.PROMO_CODES
  )
}

export async function savePromoCodes(promoCodes: PromoCode[]): Promise<void> {
  const collection = getPromoCodesCollection()
  await collection.deleteMany({})
  if (promoCodes.length > 0) {
    await collection.insertMany(promoCodes)
  }
  // Invalidate cache
  await redis.invalidatePromoCodes()
}

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  return redis.getOrSet(
    CACHE_KEYS.PROMO_CODE(code.toUpperCase()),
    async () => {
      const promo = await getPromoCodesCollection().findOne({ code: code.toUpperCase() })
      return promo ? toClientDoc(promo) : null
    },
    CACHE_TTL.PROMO_CODES
  )
}

export async function addPromoCode(promo: PromoCode): Promise<PromoCode> {
  const collection = getPromoCodesCollection()
  const result = await collection.insertOne(promo as any)
  // Invalidate cache
  await redis.invalidatePromoCodes()
  return { ...promo, _id: result.insertedId.toString() }
}

export async function updatePromoCode(code: string, updates: Partial<PromoCode>): Promise<PromoCode | null> {
  const result = await getPromoCodesCollection().findOneAndUpdate(
    { code: code.toUpperCase() },
    { $set: updates },
    { returnDocument: 'after' }
  )
  // Invalidate cache
  await redis.invalidatePromoCodes()
  return result ? toClientDoc(result) : null
}

export async function incrementPromoUsage(code: string): Promise<void> {
  await getPromoCodesCollection().updateOne(
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 } }
  )
  // Invalidate cache for this specific promo code
  await redis.del(CACHE_KEYS.PROMO_CODE(code.toUpperCase()))
}

export async function deletePromoCode(code: string): Promise<boolean> {
  const result = await getPromoCodesCollection().deleteOne({ code: code.toUpperCase() })
  // Invalidate cache
  await redis.invalidatePromoCodes()
  return result.deletedCount > 0
}

// ============================================
// Orders
// ============================================

export async function loadOrders(): Promise<Order[]> {
  const orders = await getOrdersCollection()
    .find({})
    .sort({ createdAt: -1 })
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function saveOrders(orders: Order[]): Promise<void> {
  const collection = getOrdersCollection()
  await collection.deleteMany({})
  if (orders.length > 0) {
    await collection.insertMany(orders)
  }
}

export async function addOrder(order: Order): Promise<Order> {
  const collection = getOrdersCollection()
  const result = await collection.insertOne(order as any)
  return { ...order, _id: result.insertedId.toString() }
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
  const result = await getOrdersCollection().findOneAndUpdate(
    { id: orderId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const order = await getOrdersCollection().findOne({ id: orderId })
  return order ? toClientDoc(order) : null
}

export async function getOrderByExternalId(oderId: string): Promise<Order | null> {
  const order = await getOrdersCollection().findOne({ oderId })
  return order ? toClientDoc(order) : null
}

export async function getOrdersByUserId(userId: string, limit = 50, offset = 0): Promise<Order[]> {
  const orders = await getOrdersCollection()
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function getOrdersByStatus(status: OrderStatus, limit = 50, offset = 0): Promise<Order[]> {
  const orders = await getOrdersCollection()
    .find({ status })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function getOrdersWithFilters(
  filters: { status?: OrderStatus; userId?: string },
  limit = 50,
  offset = 0
): Promise<Order[]> {
  const query: any = {}
  if (filters.status) query.status = filters.status
  if (filters.userId) query.userId = filters.userId

  const orders = await getOrdersCollection()
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function countOrders(filters?: { status?: OrderStatus; userId?: string }): Promise<number> {
  const query: any = {}
  if (filters?.status) query.status = filters.status
  if (filters?.userId) query.userId = filters.userId
  return getOrdersCollection().countDocuments(query)
}

// ============================================
// Users
// ============================================

export async function loadUsers(): Promise<User[]> {
  const users = await getUsersCollection().find({}).toArray()
  return users.map(u => toClientDoc(u))
}

export async function saveUsers(users: User[]): Promise<void> {
  const collection = getUsersCollection()
  await collection.deleteMany({})
  if (users.length > 0) {
    await collection.insertMany(users)
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = await getUsersCollection().findOne({ id: userId })
  return user ? toClientDoc(user) : null
}

export async function addUser(user: User): Promise<User> {
  const collection = getUsersCollection()
  const result = await collection.insertOne(user as any)
  return { ...user, _id: result.insertedId.toString() }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const result = await getUsersCollection().findOneAndUpdate(
    { id: userId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function upsertUser(user: User): Promise<User> {
  const result = await getUsersCollection().findOneAndUpdate(
    { id: user.id },
    {
      $set: { ...user, lastSeen: new Date().toISOString() },
      $setOnInsert: { createdAt: user.createdAt || new Date().toISOString() }
    },
    { upsert: true, returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : user
}

export async function countUsers(): Promise<number> {
  return getUsersCollection().countDocuments()
}

// ============================================
// Sellers
// ============================================

export async function loadSellers(): Promise<Seller[]> {
  const sellers = await getSellersCollection().find({}).toArray()
  return sellers.map(s => toClientDoc(s))
}

export async function getSellerById(sellerId: string): Promise<Seller | null> {
  const seller = await getSellersCollection().findOne({ id: sellerId })
  return seller ? toClientDoc(seller) : null
}

export async function addSeller(seller: Seller): Promise<Seller> {
  const collection = getSellersCollection()
  const result = await collection.insertOne(seller as any)
  return { ...seller, _id: result.insertedId.toString() }
}

export async function updateSeller(sellerId: string, updates: Partial<Seller>): Promise<Seller | null> {
  const result = await getSellersCollection().findOneAndUpdate(
    { id: sellerId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

// ============================================
// Chats
// ============================================

export async function loadChats(): Promise<Chat[]> {
  const chats = await getChatsCollection()
    .find({})
    .sort({ lastMessageAt: -1 })
    .toArray()
  return chats.map(c => toClientDoc(c))
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  const chat = await getChatsCollection().findOne({ id: chatId })
  return chat ? toClientDoc(chat) : null
}

export async function getChatsByUserId(userId: string): Promise<Chat[]> {
  const chats = await getChatsCollection()
    .find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .toArray()
  return chats.map(c => toClientDoc(c))
}

export async function addChat(chat: Chat): Promise<Chat> {
  const collection = getChatsCollection()
  const result = await collection.insertOne(chat as any)
  return { ...chat, _id: result.insertedId.toString() }
}

export async function updateChatLastMessage(chatId: string): Promise<void> {
  await getChatsCollection().updateOne(
    { id: chatId },
    { $set: { lastMessageAt: new Date().toISOString() } }
  )
}

// ============================================
// Chat Messages
// ============================================

export async function getChatMessages(chatId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
  const messages = await getChatMessagesCollection()
    .find({ chatId })
    .sort({ createdAt: 1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return messages.map(m => toClientDoc(m))
}

export async function addChatMessage(message: ChatMessage): Promise<ChatMessage> {
  const collection = getChatMessagesCollection()
  const result = await collection.insertOne(message as any)
  // Update chat last message time
  await updateChatLastMessage(message.chatId)
  return { ...message, _id: result.insertedId.toString() }
}

// ============================================
// Statistics
// ============================================

export async function getOrderStats(): Promise<{
  total: number
  pending: number
  paid: number
  delivered: number
  cancelled: number
  totalRevenue: number
}> {
  const [total, pending, paid, delivered, cancelled] = await Promise.all([
    getOrdersCollection().countDocuments(),
    getOrdersCollection().countDocuments({ status: 'pending' }),
    getOrdersCollection().countDocuments({ status: 'paid' }),
    getOrdersCollection().countDocuments({ status: 'delivered' }),
    getOrdersCollection().countDocuments({ status: 'cancelled' })
  ])

  // Calculate total revenue from paid/delivered orders
  const revenueResult = await getOrdersCollection().aggregate([
    { $match: { status: { $in: ['paid', 'delivered'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray()

  const totalRevenue = revenueResult[0]?.total || 0

  return { total, pending, paid, delivered, cancelled, totalRevenue }
}

// ============================================
// Admins
// ============================================

export async function loadAdmins(): Promise<Admin[]> {
  const admins = await getAdminsCollection().find({}).toArray()
  return admins.map(a => toClientDoc(a))
}

export async function getAdminById(adminId: string): Promise<Admin | null> {
  const admin = await getAdminsCollection().findOne({ id: adminId })
  return admin ? toClientDoc(admin) : null
}

export async function getAdminByUserId(userId: string): Promise<Admin | null> {
  const admin = await getAdminsCollection().findOne({ userId })
  return admin ? toClientDoc(admin) : null
}

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const admin = await getAdminsCollection().findOne({ username: username.toLowerCase() })
  return admin ? toClientDoc(admin) : null
}

export async function addAdmin(admin: Admin): Promise<Admin> {
  const collection = getAdminsCollection()
  const result = await collection.insertOne(admin as any)
  return { ...admin, _id: result.insertedId.toString() }
}

export async function deleteAdmin(adminId: string): Promise<boolean> {
  const result = await getAdminsCollection().deleteOne({ id: adminId })
  return result.deletedCount > 0
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const admin = await getAdminsCollection().findOne({ userId })
  return !!admin
}

// ============================================
// Sellers (enhanced)
// ============================================

export async function deleteSeller(sellerId: string): Promise<boolean> {
  const result = await getSellersCollection().deleteOne({ id: sellerId })
  return result.deletedCount > 0
}

// ============================================
// Files (for persistent image/file storage)
// ============================================

import { getFilesCollection, UploadedFile } from './database'

export { UploadedFile }

export async function getFiles(): Promise<UploadedFile[]> {
  const files = await getFilesCollection().find({}).sort({ uploadedAt: -1 }).toArray()
  return files.map(f => toClientDoc(f))
}

export async function getFileById(fileId: string): Promise<UploadedFile | null> {
  const file = await getFilesCollection().findOne({ id: fileId })
  return file ? toClientDoc(file) : null
}

export async function saveFile(file: UploadedFile): Promise<UploadedFile> {
  const collection = getFilesCollection()
  const result = await collection.insertOne(file as any)
  return { ...file, _id: result.insertedId.toString() }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const result = await getFilesCollection().deleteOne({ id: fileId })
  return result.deletedCount > 0
}

// ============================================
// Audit Logs
// ============================================

export interface AuditLogFilters {
  action?: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  adminId?: string
  startDate?: string
  endDate?: string
}

export interface LogAdminActionParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  adminId: string
  adminName?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<AuditLog> {
  const auditLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    adminId: params.adminId,
    adminName: params.adminName,
    changes: params.changes,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    timestamp: new Date().toISOString()
  }

  const collection = getAuditLogsCollection()
  const result = await collection.insertOne(auditLog as any)
  return { ...auditLog, _id: result.insertedId.toString() }
}

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  limit = 50,
  offset = 0
): Promise<{ logs: AuditLog[]; total: number }> {
  const collection = getAuditLogsCollection()
  const query: any = {}

  if (filters.action) query.action = filters.action
  if (filters.entityType) query.entityType = filters.entityType
  if (filters.entityId) query.entityId = filters.entityId
  if (filters.adminId) query.adminId = filters.adminId

  // Date range filtering
  if (filters.startDate || filters.endDate) {
    query.timestamp = {}
    if (filters.startDate) query.timestamp.$gte = filters.startDate
    if (filters.endDate) query.timestamp.$lte = filters.endDate
  }

  const [logs, total] = await Promise.all([
    collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query)
  ])

  return {
    logs: logs.map(log => toClientDoc(log)),
    total
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsByEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50,
  offset = 0
): Promise<{ logs: AuditLog[]; total: number }> {
  return getAuditLogs({ entityType, entityId }, limit, offset)
}

/**
 * Get audit logs by admin
 */
export async function getAuditLogsByAdmin(
  adminId: string,
  limit = 50,
  offset = 0
): Promise<{ logs: AuditLog[]; total: number }> {
  return getAuditLogs({ adminId }, limit, offset)
}

/**
 * Count total audit logs (optionally with filters)
 */
export async function countAuditLogs(filters: AuditLogFilters = {}): Promise<number> {
  const collection = getAuditLogsCollection()
  const query: any = {}

  if (filters.action) query.action = filters.action
  if (filters.entityType) query.entityType = filters.entityType
  if (filters.entityId) query.entityId = filters.entityId
  if (filters.adminId) query.adminId = filters.adminId

  if (filters.startDate || filters.endDate) {
    query.timestamp = {}
    if (filters.startDate) query.timestamp.$gte = filters.startDate
    if (filters.endDate) query.timestamp.$lte = filters.endDate
  }

  return collection.countDocuments(query)
}

/**
 * Delete old audit logs (for cleanup)
 */
export async function deleteOldAuditLogs(olderThanDays: number): Promise<number> {
  const collection = getAuditLogsCollection()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await collection.deleteMany({
    timestamp: { $lt: cutoffDate.toISOString() }
  })

  return result.deletedCount
}

// ============================================
// Tags
// ============================================

export async function loadTags(): Promise<Tag[]> {
  const tags = await getTagsCollection().find({}).sort({ name: 1 }).toArray()
  return tags.map(t => toClientDoc(t))
}

export async function getTagById(tagId: string): Promise<Tag | null> {
  const tag = await getTagsCollection().findOne({ id: tagId })
  return tag ? toClientDoc(tag) : null
}

export async function getTagByName(name: string): Promise<Tag | null> {
  const tag = await getTagsCollection().findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
  return tag ? toClientDoc(tag) : null
}

export async function addTag(tag: Tag): Promise<Tag> {
  const collection = getTagsCollection()
  const result = await collection.insertOne(tag as any)
  return { ...tag, _id: result.insertedId.toString() }
}

export async function updateTag(tagId: string, updates: Partial<Tag>): Promise<Tag | null> {
  const result = await getTagsCollection().findOneAndUpdate(
    { id: tagId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function deleteTag(tagId: string): Promise<boolean> {
  const result = await getTagsCollection().deleteOne({ id: tagId })

  // Also remove this tag from all products that have it
  if (result.deletedCount > 0) {
    await getProductsCollection().updateMany(
      { tags: tagId },
      { $pull: { tags: tagId } as any }
    )
    // Invalidate products cache since we modified products
    await redis.invalidateProducts()
  }

  return result.deletedCount > 0
}

export async function getProductsByTag(tagId: string): Promise<Product[]> {
  const products = await getProductsCollection().find({ tags: tagId }).toArray()
  return products.map(p => toClientDoc(p))
}

export async function countProductsByTag(tagId: string): Promise<number> {
  return getProductsCollection().countDocuments({ tags: tagId })
}

console.log('✅ DataStore module loaded (MongoDB)')

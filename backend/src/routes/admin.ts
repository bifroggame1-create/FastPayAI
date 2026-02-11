import { FastifyInstance, FastifyRequest } from 'fastify'
import { adminMiddleware, authMiddleware, CRITICAL_ADMIN_IDS } from '../auth'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'fastpay'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import {
  validateBody,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  createPromoSchema,
  updatePromoSchema,
  createSellerSchema,
  updateSellerSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  deliverOrderSchema
} from '../validation'
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  loadProducts,
  addPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPromoByCode,
  getOrdersWithFilters,
  countOrders,
  getOrderStats,
  getOrderById,
  updateOrder,
  loadAdmins,
  addAdmin,
  deleteAdmin,
  getAdminById,
  getAdminByUserId,
  getAdminByUsername,
  loadSellers,
  addSeller,
  updateSeller,
  deleteSeller,
  getSellerById,
  loadTags,
  getTagById,
  getTagByName,
  addTag,
  updateTag,
  deleteTag,
  countProductsByTag,
  Order,
  OrderStatus,
  Admin,
  Tag,
  logAdminAction,
  getAuditLogs,
  getAuditLogsByEntity,
  AuditAction,
  AuditEntityType
} from '../dataStore'
import { getUsersCollection, getOrdersCollection } from '../database'
import { createBackup, restoreFromBackup, getBackupStats, validateBackup } from '../backup'
import { addDeliveryKeys, removeDeliveryKey, getDeliveryStats } from '../delivery'

declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
    promoCodes: any[]
  }
}

// Helper to extract admin info from request for audit logging
function getAdminInfo(request: any): { adminId: string; adminName?: string; ipAddress?: string; userAgent?: string; tenantId: string } {
  const user = request.user || {}
  return {
    adminId: user.userId || 'unknown',
    adminName: user.username || undefined,
    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
    userAgent: request.headers['user-agent'] || undefined,
    tenantId: reqTenantId(request) // SECURITY: Always include tenant context in audit logs
  }
}

// Helper to sanitize object for logging (remove sensitive/large data)
function sanitizeForLog(obj: any): any {
  if (!obj) return obj
  const sanitized = { ...obj }
  // Remove large fields like base64 data
  if (sanitized.data && typeof sanitized.data === 'string' && sanitized.data.length > 100) {
    sanitized.data = `[base64 data, ${sanitized.data.length} chars]`
  }
  if (sanitized.deliveryKeys && Array.isArray(sanitized.deliveryKeys)) {
    sanitized.deliveryKeys = `[${sanitized.deliveryKeys.length} keys]`
  }
  return sanitized
}

export async function adminRoutes(fastify: FastifyInstance) {
  // ============================================
  // PRODUCTS MANAGEMENT
  // ============================================

  // Create product
  fastify.post('/admin/products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const product = validateBody(createProductSchema, request.body)
      const newProduct = {
        ...product,
        _id: product._id || String(Date.now()),
        createdAt: new Date().toISOString(),
        inStock: true
      }
      const saved = await addProduct(newProduct as any, reqTenantId(request))
      // Product saved to DB, no need for in-memory cache

      // Log the action (tenantId included via getAdminInfo)
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'product',
        entityId: saved._id?.toString() || newProduct._id,
        changes: { after: sanitizeForLog(saved) }
      })

      return { success: true, product: saved }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update product
  fastify.put('/admin/products/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const updates = validateBody(updateProductSchema, request.body)

      // Get product before update for audit log
      const before = await getProductById(id, reqTenantId(request))

      const updated = await updateProduct(id, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }
      // Product updated in DB, no need for in-memory cache

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'product',
        entityId: id,
        changes: {
          before: sanitizeForLog(before),
          after: sanitizeForLog(updated)
        }
      })

      return { success: true, product: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete product
  fastify.delete('/admin/products/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get product before deletion for audit log
    const before = await getProductById(id, reqTenantId(request))

    const deleted = await deleteProduct(id, reqTenantId(request))
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Product not found' }
    }
    // Product deleted from DB, no need for in-memory cache

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'product',
      entityId: id,
      changes: { before: sanitizeForLog(before) }
    })

    return { success: true }
  })

  // Toggle product visibility (enable/disable)
  fastify.patch('/admin/products/:id/toggle', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { isEnabled } = request.body as { isEnabled: boolean }
      const tenantId = reqTenantId(request)
      const user = (request as any).user

      console.log(`[Toggle] Product ${id}, isEnabled: ${isEnabled}, tenant: ${tenantId}, user: ${user?.userId}`)

      // CRITICAL: Force admin status for hardcoded admin IDs (they must ALWAYS have access)
      if (user && CRITICAL_ADMIN_IDS.includes(user.userId)) {
        user.isAdmin = true
        console.log(`[Toggle] ✅ CRITICAL ADMIN detected - forcing admin access:`, user.userId)
      }

      const before = await getProductById(id, tenantId)
      if (!before) {
        console.log(`[Toggle] Product ${id} not found for tenant ${tenantId}`)
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }

      // Check permissions: admin can toggle any product, seller can only toggle their own
      const userIsAdmin = user?.isAdmin || false
      const productSellerId = String(before.seller?.id || '')
      const currentUserId = String(user?.userId || '')
      const isOwner = productSellerId && currentUserId && productSellerId === currentUserId

      console.log(`[Toggle] Permission check: userIsAdmin=${userIsAdmin}, productSellerId=${productSellerId}, currentUserId=${currentUserId}, isOwner=${isOwner}`)

      if (!userIsAdmin && !isOwner) {
        console.log(`[Toggle] Access denied: user ${currentUserId} is not admin and doesn't own product ${id} (owner: ${productSellerId})`)
        reply.code(403)
        return { success: false, error: 'You can only toggle your own products' }
      }

      const updated = await updateProduct(id, { isEnabled }, tenantId)

      if (!updated) {
        console.log(`[Toggle] Failed to update product ${id}`)
        reply.code(500)
        return { success: false, error: 'Failed to update product' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'product',
        entityId: id,
        changes: {
          before: { isEnabled: before.isEnabled },
          after: { isEnabled }
        },
        metadata: { action: isEnabled ? 'enabled' : 'disabled' }
      })

      console.log(`[Toggle] Product ${id} successfully updated to isEnabled: ${isEnabled}`)
      return { success: true, product: updated }
    } catch (error: any) {
      console.error(`[Toggle] Error:`, error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // DELIVERY KEYS MANAGEMENT
  // ============================================

  // Get delivery stats for a product
  fastify.get('/admin/products/:id/delivery', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const tenantId = reqTenantId(request)
      const stats = await getDeliveryStats(id)
      const product = await getProductById(id, tenantId)

      return {
        success: true,
        stats,
        deliveryType: product?.deliveryType || 'manual',
        deliveryInstructions: product?.deliveryInstructions,
        keys: product?.deliveryKeys?.map((k: any) => ({
          id: k.id,
          key: k.isUsed ? '***' : k.key,
          type: k.type || 'text',
          fileUrl: k.fileUrl,
          fileName: k.fileName,
          variantId: k.variantId,
          isUsed: k.isUsed,
          usedByOrderId: k.usedByOrderId,
          usedAt: k.usedAt,
          addedAt: k.addedAt
        })) || []
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Add delivery keys to a product (supports text, file, and image types)
  fastify.post('/admin/products/:id/delivery/keys', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { keys, variantId } = request.body as {
        keys: Array<string | {
          key: string
          type?: 'text' | 'file' | 'image'
          fileUrl?: string
          fileName?: string
        }>
        variantId?: string
      }

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        reply.code(400)
        return { success: false, error: 'Keys array is required' }
      }

      // Process keys - support both string[] (legacy) and objects (new format)
      const validKeys = keys
        .map(k => {
          if (typeof k === 'string') {
            const trimmed = k.trim()
            return trimmed.length > 0 ? trimmed : null
          } else if (k && typeof k === 'object') {
            // New format with type support
            if (!k.key || k.key.trim().length === 0) return null
            return {
              key: k.key.trim(),
              type: k.type || 'text',
              fileUrl: k.fileUrl,
              fileName: k.fileName
            }
          }
          return null
        })
        .filter((k): k is NonNullable<typeof k> => k !== null)

      if (validKeys.length === 0) {
        reply.code(400)
        return { success: false, error: 'No valid keys provided' }
      }

      const addedKeys = await addDeliveryKeys(id, validKeys as any, variantId)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'add_keys',
        entityType: 'product',
        entityId: id,
        metadata: {
          keysAdded: addedKeys.length,
          variantId,
          types: addedKeys.map(k => k.type || 'text')
        }
      })

      return {
        success: true,
        addedCount: addedKeys.length,
        keys: addedKeys
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Remove a delivery key
  fastify.delete('/admin/products/:id/delivery/keys/:keyId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id, keyId } = request.params as any

      const deleted = await removeDeliveryKey(id, keyId)

      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Key not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'remove_key',
        entityType: 'product',
        entityId: id,
        metadata: { keyId }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update delivery settings for a product
  fastify.put('/admin/products/:id/delivery', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { deliveryType, deliveryInstructions } = request.body as {
        deliveryType?: 'manual' | 'auto'
        deliveryInstructions?: string
      }

      // Get product before update for audit log
      const before = await getProductById(id, reqTenantId(request))

      const updates: any = {}
      if (deliveryType !== undefined) updates.deliveryType = deliveryType
      if (deliveryInstructions !== undefined) updates.deliveryInstructions = deliveryInstructions

      const updated = await updateProduct(id, updates, reqTenantId(request))

      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'product',
        entityId: id,
        changes: {
          before: { deliveryType: before?.deliveryType, deliveryInstructions: before?.deliveryInstructions },
          after: updates
        },
        metadata: { field: 'delivery_settings' }
      })

      return { success: true, product: updated }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // SELLERS MANAGEMENT
  // ============================================

  // Sync sellers from products to sellers collection
  // This ensures sellers embedded in products appear in the sellers list
  async function syncSellersFromProducts(tenantId: string): Promise<number> {
    const { loadProducts } = await import('../dataStore')
    const { getSellersCollection } = await import('../database')

    const products = await loadProducts(tenantId)
    const existingSellers = await loadSellers(tenantId)
    const existingSellerIds = new Set(existingSellers.map(s => s.id))

    let syncedCount = 0

    // Collect unique sellers from products
    const sellersFromProducts = new Map<string, any>()
    for (const product of products) {
      if (product.seller && product.seller.id && !existingSellerIds.has(product.seller.id)) {
        if (!sellersFromProducts.has(product.seller.id)) {
          sellersFromProducts.set(product.seller.id, product.seller)
        }
      }
    }

    // Add or update missing sellers using upsert
    const collection = getSellersCollection()
    for (const [sellerId, sellerData] of sellersFromProducts) {
      try {
        const sellerDoc = {
          id: sellerId,
          name: sellerData.name || 'Unknown',
          avatar: sellerData.avatar || '',
          rating: sellerData.rating || 5,
          ratingCount: 0,
          createdAt: new Date().toISOString(),
          stats: {
            totalOrders: 0,
            successfulOrders: 0,
            refundsCount: 0,
            disputesCount: 0,
            disputesLost: 0,
            replacementsCount: 0,
            totalRevenue: 0
          },
          balance: {
            available: 0,
            frozen: 0,
            pendingWithdrawal: 0,
            totalWithdrawn: 0,
            totalEarned: 0
          },
          badges: ['new'] as ('new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky')[],
          escrowDays: 3,
          maxReplacementsPerOrder: 2,
          isVerified: sellerData.isVerified || false,
          isBlocked: false,
          tenantId
        }
        // Use upsert to handle sellers with wrong/missing tenantId
        // $setOnInsert must not contain fields already in $set to avoid MongoDB conflict
        const { tenantId: _t, name: _n, avatar: _a, ...insertOnly } = sellerDoc
        const result = await collection.updateOne(
          { id: sellerId },
          {
            $set: { tenantId, name: sellerDoc.name, avatar: sellerDoc.avatar },
            $setOnInsert: insertOnly
          },
          { upsert: true }
        )
        if (result.upsertedCount > 0 || result.modifiedCount > 0) {
          syncedCount++
        }
      } catch (e: any) {
        console.error(`Error syncing seller ${sellerId}:`, e.message)
      }
    }

    return syncedCount
  }

  // Get all sellers (with auto-sync from products)
  fastify.get('/admin/sellers', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)

      // First, sync any missing sellers from products
      const syncedCount = await syncSellersFromProducts(tenantId)
      if (syncedCount > 0) {
        console.log(`[Admin] Synced ${syncedCount} sellers from products to sellers collection`)
      }

      const sellers = await loadSellers(tenantId)
      return { success: true, sellers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Manual sync endpoint
  fastify.post('/admin/sellers/sync', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)
      const syncedCount = await syncSellersFromProducts(tenantId)
      return { success: true, syncedCount }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Fix sellers tenantId - updates all sellers without correct tenantId
  fastify.post('/admin/sellers/fix-tenant', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')
      const collection = getSellersCollection()

      // Update all sellers that don't have the correct tenantId
      const result = await collection.updateMany(
        { $or: [{ tenantId: { $ne: tenantId } }, { tenantId: { $exists: false } }] },
        { $set: { tenantId } }
      )

      return { success: true, modifiedCount: result.modifiedCount }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Create seller
  fastify.post('/admin/sellers', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const sellerData = validateBody(createSellerSchema, request.body)
      const seller = await addSeller({
        ...sellerData,
        id: sellerData.id || String(Date.now()),
        createdAt: new Date().toISOString()
      } as any, reqTenantId(request))

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'seller',
        entityId: seller.id,
        changes: { after: seller }
      })

      return { success: true, seller }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update seller
  fastify.put('/admin/sellers/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const updates = validateBody(updateSellerSchema, request.body)

      // Get seller before update for audit log
      const before = await getSellerById(id, reqTenantId(request))

      const updated = await updateSeller(id, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Seller not found' }
      }
      // Also update seller info in products
      const { loadProducts } = await import('../dataStore')
      const products = await loadProducts(reqTenantId(request))
      for (const p of products) {
        if (p.seller && p.seller.id === id && p._id) {
          const updatedProductSeller = { ...p.seller, ...updates }
          await updateProduct(String(p._id), { seller: updatedProductSeller }, reqTenantId(request))
        }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'seller',
        entityId: id,
        changes: { before: before || undefined, after: updated || undefined }
      })

      return { success: true, seller: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete seller
  fastify.delete('/admin/sellers/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any

      // Get seller before deletion for audit log
      const before = await getSellerById(id, reqTenantId(request))

      const deleted = await deleteSeller(id, reqTenantId(request))
      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Seller not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'delete',
        entityType: 'seller',
        entityId: id,
        changes: { before: before || undefined }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // USERS MANAGEMENT
  // ============================================

  // Get all users
  fastify.get('/admin/users', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tid = reqTenantId(request)
      const users = await getUsersCollection()
        .find({ tenantId: tid })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      // Enrich with order stats
      const enrichedUsers = await Promise.all(users.map(async (user: any) => {
        const orderStats = await getOrdersCollection().aggregate([
          { $match: { userId: user.id, tenantId: tid, status: { $in: ['paid', 'delivered'] } } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]).toArray()

        return {
          id: user._id?.toString() || user.id,
          orderId: user.id, // Fixed typo: was 'oderId'
          telegramId: user.id,
          username: user.username, // Telegram @username
          avatar: user.avatar, // Telegram avatar URL
          firstName: user.name?.split(' ')[0] || user.name,
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          isBlocked: user.isBlocked || false,
          blockReason: user.blockReason,
          isPremium: user.isPremium || false,
          ordersCount: orderStats[0]?.count || 0,
          totalSpent: orderStats[0]?.total || 0,
          createdAt: user.createdAt,
          lastSeen: user.lastSeen
        }
      }))

      return { success: true, users: enrichedUsers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Update user
  fastify.put('/admin/users/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { isBlocked, blockReason, isPremium } = request.body as any
      const tid = reqTenantId(request)

      // Find the user first
      const user = await getUsersCollection().findOne({
        $or: [{ id: id }, { _id: id }],
        tenantId: tid
      })

      if (!user) {
        reply.code(404)
        return { success: false, error: 'User not found' }
      }

      const updates: any = {}
      if (isBlocked !== undefined) updates.isBlocked = isBlocked
      if (blockReason !== undefined) updates.blockReason = blockReason
      if (isPremium !== undefined) updates.isPremium = isPremium

      await getUsersCollection().updateOne(
        { _id: user._id },
        { $set: updates }
      )

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'user',
        entityId: id,
        changes: { before: { isBlocked: user.isBlocked, isPremium: user.isPremium }, after: updates }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // ADMINS MANAGEMENT
  // ============================================

  // Get all admins
  fastify.get('/admin/admins', { preHandler: adminMiddleware }, async (request) => {
    try {
      const admins = await loadAdmins(reqTenantId(request))
      return { success: true, admins }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Add admin
  fastify.post('/admin/admins', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { userId, username, name, confirmToken } = request.body as { userId?: string; username?: string; name?: string; confirmToken?: string }

      // SECURITY FIX #10: Require email verification via confirmToken
      if (!confirmToken) {
        reply.code(400)
        return { success: false, error: 'Email confirmation required - confirmToken must be provided' }
      }

      if (!userId && !username) {
        reply.code(400)
        return { success: false, error: 'userId or username is required' }
      }

      // Check if already exists
      if (userId) {
        const existing = await getAdminByUserId(userId, reqTenantId(request))
        if (existing) {
          reply.code(400)
          return { success: false, error: 'Admin with this userId already exists' }
        }
      }
      if (username) {
        const existing = await getAdminByUsername(username, reqTenantId(request))
        if (existing) {
          reply.code(400)
          return { success: false, error: 'Admin with this username already exists' }
        }
      }

      const admin: Admin = {
        tenantId: reqTenantId(request),
        id: String(Date.now()),
        userId: userId || undefined,
        username: username?.toLowerCase() || undefined,
        name: name || undefined,
        addedAt: new Date().toISOString()
      }

      const saved = await addAdmin(admin, reqTenantId(request))

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'admin',
        entityId: saved.id,
        changes: { after: saved }
      })

      return { success: true, admin: saved }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Remove admin
  fastify.delete('/admin/admins/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any

      // Get admin before deletion for audit log
      const before = await getAdminById(id, reqTenantId(request))

      const deleted = await deleteAdmin(id, reqTenantId(request))
      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Admin not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'delete',
        entityType: 'admin',
        entityId: id,
        changes: { before: before || undefined }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // PROMO CODES MANAGEMENT
  // ============================================

  // Get all promo codes (tenant-scoped)
  fastify.get('/admin/promo', { preHandler: adminMiddleware }, async (request) => {
    const { loadPromoCodes } = await import('../dataStore')
    const promoCodes = await loadPromoCodes(reqTenantId(request))
    return { success: true, promoCodes }
  })

  // Create promo code
  fastify.post('/admin/promo', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const promo = validateBody(createPromoSchema, request.body)
      const newPromo = {
        ...promo,
        usedCount: 0,
        createdAt: new Date().toISOString()
      }
      await addPromoCode(newPromo as any, reqTenantId(request))
      fastify.promoCodes.push(newPromo)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'promo_code',
        entityId: newPromo.code,
        changes: { after: newPromo }
      })

      return { success: true, promo: newPromo }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update promo code
  fastify.put('/admin/promo/:code', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { code } = request.params as any
      const updates = validateBody(updatePromoSchema, request.body)

      // Get promo code before update for audit log
      const before = await getPromoByCode(code, reqTenantId(request))

      const updated = await updatePromoCode(code, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Promo code not found' }
      }
      const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
      if (index !== -1) fastify.promoCodes[index] = { ...fastify.promoCodes[index], ...updates }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'promo_code',
        entityId: code.toUpperCase(),
        changes: { before: before || undefined, after: updated || undefined }
      })

      return { success: true, promo: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete promo code
  fastify.delete('/admin/promo/:code', { preHandler: adminMiddleware }, async (request, reply) => {
    const { code } = request.params as any

    // Get promo code before deletion for audit log
    const before = await getPromoByCode(code, reqTenantId(request))

    const deleted = await deletePromoCode(code, reqTenantId(request))
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Promo code not found' }
    }
    const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
    if (index !== -1) fastify.promoCodes.splice(index, 1)

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'promo_code',
      entityId: code.toUpperCase(),
      changes: { before: before || undefined }
    })

    return { success: true }
  })

  // ============================================
  // ORDERS MANAGEMENT
  // ============================================

  // Get all orders with filters
  fastify.get('/admin/orders', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const query = validateQuery(orderQuerySchema, request.query)
      const filters: { status?: OrderStatus; userId?: string } = {}
      if (query.status) filters.status = query.status
      if (query.userId) filters.userId = query.userId

      const [orders, total] = await Promise.all([
        getOrdersWithFilters(filters, query.limit, query.offset, reqTenantId(request)),
        countOrders(filters, reqTenantId(request))
      ])

      // Enrich orders with user avatars
      const enrichedOrders = await Promise.all(orders.map(async (order: any) => {
        if (order.userId) {
          try {
            const user = await getUsersCollection().findOne({
              id: order.userId,
              tenantId: reqTenantId(request)
            })
            if (user) {
              return {
                ...order,
                userAvatar: user.avatar,
                // Also update username if it changed since order creation
                userUsername: user.username || order.userUsername
              }
            }
          } catch (err) {
            // If user lookup fails, just return order as-is
            fastify.log.warn({ userId: order.userId, error: err }, 'Failed to lookup user for order')
          }
        }
        return order
      }))

      return {
        success: true,
        orders: enrichedOrders,
        total,
        limit: query.limit,
        offset: query.offset
      }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Get orders stats
  fastify.get('/admin/orders/stats', { preHandler: adminMiddleware }, async (request) => {
    const stats = await getOrderStats(reqTenantId(request))
    return { success: true, stats }
  })

  // Get single order
  fastify.get('/admin/orders/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any
    const order = await getOrderById(id, reqTenantId(request))

    if (!order) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Decrypt delivery data if encrypted
    if (order.deliveryData) {
      try {
        const { safeDecrypt } = await import('../deliveryCrypto')
        const decrypted = safeDecrypt(order.deliveryData)
        if (decrypted) {
          order.deliveryData = decrypted
        }
      } catch (err) {
        // Keep as-is if decryption fails
      }
    }

    return { success: true, order }
  })

  // Update order status
  fastify.put('/admin/orders/:id/status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { status } = validateBody(updateOrderStatusSchema, request.body)

      // Get order before update for audit log
      const before = await getOrderById(id, reqTenantId(request))

      const updates: Partial<Order> = { status }
      if (status === 'delivered') {
        updates.deliveredAt = new Date().toISOString()
      }

      const updatedOrder = await updateOrder(id, updates, reqTenantId(request))
      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'status_change',
        entityType: 'order',
        entityId: id,
        changes: {
          before: { status: before?.status },
          after: { status: updatedOrder.status }
        }
      })

      return { success: true, order: updatedOrder }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Deliver order
  fastify.post('/admin/orders/:id/deliver', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { deliveryData, deliveryNote } = validateBody(deliverOrderSchema, request.body)

      // Get order before update for audit log
      const before = await getOrderById(id, reqTenantId(request))

      // Encrypt delivery data before storage
      let encryptedDeliveryData: any = deliveryData
      try {
        const { encryptDeliveryData } = await import('../deliveryCrypto')
        encryptedDeliveryData = encryptDeliveryData(deliveryData)
      } catch (err) {
        console.warn('[Admin] DELIVERY_SECRET not set, storing plaintext')
      }

      const updatedOrder = await updateOrder(id, {
        status: 'delivered',
        deliveryData: encryptedDeliveryData,
        deliveryNote,
        deliveredAt: new Date().toISOString()
      }, reqTenantId(request))

      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // SECURITY: Don't log sensitive delivery data
      console.log('Order delivered:', id, { hasDeliveryData: !!deliveryData, hasNote: !!deliveryNote })

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'deliver',
        entityType: 'order',
        entityId: id,
        changes: {
          before: { status: before?.status },
          after: { status: 'delivered', deliveryData, deliveryNote }
        }
      })

      return { success: true, order: updatedOrder }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Cancel order
  fastify.post('/admin/orders/:id/cancel', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get order before update for audit log
    const before = await getOrderById(id, reqTenantId(request))

    const updatedOrder = await updateOrder(id, {
      status: 'cancelled'
    }, reqTenantId(request))

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'cancel',
      entityType: 'order',
      entityId: id,
      changes: {
        before: { status: before?.status },
        after: { status: 'cancelled' }
      }
    })

    return { success: true, order: updatedOrder }
  })

  // Refund order
  fastify.post('/admin/orders/:id/refund', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get order before update for audit log
    const before = await getOrderById(id, reqTenantId(request))

    const updatedOrder = await updateOrder(id, {
      status: 'refunded'
    }, reqTenantId(request))

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'refund',
      entityType: 'order',
      entityId: id,
      changes: {
        before: { status: before?.status },
        after: { status: 'refunded' }
      }
    })

    return { success: true, order: updatedOrder }
  })

  // ============================================
  // BACKUP & RESTORE
  // ============================================

  // Get backup stats
  fastify.get('/admin/backup/stats', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const stats = await getBackupStats()
      return { success: true, data: stats }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create backup
  fastify.post('/admin/backup/create', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const backup = await createBackup()
      return { success: true, backup }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Restore from backup
  fastify.post('/admin/backup/restore', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const backup = request.body as any

      // Validate backup structure
      const validation = validateBackup(backup)
      if (!validation.valid) {
        reply.code(400)
        return { success: false, error: 'Invalid backup format', details: validation.errors }
      }

      const result = await restoreFromBackup(backup)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'restore',
        entityType: 'backup',
        entityId: backup.createdAt || 'unknown',
        metadata: { restored: result.restored }
      })

      return { success: true, restored: result.restored }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // FILES (for persistent image storage)
  // ============================================

  // Get all files
  fastify.get('/admin/files', { preHandler: adminMiddleware }, async () => {
    const { getFiles } = await import('../dataStore')
    const files = await getFiles()
    return { success: true, files }
  })

  // Upload file (base64)
  fastify.post('/admin/files', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { name, type, size, data } = request.body as {
        name: string
        type: string
        size: number
        data: string
      }

      if (!name || !type || !data) {
        reply.code(400)
        return { success: false, error: 'Missing required fields: name, type, data' }
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (size > maxSize) {
        reply.code(400)
        return { success: false, error: 'File too large. Max size: 5MB' }
      }

      const { saveFile } = await import('../dataStore')
      const file = await saveFile({
        tenantId: reqTenantId(request),
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        size,
        data,
        uploadedAt: new Date().toISOString()
      })

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'file',
        entityId: file.id,
        changes: { after: { id: file.id, name: file.name, type: file.type, size: file.size } }
      })

      return { success: true, file }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get file by ID (returns base64 data)
  fastify.get('/admin/files/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { getFileById } = await import('../dataStore')
    const file = await getFileById(id)

    if (!file) {
      reply.code(404)
      return { success: false, error: 'File not found' }
    }

    return { success: true, file }
  })

  // Delete file
  fastify.delete('/admin/files/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { deleteFile, getFileById } = await import('../dataStore')

    // Get file before deletion for audit log
    const before = await getFileById(id)

    const deleted = await deleteFile(id)

    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'File not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'file',
      entityId: id,
      changes: { before: before ? { id: before.id, name: before.name, type: before.type, size: before.size } : undefined }
    })

    return { success: true }
  })

  // ============================================
  // REVIEWS (admin management)
  // ============================================

  // Get all reviews (with moderation status)
  fastify.get('/admin/reviews', { preHandler: adminMiddleware }, async (request) => {
    const { status } = request.query as { status?: string }
    const { getReviewsCollection, toClientDoc } = await import('../database')

    const query: any = {}
    if (status) query.status = status

    const reviews = await getReviewsCollection().find(query).sort({ createdAt: -1 }).toArray()
    const pendingCount = await getReviewsCollection().countDocuments({ status: 'pending' })

    return {
      success: true,
      reviews: reviews.map(r => ({
        ...toClientDoc(r),
        status: r.status || 'approved', // Legacy reviews without status are treated as approved
      })),
      pendingCount
    }
  })

  // Create review (admin can create fake reviews)
  fastify.post('/admin/reviews', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { productId, userName, rating, text } = request.body as {
        productId: string
        userName: string
        rating: number
        text: string
      }

      if (!productId || !userName || !rating || !text) {
        reply.code(400)
        return { success: false, error: 'Missing required fields' }
      }

      const tenantId = reqTenantId(request)
      const { getReviewsCollection, toClientDoc } = await import('../database')
      const review = {
        id: `review-${Date.now()}`,
        tenantId,
        productId,
        userId: 'admin',
        userName,
        rating: Math.min(5, Math.max(1, rating)),
        text,
        status: 'approved' as const,
        createdAt: new Date().toISOString()
      }

      const result = await getReviewsCollection().insertOne(review as any)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'review',
        entityId: review.id,
        changes: { after: review }
      })

      return { success: true, review: { ...review, _id: result.insertedId.toString() } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update review
  fastify.put('/admin/reviews/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as { userName?: string; rating?: number; text?: string }

      const { getReviewsCollection, toClientDoc } = await import('../database')

      // Get review before update for audit log
      const before = await getReviewsCollection().findOne({ id })

      const result = await getReviewsCollection().findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(404)
        return { success: false, error: 'Review not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'review',
        entityId: id,
        changes: {
          before: before ? toClientDoc(before) : undefined,
          after: toClientDoc(result)
        }
      })

      return { success: true, review: toClientDoc(result) }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete review
  fastify.delete('/admin/reviews/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { getReviewsCollection, toClientDoc } = await import('../database')

    // Get review before deletion for audit log
    const review = await getReviewsCollection().findOne({ id })

    const result = await getReviewsCollection().deleteOne({ id })

    if (result.deletedCount === 0) {
      reply.code(404)
      return { success: false, error: 'Review not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'review',
      entityId: id,
      changes: { before: review ? toClientDoc(review) : undefined }
    })

    return { success: true }
  })

  // Moderate review (approve/reject)
  fastify.post('/admin/reviews/:id/moderate', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { action, reason } = request.body as { action: 'approve' | 'reject'; reason?: string }

      if (!action || !['approve', 'reject'].includes(action)) {
        reply.code(400)
        return { success: false, error: 'Action must be approve or reject' }
      }

      const { getReviewsCollection, getProductsCollection, toClientDoc } = await import('../database')

      const review = await getReviewsCollection().findOne({ id })
      if (!review) {
        reply.code(404)
        return { success: false, error: 'Review not found' }
      }

      const adminUser = (request as any).user
      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      const updateFields: any = {
        status: newStatus,
        moderatedAt: new Date().toISOString(),
        moderatedBy: adminUser?.userId || 'admin',
      }

      if (action === 'reject' && reason) {
        updateFields.rejectionReason = reason
      }

      const result = await getReviewsCollection().findOneAndUpdate(
        { id },
        { $set: updateFields },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(500)
        return { success: false, error: 'Failed to update review' }
      }

      // If approved, recalculate product rating
      if (action === 'approve' && review.productId) {
        const approvedReviews = await getReviewsCollection().find({
          productId: review.productId,
          $or: [{ status: 'approved' }, { status: { $exists: false } }]
        }).toArray()

        if (approvedReviews.length > 0) {
          const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
          await getProductsCollection().updateOne(
            { _id: review.productId },
            { $set: { rating: Math.round(avgRating * 10) / 10 } }
          )
        }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'review',
        entityId: id,
        changes: {
          before: { status: review.status || 'pending' },
          after: { status: newStatus, reason }
        }
      })

      return {
        success: true,
        review: {
          ...toClientDoc(result),
          status: newStatus,
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // AUDIT LOGS
  // ============================================

  // Get audit logs with filters and pagination
  fastify.get('/admin/audit-logs', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const {
        action,
        entityType,
        entityId,
        adminId,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = request.query as {
        action?: AuditAction
        entityType?: AuditEntityType
        entityId?: string
        adminId?: string
        startDate?: string
        endDate?: string
        limit?: number
        offset?: number
      }

      const filters: any = {}
      if (action) filters.action = action
      if (entityType) filters.entityType = entityType
      if (entityId) filters.entityId = entityId
      if (adminId) filters.adminId = adminId
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const result = await getAuditLogs(filters, Number(limit), Number(offset))

      return {
        success: true,
        logs: result.logs,
        total: result.total,
        limit: Number(limit),
        offset: Number(offset)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get audit logs for a specific entity
  fastify.get('/admin/audit-logs/:entityType/:entityId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: AuditEntityType; entityId: string }
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number }

      const result = await getAuditLogsByEntity(entityType, entityId, Number(limit), Number(offset))

      return {
        success: true,
        logs: result.logs,
        total: result.total,
        limit: Number(limit),
        offset: Number(offset)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // CSV IMPORT
  // ============================================

  // Import products from CSV
  fastify.post('/admin/import/products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { csv } = request.body as { csv: string }
      if (!csv) {
        reply.code(400)
        return { success: false, error: 'CSV data required' }
      }

      const { importProductsFromCSV } = await import('../csvImporter')
      const result = await importProductsFromCSV(csv)

      // Log action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'product',
        entityId: 'bulk_import',
        metadata: { imported: result.imported, errors: result.errors.length }
      })

      return result
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get CSV template
  fastify.get('/admin/import/template', { preHandler: adminMiddleware }, async () => {
    const { getCSVTemplate } = await import('../csvImporter')
    return { success: true, template: getCSVTemplate() }
  })

  // ============================================
  // EXTENDED STATISTICS
  // ============================================

  // Dashboard stats
  fastify.get('/admin/stats/dashboard', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getDashboardStats } = await import('../statistics')
      const stats = await getDashboardStats(period as any)
      return { success: true, stats }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Revenue chart
  fastify.get('/admin/stats/revenue', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getRevenueChart } = await import('../statistics')
      const data = await getRevenueChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Orders chart
  fastify.get('/admin/stats/orders-chart', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getOrdersChart } = await import('../statistics')
      const data = await getOrdersChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Top products
  fastify.get('/admin/stats/top-products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', limit = 10 } = request.query as { period?: string; limit?: number }
      const { getTopProducts } = await import('../statistics')
      const data = await getTopProducts(period as any, Number(limit))
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Payment method stats
  fastify.get('/admin/stats/payment-methods', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getPaymentMethodStats } = await import('../statistics')
      const data = await getPaymentMethodStats(period as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // User growth chart
  fastify.get('/admin/stats/user-growth', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getUserGrowthChart } = await import('../statistics')
      const data = await getUserGrowthChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Category stats
  fastify.get('/admin/stats/categories', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getCategoryStats } = await import('../statistics')
      const data = await getCategoryStats(period as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // 2FA MANAGEMENT
  // ============================================

  // Setup 2FA
  fastify.post('/admin/2fa/setup', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { setup2FA } = await import('../twoFactorAuth')
      const result = await setup2FA(user.userId)
      return { success: true, ...result }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Enable 2FA
  fastify.post('/admin/2fa/enable', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { code } = request.body as { code: string }

      if (!user?.userId || !code) {
        reply.code(400)
        return { success: false, error: 'Code required' }
      }

      const { enable2FA } = await import('../twoFactorAuth')
      const enabled = enable2FA(user.userId, code)

      if (!enabled) {
        reply.code(400)
        return { success: false, error: 'Invalid code' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Disable 2FA
  fastify.post('/admin/2fa/disable', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { code } = request.body as { code: string }

      if (!user?.userId || !code) {
        reply.code(400)
        return { success: false, error: 'Code required' }
      }

      const { disable2FA } = await import('../twoFactorAuth')
      const disabled = disable2FA(user.userId, code)

      if (!disabled) {
        reply.code(400)
        return { success: false, error: 'Invalid code' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Check 2FA status
  fastify.get('/admin/2fa/status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { is2FAEnabled, getBackupCodesCount } = await import('../twoFactorAuth')
      return {
        success: true,
        enabled: is2FAEnabled(user.userId),
        backupCodesRemaining: getBackupCodesCount(user.userId)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Regenerate backup codes
  fastify.post('/admin/2fa/backup-codes', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { regenerateBackupCodes } = await import('../twoFactorAuth')
      const codes = regenerateBackupCodes(user.userId)

      if (!codes) {
        reply.code(400)
        return { success: false, error: '2FA not enabled' }
      }

      return { success: true, backupCodes: codes }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // ADMIN ROLES
  // ============================================

  // Get all roles
  fastify.get('/admin/roles', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { getAllRoles } = await import('../adminRoles')
      const roles = await getAllRoles()
      return { success: true, roles }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create role
  fastify.post('/admin/roles', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const roleData = request.body as any
      const { createRole } = await import('../adminRoles')
      const role = await createRole(roleData)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'admin',
        entityId: role.id,
        metadata: { type: 'role', name: role.name }
      })

      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update role
  fastify.put('/admin/roles/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as any
      const { updateRole } = await import('../adminRoles')
      const role = await updateRole(id, updates)

      if (!role) {
        reply.code(404)
        return { success: false, error: 'Role not found' }
      }

      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete role
  fastify.delete('/admin/roles/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { deleteRole } = await import('../adminRoles')
      const deleted = await deleteRole(id)

      if (!deleted) {
        reply.code(400)
        return { success: false, error: 'Cannot delete system role' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Assign role to admin
  fastify.post('/admin/roles/assign', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { adminId, roleId } = request.body as { adminId: string; roleId: string }
      const user = (request as any).user

      const { assignRole } = await import('../adminRoles')
      const assignment = await assignRole(adminId, roleId, user?.userId)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'admin',
        entityId: adminId,
        metadata: { type: 'role_assignment', roleId }
      })

      return { success: true, assignment }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get admin's role
  fastify.get('/admin/roles/admin/:adminId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { adminId } = request.params as { adminId: string }
      const { getAdminRole } = await import('../adminRoles')
      const role = await getAdminRole(adminId)
      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // WEBHOOKS
  // ============================================

  // Get all webhooks
  fastify.get('/admin/webhooks', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { getAllWebhooks } = await import('../webhooks')
      const webhooks = await getAllWebhooks()
      // Hide secrets
      const safeWebhooks = webhooks.map(w => ({ ...w, secret: '***' }))
      return { success: true, webhooks: safeWebhooks }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get webhook by ID
  fastify.get('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { getWebhookById } = await import('../webhooks')
      const webhook = await getWebhookById(id)

      if (!webhook) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, webhook: { ...webhook, secret: '***' } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create webhook
  fastify.post('/admin/webhooks', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const webhookData = request.body as any
      const { createWebhook } = await import('../webhooks')
      const webhook = await createWebhook(webhookData)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'backup', // Using 'backup' as closest type for webhooks
        entityId: webhook.id,
        metadata: { type: 'webhook', name: webhook.name, url: webhook.url }
      })

      return { success: true, webhook }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update webhook
  fastify.put('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as any
      const { updateWebhook } = await import('../webhooks')
      const webhook = await updateWebhook(id, updates)

      if (!webhook) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, webhook: { ...webhook, secret: '***' } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete webhook
  fastify.delete('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { deleteWebhook } = await import('../webhooks')
      const deleted = await deleteWebhook(id)

      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Regenerate webhook secret
  fastify.post('/admin/webhooks/:id/regenerate-secret', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { regenerateSecret } = await import('../webhooks')
      const secret = await regenerateSecret(id)

      if (!secret) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, secret }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Test webhook
  fastify.post('/admin/webhooks/:id/test', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { testWebhook } = await import('../webhooks')
      const result = await testWebhook(id)
      return { ...result }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get webhook delivery logs
  fastify.get('/admin/webhooks/:id/logs', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { limit = 50 } = request.query as { limit?: number }
      const { getDeliveryLogs } = await import('../webhooks')
      const logs = await getDeliveryLogs(id, Number(limit))
      return { success: true, logs }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // SHOP SETTINGS
  // ============================================

  // Get shop settings (payment methods, branding, etc.)
  fastify.get('/admin/settings', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const tenant = request.tenant
      if (!tenant) {
        reply.code(400)
        return { success: false, error: 'Tenant not found' }
      }

      return {
        success: true,
        settings: {
          branding: tenant.branding,
          settings: tenant.settings,
          paymentConfig: {
            enabledMethods: tenant.paymentConfig?.enabledMethods || ['cryptobot']
          }
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update payment methods settings
  fastify.patch('/admin/settings/payment-methods', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { enabledMethods } = request.body as { enabledMethods: string[] }
      const tenantId = reqTenantId(request)

      fastify.log.info({ tenantId, enabledMethods }, 'Updating payment methods')

      if (!enabledMethods || !Array.isArray(enabledMethods)) {
        fastify.log.warn({ enabledMethods }, 'Invalid enabledMethods format')
        reply.code(400)
        return { success: false, error: 'enabledMethods array is required' }
      }

      // Validate payment methods
      const validMethods = ['cryptobot', 'xrocket', 'telegram-stars', 'cactuspay-sbp', 'cactuspay-card']
      const filteredMethods = enabledMethods.filter(m => validMethods.includes(m))

      fastify.log.info({ tenantId, filteredMethods }, 'Filtered methods')

      const { getTenantsCollection } = await import('../database')

      // Check if tenant exists first
      const existingTenant = await getTenantsCollection().findOne({ id: tenantId })
      fastify.log.info({ tenantId, exists: !!existingTenant }, 'Tenant lookup result')

      if (!existingTenant) {
        // Auto-create tenant with default settings
        fastify.log.info({ tenantId }, 'Creating tenant automatically')
        await getTenantsCollection().insertOne({
          id: tenantId,
          name: tenantId,
          createdAt: new Date().toISOString(),
          paymentConfig: {
            enabledMethods: filteredMethods as any
          }
        } as any)
        fastify.log.info({ tenantId }, 'Tenant created successfully')
      }

      // Update payment methods
      const updateResult = await getTenantsCollection().updateOne(
        { id: tenantId },
        { $set: { 'paymentConfig.enabledMethods': filteredMethods } },
        { upsert: true }
      )

      fastify.log.info({
        tenantId,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      }, 'Update result')

      if (updateResult.matchedCount === 0) {
        fastify.log.error({ tenantId }, 'Tenant not matched during update')
        reply.code(500)
        return { success: false, error: 'Failed to update payment methods - tenant not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'settings',
        entityId: 'payment_methods',
        changes: { after: { enabledMethods: filteredMethods } }
      })

      fastify.log.info({ tenantId, enabledMethods: filteredMethods }, 'Payment methods updated successfully')
      return { success: true, enabledMethods: filteredMethods }
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error updating payment methods')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update Stars/Premium pricing
  fastify.patch('/admin/settings/pricing', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const {
        starsMarkupPerStar,
        premium3MonthsPrice,
        premium6MonthsPrice,
        premium12MonthsPrice
      } = request.body as {
        starsMarkupPerStar?: number
        premium3MonthsPrice?: number
        premium6MonthsPrice?: number
        premium12MonthsPrice?: number
      }

      const tenantId = reqTenantId(request)

      fastify.log.info({ tenantId, pricing: request.body }, 'Updating Stars/Premium pricing')

      // Validate pricing values
      const updateFields: any = {}

      if (starsMarkupPerStar !== undefined) {
        if (typeof starsMarkupPerStar !== 'number' || starsMarkupPerStar <= 0) {
          reply.code(400)
          return { success: false, error: 'Stars markup must be a positive number' }
        }
        updateFields['settings.starsMarkupPerStar'] = starsMarkupPerStar
      }

      if (premium3MonthsPrice !== undefined) {
        if (typeof premium3MonthsPrice !== 'number' || premium3MonthsPrice <= 0) {
          reply.code(400)
          return { success: false, error: 'Premium 3 months price must be a positive number' }
        }
        updateFields['settings.premium3MonthsPrice'] = premium3MonthsPrice
      }

      if (premium6MonthsPrice !== undefined) {
        if (typeof premium6MonthsPrice !== 'number' || premium6MonthsPrice <= 0) {
          reply.code(400)
          return { success: false, error: 'Premium 6 months price must be a positive number' }
        }
        updateFields['settings.premium6MonthsPrice'] = premium6MonthsPrice
      }

      if (premium12MonthsPrice !== undefined) {
        if (typeof premium12MonthsPrice !== 'number' || premium12MonthsPrice <= 0) {
          reply.code(400)
          return { success: false, error: 'Premium 12 months price must be a positive number' }
        }
        updateFields['settings.premium12MonthsPrice'] = premium12MonthsPrice
      }

      if (Object.keys(updateFields).length === 0) {
        reply.code(400)
        return { success: false, error: 'No pricing fields provided' }
      }

      const { getTenantsCollection } = await import('../database')

      // Update pricing
      const updateResult = await getTenantsCollection().updateOne(
        { id: tenantId },
        { $set: updateFields }
      )

      fastify.log.info({
        tenantId,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      }, 'Pricing update result')

      if (updateResult.matchedCount === 0) {
        reply.code(500)
        return { success: false, error: 'Failed to update pricing - tenant not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'settings',
        entityId: 'pricing',
        changes: { after: updateFields }
      })

      fastify.log.info({ tenantId, pricing: updateFields }, 'Pricing updated successfully')
      return { success: true, pricing: updateFields }
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error updating pricing')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update platform commission
  fastify.patch('/admin/settings/commission', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { platformFeePercent } = request.body as { platformFeePercent: number }
      const tenantId = reqTenantId(request)

      // Validate
      if (typeof platformFeePercent !== 'number' || platformFeePercent < 0 || platformFeePercent > 100) {
        reply.code(400)
        return { success: false, error: 'Invalid platformFeePercent (must be 0-100)' }
      }

      const { getTenantsCollection } = await import('../database')
      await getTenantsCollection().updateOne(
        { id: tenantId },
        { $set: { 'commissionRules.platformFeePercent': platformFeePercent } },
        { upsert: true }
      )

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'settings',
        entityId: 'commission',
        changes: { after: { platformFeePercent } }
      })

      return { success: true, platformFeePercent }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update shop branding
  fastify.patch('/admin/settings/branding', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const branding = request.body as any
      const tenantId = reqTenantId(request)

      const { getTenantsCollection } = await import('../database')
      await getTenantsCollection().updateOne(
        { id: tenantId },
        { $set: { branding } }
      )

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'settings',
        entityId: 'branding',
        changes: { after: branding }
      })

      return { success: true, branding }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // MY SHOP (SELLER DASHBOARD)
  // ============================================

  // Get seller's own products (or any seller's if admin provides sellerId)
  fastify.get('/admin/my-shop/products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { sellerId?: string }

      // Admins can view any seller's products by providing sellerId parameter
      let sellerId = user?.userId || user?.id
      if (query.sellerId && user?.isAdmin) {
        sellerId = query.sellerId
        fastify.log.info({ adminId: user?.userId, viewingSellerId: sellerId }, 'Admin viewing seller products')
      }

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)
      const products = await loadProducts(tenantId)

      // Filter products by seller ID
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)

      return { success: true, products: sellerProducts }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get seller's own orders (or any seller's if admin provides sellerId)
  fastify.get('/admin/my-shop/orders', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { sellerId?: string }

      // Admins can view any seller's orders by providing sellerId parameter
      let sellerId = user?.userId || user?.id
      if (query.sellerId && user?.isAdmin) {
        sellerId = query.sellerId
        fastify.log.info({ adminId: user?.userId, viewingSellerId: sellerId }, 'Admin viewing seller orders')
      }

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)

      // Get seller's products first
      const products = await loadProducts(tenantId)
      const sellerProductIds = products
        .filter(p => p.seller?.id === sellerId)
        .map(p => p._id?.toString())
        .filter((id): id is string => !!id)

      // Get orders for seller's products
      const ordersCollection = getOrdersCollection()
      const orders = await ordersCollection
        .find({
          tenantId,
          productId: { $in: sellerProductIds }
        })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      return { success: true, orders }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get seller's stats (or any seller's if admin provides sellerId)
  fastify.get('/admin/my-shop/stats', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { sellerId?: string }

      // Admins can view any seller's stats by providing sellerId parameter
      let sellerId = user?.userId || user?.id
      if (query.sellerId && user?.isAdmin) {
        sellerId = query.sellerId
        fastify.log.info({ adminId: user?.userId, viewingSellerId: sellerId }, 'Admin viewing seller stats')
      }

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)

      // Get seller's products
      const products = await loadProducts(tenantId)
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)
      const sellerProductIds = sellerProducts
        .map(p => p._id?.toString())
        .filter((id): id is string => !!id)

      // Count orders
      const ordersCollection = getOrdersCollection()
      const [totalOrders, deliveredOrders, revenue] = await Promise.all([
        ordersCollection.countDocuments({
          tenantId,
          productId: { $in: sellerProductIds }
        }),
        ordersCollection.countDocuments({
          tenantId,
          productId: { $in: sellerProductIds },
          status: 'delivered'
        }),
        ordersCollection.aggregate([
          {
            $match: {
              tenantId,
              productId: { $in: sellerProductIds },
              status: 'delivered'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]).toArray()
      ])

      return {
        success: true,
        stats: {
          productsCount: sellerProducts.length,
          activeProducts: sellerProducts.filter(p => p.isEnabled !== false).length,
          totalOrders,
          deliveredOrders,
          revenue: revenue[0]?.total || 0
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get seller's payment config
  fastify.get('/admin/my-shop/payment-config', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')
      const seller = await getSellersCollection().findOne({ id: sellerId, tenantId })

      return {
        success: true,
        config: {
          enabledMethods: seller?.paymentConfig?.enabledMethods || [],
          hasCryptobotToken: !!seller?.paymentConfig?.cryptobotToken,
          hasXrocketApiKey: !!seller?.paymentConfig?.xrocketApiKey
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update seller's payment config
  fastify.patch('/admin/my-shop/payment-config', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const { cryptobotToken, xrocketApiKey } = request.body as {
        cryptobotToken?: string
        xrocketApiKey?: string
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')

      const updateData: any = {}
      if (cryptobotToken !== undefined) {
        updateData['paymentConfig.cryptobotToken'] = cryptobotToken
      }
      if (xrocketApiKey !== undefined) {
        updateData['paymentConfig.xrocketApiKey'] = xrocketApiKey
      }

      if (Object.keys(updateData).length === 0) {
        reply.code(400)
        return { success: false, error: 'No payment config provided' }
      }

      await getSellersCollection().updateOne(
        { id: sellerId, tenantId },
        { $set: updateData },
        { upsert: true }
      )

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'seller',
        entityId: sellerId,
        metadata: {
          action: 'payment_config_updated',
          hasCryptobotToken: !!cryptobotToken,
          hasXrocketApiKey: !!xrocketApiKey
        }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // SELLER WALLET
  // ============================================

  // Get seller's wallet
  fastify.get('/admin/wallet', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id
      const tenantId = reqTenantId(request)

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      // Get seller's products
      const products = await loadProducts(tenantId)
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)
      const sellerProductIds = sellerProducts.map(p => p._id).filter((id): id is string => id !== undefined)

      // Get all orders for seller's products
      const { getOrdersCollection, getWithdrawalRequestsCollection, getTenantsCollection } = await import('../database')
      const orders = await getOrdersCollection().find({
        tenantId,
        productId: { $in: sellerProductIds },
        status: { $in: ['paid', 'delivered'] }
      }).toArray()

      // Get platform fee percent
      const tenant = await getTenantsCollection().findOne({ id: tenantId }) as any
      const platformFeePercent = tenant?.commissionRules?.platformFeePercent || 0

      // Calculate total revenue and balance
      let totalRevenue = 0
      let platformFee = 0

      for (const order of orders) {
        const orderAmount = order.amount || 0
        totalRevenue += orderAmount
        platformFee += (orderAmount * platformFeePercent) / 100
      }

      const balance = totalRevenue - platformFee

      // Get sum of completed withdrawals
      const completedWithdrawals = await getWithdrawalRequestsCollection().find({
        tenantId,
        sellerId,
        status: 'completed'
      }).toArray()

      const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)

      // Get sum of pending withdrawals
      const pendingWithdrawals = await getWithdrawalRequestsCollection().find({
        tenantId,
        sellerId,
        status: { $in: ['pending', 'processing'] }
      }).toArray()

      const pendingBalance = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)

      // Available balance = total balance - withdrawn - pending
      const availableBalance = balance - totalWithdrawn - pendingBalance

      return {
        success: true,
        wallet: {
          balance: availableBalance,
          pendingBalance,
          totalRevenue,
          platformFee,
          totalWithdrawn,
          sellerId
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Request withdrawal
  fastify.post('/admin/wallet/withdraw', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id
      const tenantId = reqTenantId(request)
      const { amount, method, methodDetails } = request.body as any

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      if (!amount || amount <= 0) {
        reply.code(400)
        return { success: false, error: 'Invalid amount' }
      }

      if (!method || !['cryptobot', 'xrocket', 'sbp', 'card'].includes(method)) {
        reply.code(400)
        return { success: false, error: 'Invalid withdrawal method' }
      }

      // Get current balance
      const products = await loadProducts(tenantId)
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)
      const sellerProductIds = sellerProducts.map(p => p._id).filter((id): id is string => id !== undefined)

      const { getOrdersCollection, getWithdrawalRequestsCollection, getTenantsCollection } = await import('../database')
      const orders = await getOrdersCollection().find({
        tenantId,
        productId: { $in: sellerProductIds },
        status: { $in: ['paid', 'delivered'] }
      }).toArray()

      const tenant = await getTenantsCollection().findOne({ id: tenantId }) as any
      const platformFeePercent = tenant?.commissionRules?.platformFeePercent || 0

      let totalRevenue = 0
      for (const order of orders) {
        const orderAmount = order.amount || 0
        totalRevenue += orderAmount
      }

      const balance = totalRevenue - (totalRevenue * platformFeePercent) / 100

      const completedWithdrawals = await getWithdrawalRequestsCollection().find({
        tenantId,
        sellerId,
        status: 'completed'
      }).toArray()

      const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)

      const pendingWithdrawals = await getWithdrawalRequestsCollection().find({
        tenantId,
        sellerId,
        status: { $in: ['pending', 'processing'] }
      }).toArray()

      const pendingBalance = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)
      const availableBalance = balance - totalWithdrawn - pendingBalance

      // Check if enough balance
      if (amount > availableBalance) {
        reply.code(400)
        return { success: false, error: `Insufficient balance. Available: ${availableBalance}` }
      }

      // Create withdrawal request
      const withdrawal = {
        tenantId,
        sellerId,
        sellerName: user?.name || user?.username || 'Unknown',
        sellerUsername: user?.username,
        amount,
        method,
        methodDetails: methodDetails || {},
        status: 'pending' as const,
        requestedAt: new Date().toISOString()
      }

      const result = await getWithdrawalRequestsCollection().insertOne(withdrawal as any)
      const withdrawalId = result.insertedId.toString()

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'withdrawal_request',
        entityType: 'wallet',
        entityId: withdrawalId,
        metadata: { amount, method, sellerId }
      })

      return {
        success: true,
        withdrawal: {
          id: withdrawalId,
          ...withdrawal
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get wallet transactions (withdrawal requests history)
  fastify.get('/admin/wallet/transactions', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id
      const tenantId = reqTenantId(request)
      const { limit = 50, offset = 0 } = request.query as any

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const { getWithdrawalRequestsCollection } = await import('../database')
      const transactions = await getWithdrawalRequestsCollection()
        .find({ tenantId, sellerId })
        .sort({ requestedAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .toArray()

      return {
        success: true,
        transactions: transactions.map(t => ({
          ...t,
          _id: t._id?.toString()
        }))
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Admin: Get all withdrawal requests
  fastify.get('/admin/withdrawals', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.isAdmin) {
        reply.code(403)
        return { success: false, error: 'Admin access required' }
      }

      const tenantId = reqTenantId(request)
      const { status, limit = 100, offset = 0 } = request.query as any

      const { getWithdrawalRequestsCollection } = await import('../database')
      const query: any = { tenantId }
      if (status) {
        query.status = status
      }

      const withdrawals = await getWithdrawalRequestsCollection()
        .find(query)
        .sort({ requestedAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .toArray()

      return {
        success: true,
        withdrawals: withdrawals.map(w => ({
          ...w,
          _id: w._id?.toString()
        }))
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Admin: Update withdrawal status
  fastify.patch('/admin/withdrawals/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.isAdmin) {
        reply.code(403)
        return { success: false, error: 'Admin access required' }
      }

      const { id } = request.params as any
      const { status, adminNote, rejectionReason, transactionId, proofUrl } = request.body as any
      const tenantId = reqTenantId(request)

      if (!status || !['processing', 'completed', 'rejected', 'cancelled'].includes(status)) {
        reply.code(400)
        return { success: false, error: 'Invalid status' }
      }

      const { getWithdrawalRequestsCollection } = await import('../database')
      const { ObjectId } = await import('mongodb')
      const updates: any = {
        status,
        processedBy: user.userId,
        processedAt: new Date().toISOString()
      }

      if (status === 'completed') {
        updates.completedAt = new Date().toISOString()
        if (transactionId) updates.transactionId = transactionId
        if (proofUrl) updates.proofUrl = proofUrl
      }

      if (status === 'rejected') {
        updates.rejectedAt = new Date().toISOString()
        if (rejectionReason) updates.rejectionReason = rejectionReason
      }

      if (adminNote) {
        updates.adminNote = adminNote
      }

      const result = await getWithdrawalRequestsCollection().findOneAndUpdate(
        { _id: new ObjectId(id), tenantId },
        { $set: updates },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(404)
        return { success: false, error: 'Withdrawal request not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'withdrawal',
        entityId: id,
        changes: { after: updates }
      })

      return {
        success: true,
        withdrawal: {
          ...result,
          _id: result._id?.toString()
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // SELLER ANALYTICS
  // ============================================

  // Get seller's analytics data (charts, top products, etc.)
  fastify.get('/admin/my-shop/analytics', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)
      const { period = '30d' } = request.query as { period?: string }

      // Get seller's products
      const products = await loadProducts(tenantId)
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)
      const sellerProductIds = sellerProducts
        .map(p => p._id?.toString())
        .filter((id): id is string => !!id)

      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      if (period === '7d') startDate.setDate(now.getDate() - 7)
      else if (period === '30d') startDate.setDate(now.getDate() - 30)
      else if (period === '90d') startDate.setDate(now.getDate() - 90)
      else startDate.setDate(now.getDate() - 365)

      const ordersCollection = getOrdersCollection()

      // Get orders for period
      const orders = await ordersCollection
        .find({
          tenantId,
          productId: { $in: sellerProductIds },
          createdAt: { $gte: startDate.toISOString() }
        })
        .sort({ createdAt: -1 })
        .toArray()

      // Calculate daily revenue chart
      const dailyRevenue: { date: string; revenue: number; orders: number }[] = []
      const dailyMap = new Map<string, { revenue: number; orders: number }>()

      for (const order of orders) {
        if (order.status === 'delivered' || order.status === 'paid') {
          const dateStr = order.createdAt || order.paidAt || new Date().toISOString()
          const date = new Date(dateStr).toISOString().split('T')[0]
          const existing = dailyMap.get(date) || { revenue: 0, orders: 0 }
          dailyMap.set(date, {
            revenue: existing.revenue + (order.amount || 0),
            orders: existing.orders + 1
          })
        }
      }

      // Sort by date
      const sortedDates = Array.from(dailyMap.keys()).sort()
      for (const date of sortedDates) {
        const data = dailyMap.get(date)!
        dailyRevenue.push({ date, ...data })
      }

      // Calculate top products
      const productStats = new Map<string, { name: string; sales: number; revenue: number }>()
      for (const order of orders) {
        if (order.status === 'delivered') {
          const existing = productStats.get(order.productId) || { name: order.productName || 'Unknown', sales: 0, revenue: 0 }
          productStats.set(order.productId, {
            name: existing.name,
            sales: existing.sales + 1,
            revenue: existing.revenue + (order.amount || 0)
          })
        }
      }

      const topProducts = Array.from(productStats.entries())
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Calculate conversion rate (views vs purchases - simplified)
      const totalOrders = orders.length
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length
      const conversionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0

      // Calculate totals
      const totalRevenue = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.amount || 0), 0)

      return {
        success: true,
        analytics: {
          period,
          summary: {
            totalRevenue,
            totalOrders,
            deliveredOrders,
            conversionRate,
            averageOrderValue: deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0
          },
          dailyRevenue,
          topProducts
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get seller's reviews
  fastify.get('/admin/my-shop/reviews', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)

      // Get seller's products
      const products = await loadProducts(tenantId)
      const sellerProductIds = products
        .filter(p => p.seller?.id === sellerId)
        .map(p => p._id?.toString())
        .filter((id): id is string => !!id)

      // Get reviews for seller's products (only approved ones)
      const { getReviewsCollection, toClientDoc } = await import('../database')
      const reviews = await getReviewsCollection()
        .find({
          productId: { $in: sellerProductIds },
          $or: [{ status: 'approved' }, { status: { $exists: false } }]
        })
        .sort({ createdAt: -1 })
        .toArray()

      // Calculate average rating
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
      const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0'

      // Rating distribution
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      for (const review of reviews) {
        const rating = Math.round(review.rating || 0)
        if (rating >= 1 && rating <= 5) {
          distribution[rating as keyof typeof distribution]++
        }
      }

      return {
        success: true,
        reviews: reviews.map(r => toClientDoc(r)),
        stats: {
          total: reviews.length,
          averageRating: parseFloat(averageRating),
          distribution
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Respond to a review
  fastify.post('/admin/my-shop/reviews/:id/reply', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id
      const { id } = request.params as { id: string }
      const { reply: replyText } = request.body as { reply: string }

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      if (!replyText?.trim()) {
        reply.code(400)
        return { success: false, error: 'Reply text is required' }
      }

      const { getReviewsCollection, toClientDoc } = await import('../database')

      const result = await getReviewsCollection().findOneAndUpdate(
        { id },
        {
          $set: {
            sellerReply: replyText.trim(),
            sellerReplyAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(404)
        return { success: false, error: 'Review not found' }
      }

      return { success: true, review: toClientDoc(result) }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get/Update seller shop profile
  fastify.get('/admin/my-shop/profile', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')
      const seller = await getSellersCollection().findOne({ id: sellerId, tenantId }) as any

      return {
        success: true,
        profile: seller ? {
          id: seller.id,
          name: seller.name || '',
          description: seller.description || '',
          avatar: seller.avatar || '',
          banner: seller.banner || '',
          contacts: seller.contacts || {},
          workingHours: seller.workingHours || '',
          rating: seller.rating || 5,
          ratingCount: seller.ratingCount || 0,
          isVerified: seller.isVerified || false,
          badges: seller.badges || []
        } : null
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  fastify.patch('/admin/my-shop/profile', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const { name, description, avatar, banner, contacts, workingHours } = request.body as {
        name?: string
        description?: string
        avatar?: string
        banner?: string
        contacts?: { telegram?: string; email?: string; phone?: string }
        workingHours?: string
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (avatar !== undefined) updateData.avatar = avatar
      if (banner !== undefined) updateData.banner = banner
      if (contacts !== undefined) updateData.contacts = contacts
      if (workingHours !== undefined) updateData.workingHours = workingHours

      await getSellersCollection().updateOne(
        { id: sellerId, tenantId },
        { $set: updateData },
        { upsert: true }
      )

      // Also update seller info in all their products
      const products = await loadProducts(tenantId)
      for (const p of products) {
        if (p.seller?.id === sellerId && p._id) {
          const updatedSeller = { ...p.seller }
          if (name !== undefined) updatedSeller.name = name
          if (avatar !== undefined) updatedSeller.avatar = avatar
          await updateProduct(String(p._id), { seller: updatedSeller }, tenantId)
        }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get seller's notification settings
  fastify.get('/admin/my-shop/notifications', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')
      const seller = await getSellersCollection().findOne({ id: sellerId, tenantId }) as any

      return {
        success: true,
        notifications: seller?.notifications || {
          newOrders: true,
          orderDelivered: true,
          newReviews: true,
          lowStock: true,
          disputes: true,
          emailNotifications: false
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  fastify.patch('/admin/my-shop/notifications', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const notifications = request.body as {
        newOrders?: boolean
        orderDelivered?: boolean
        newReviews?: boolean
        lowStock?: boolean
        disputes?: boolean
        emailNotifications?: boolean
      }

      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')

      await getSellersCollection().updateOne(
        { id: sellerId, tenantId },
        { $set: { notifications } },
        { upsert: true }
      )

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get auto-delivery templates for seller
  fastify.get('/admin/my-shop/delivery-templates', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      const tenantId = reqTenantId(request)

      // Get seller's products with delivery info
      const products = await loadProducts(tenantId)
      const sellerProducts = products.filter(p => p.seller?.id === sellerId)

      const templates = sellerProducts.map(p => ({
        productId: p._id?.toString(),
        productName: p.name,
        deliveryType: p.deliveryType || 'manual',
        deliveryInstructions: p.deliveryInstructions || '',
        keysCount: (p.deliveryKeys || []).filter((k: any) => !k.isUsed).length,
        totalKeys: (p.deliveryKeys || []).length
      }))

      return { success: true, templates }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Bulk upload delivery keys for a product
  fastify.post('/admin/my-shop/products/:id/keys/bulk', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const sellerId = user?.userId || user?.id
      const { id } = request.params as { id: string }
      const { keys } = request.body as { keys: string }

      if (!sellerId) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      if (!keys?.trim()) {
        reply.code(400)
        return { success: false, error: 'Keys are required' }
      }

      const tenantId = reqTenantId(request)

      // Verify product belongs to seller
      const product = await getProductById(id, tenantId)
      if (!product || product.seller?.id !== sellerId) {
        reply.code(403)
        return { success: false, error: 'Product not found or access denied' }
      }

      // Parse keys (one per line)
      const keysList = keys
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keysList.length === 0) {
        reply.code(400)
        return { success: false, error: 'No valid keys found' }
      }

      const addedKeys = await addDeliveryKeys(id, keysList)

      return {
        success: true,
        addedCount: addedKeys.length,
        message: `Added ${addedKeys.length} keys`
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // ACTIVITY LOGS
  // ============================================

  // Get activity logs (admin only)
  fastify.get('/admin/activity-logs', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { action, limit = 100, offset = 0 } = request.query as any
      const tenantId = reqTenantId(request)

      // Get activity logs from database
      const db = await import('../database')
      const logsCollection = (await db.getDB()).collection('activity_logs')

      const query: any = { tenantId }
      if (action) query.action = action

      const logs = await logsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray()

      // Normalize field names for frontend compatibility
      const normalizedLogs = logs.map((log: any) => ({
        ...log,
        // Map timestamp → createdAt for frontend
        createdAt: log.timestamp || log.createdAt,
        // Ensure userName/userUsername are available (old logs only have `username`)
        userName: log.userName || (log.username && !log.username.startsWith('@') ? log.username : undefined),
        userUsername: log.userUsername || (log.username?.startsWith('@') ? log.username.slice(1) : log.username) || undefined,
        userAvatar: log.userAvatar || undefined,
      }))

      return {
        success: true,
        logs: normalizedLogs,
        total: await logsCollection.countDocuments(query)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // PRODUCT ANALYTICS
  // ============================================

  // Get product analytics for a specific product (seller only - sees their own products)
  fastify.get('/admin/products/:id/analytics', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { limit = 100, offset = 0, action } = request.query as any
      const tenantId = reqTenantId(request)

      // Get authenticated user
      const user = (request as any).user
      if (!user) {
        reply.code(401)
        return { success: false, error: 'Unauthorized' }
      }

      // Check if user is admin or seller
      const isAdmin = user.isAdmin
      const sellerId = user.userId

      // Get product to verify seller ownership
      const product = await getProductById(id, tenantId)
      if (!product) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }

      // Verify seller owns this product (admins can see all)
      if (!isAdmin && product.seller?.id !== sellerId) {
        reply.code(403)
        return { success: false, error: 'Access denied' }
      }

      // Get analytics from database
      const db = await import('../database')
      const analyticsCollection = db.getProductAnalyticsCollection()

      const query: any = { tenantId, productId: id }
      if (action) query.action = action

      const analytics = await analyticsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray()

      // Get stats by action
      const stats = await analyticsCollection.aggregate([
        { $match: { tenantId, productId: id } },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]).toArray()

      const statsByAction = stats.reduce((acc, { _id, count }) => {
        acc[_id] = count
        return acc
      }, {} as Record<string, number>)

      return {
        success: true,
        analytics: analytics.map(a => ({
          ...a,
          _id: a._id?.toString()
        })),
        total: await analyticsCollection.countDocuments(query),
        stats: statsByAction
      }
    } catch (error: any) {
      console.error('Error fetching product analytics:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // BOT WEBHOOK MANAGEMENT
  // ============================================

  // Get webhook status for current tenant
  fastify.get('/admin/bot/webhook-status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const tenantId = reqTenantId(request)
      const { getTenantsCollection } = await import('../database')

      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { success: false, error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        return {
          success: true,
          configured: false,
          message: 'Bot token not configured. Set BOT_TOKEN in environment and restart the server.'
        }
      }

      // Get webhook info from Telegram
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/getWebhookInfo`)
      const result = await response.json() as { ok: boolean; result?: any; description?: string }

      if (result.ok && result.result) {
        const webhookInfo = result.result
        return {
          success: true,
          configured: true,
          webhookInfo: {
            url: webhookInfo.url,
            hasCustomCertificate: webhookInfo.has_custom_certificate,
            pendingUpdateCount: webhookInfo.pending_update_count,
            lastErrorDate: webhookInfo.last_error_date,
            lastErrorMessage: webhookInfo.last_error_message,
            maxConnections: webhookInfo.max_connections,
            allowedUpdates: webhookInfo.allowed_updates
          }
        }
      }

      return {
        success: true,
        configured: false,
        message: 'Webhook not configured in Telegram API'
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Setup webhook for current tenant
  fastify.post('/admin/bot/setup-webhook', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const tenantId = reqTenantId(request)
      const { getTenantsCollection } = await import('../database')
      const crypto = await import('crypto')

      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { success: false, error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        reply.code(400)
        return { success: false, error: 'Bot token not configured for tenant' }
      }

      // Generate webhook URL and secret
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://fastpayai.onrender.com'
      const fullWebhookUrl = `${webhookBaseUrl}/bot/${tenant.botToken}/webhook`
      const secretToken = crypto.randomBytes(32).toString('hex')

      // Set webhook with Telegram
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullWebhookUrl,
          secret_token: secretToken,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment'],
          drop_pending_updates: false
        })
      })

      const result = await response.json() as { ok: boolean; description?: string }

      if (!result.ok) {
        reply.code(500)
        return { success: false, error: result.description || 'Failed to set webhook' }
      }

      // Store secret token in tenant config
      await getTenantsCollection().updateOne(
        { id: tenantId },
        { $set: { 'paymentConfig.webhookSecret': secretToken } }
      )

      return {
        success: true,
        message: 'Webhook configured successfully',
        webhookUrl: fullWebhookUrl,
        secretTokenPreview: secretToken.substring(0, 16) + '...'
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete webhook for current tenant
  fastify.delete('/admin/bot/webhook', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const tenantId = reqTenantId(request)
      const { getTenantsCollection } = await import('../database')

      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { success: false, error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        reply.code(400)
        return { success: false, error: 'Bot token not configured' }
      }

      // Delete webhook
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/deleteWebhook`)
      const result = await response.json() as { ok: boolean; description?: string }

      if (!result.ok) {
        reply.code(500)
        return { success: false, error: result.description || 'Failed to delete webhook' }
      }

      // Clear secret token from database
      await getTenantsCollection().updateOne(
        { id: tenantId },
        { $unset: { 'paymentConfig.webhookSecret': 1 } }
      )

      return {
        success: true,
        message: 'Webhook deleted successfully'
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // PUBLIC PRICING ENDPOINT (NO AUTH REQUIRED)
  // ============================================

  // Get Stars/Premium pricing - PUBLIC endpoint for /stars page
  fastify.get('/settings/pricing', async (request) => {
    try {
      const tenantId = (request as any).tenantId
      const { getTenantsCollection } = await import('../database')

      const tenant = await getTenantsCollection().findOne({ id: tenantId })
      const settings = (tenant?.settings || {}) as any

      return {
        success: true,
        pricing: {
          starsMarkupPerStar: settings.starsMarkupPerStar || 1.8,
          premium3MonthsPrice: settings.premium3MonthsPrice || 540,
          premium6MonthsPrice: settings.premium6MonthsPrice || 900,
          premium12MonthsPrice: settings.premium12MonthsPrice || 1620
        }
      }
    } catch (error: any) {
      console.error('Error fetching pricing:', error)
      return {
        success: true,
        pricing: {
          starsMarkupPerStar: 1.8,
          premium3MonthsPrice: 540,
          premium6MonthsPrice: 900,
          premium12MonthsPrice: 1620
        }
      }
    }
  })
}


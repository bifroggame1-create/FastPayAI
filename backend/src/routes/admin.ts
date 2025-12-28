import { FastifyInstance } from 'fastify'
import { adminMiddleware } from '../auth'
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
  addPromoCode,
  updatePromoCode,
  deletePromoCode,
  getOrdersWithFilters,
  countOrders,
  getOrderStats,
  getOrderById,
  updateOrder,
  Order,
  OrderStatus
} from '../dataStore'
import { createBackup, restoreFromBackup, getBackupStats, validateBackup } from '../backup'

declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
    promoCodes: any[]
  }
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
      const saved = await addProduct(newProduct as any)
      fastify.products.unshift(saved)
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
      const updated = await updateProduct(id, updates)
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }
      const index = fastify.products.findIndex(p => p._id === id)
      if (index !== -1) fastify.products[index] = updated
      return { success: true, product: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete product
  fastify.delete('/admin/products/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any
    const deleted = await deleteProduct(id)
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Product not found' }
    }
    const index = fastify.products.findIndex(p => p._id === id)
    if (index !== -1) fastify.products.splice(index, 1)
    return { success: true }
  })

  // ============================================
  // SELLERS MANAGEMENT
  // ============================================

  // Get all sellers
  fastify.get('/admin/sellers', { preHandler: adminMiddleware }, async () => {
    const sellers = [...new Map(fastify.products.map(p => [p.seller.id, p.seller])).values()]
    return { success: true, sellers }
  })

  // Create/update seller
  fastify.post('/admin/sellers', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const seller = validateBody(createSellerSchema, request.body)
      for (const p of fastify.products) {
        if (p.seller.id === seller.id) {
          p.seller = seller as any
          await updateProduct(p._id, { seller: seller as any })
        }
      }
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
      let updated = false
      for (const p of fastify.products) {
        if (p.seller.id === id) {
          p.seller = { ...p.seller, ...updates }
          await updateProduct(p._id, { seller: p.seller })
          updated = true
        }
      }
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Seller not found' }
      }
      return { success: true, seller: updates }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // ============================================
  // PROMO CODES MANAGEMENT
  // ============================================

  // Get all promo codes
  fastify.get('/admin/promo', { preHandler: adminMiddleware }, async () => {
    return { success: true, promoCodes: fastify.promoCodes }
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
      await addPromoCode(newPromo as any)
      fastify.promoCodes.push(newPromo)
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
      const updated = await updatePromoCode(code, updates)
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Promo code not found' }
      }
      const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
      if (index !== -1) fastify.promoCodes[index] = { ...fastify.promoCodes[index], ...updates }
      return { success: true, promo: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete promo code
  fastify.delete('/admin/promo/:code', { preHandler: adminMiddleware }, async (request, reply) => {
    const { code } = request.params as any
    const deleted = await deletePromoCode(code)
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Promo code not found' }
    }
    const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
    if (index !== -1) fastify.promoCodes.splice(index, 1)
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
        getOrdersWithFilters(filters, query.limit, query.offset),
        countOrders(filters)
      ])

      return {
        success: true,
        orders,
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
  fastify.get('/admin/orders/stats', { preHandler: adminMiddleware }, async () => {
    const stats = await getOrderStats()
    return { success: true, stats }
  })

  // Get single order
  fastify.get('/admin/orders/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any
    const order = await getOrderById(id)

    if (!order) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    return { success: true, order }
  })

  // Update order status
  fastify.put('/admin/orders/:id/status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { status } = validateBody(updateOrderStatusSchema, request.body)

      const updates: Partial<Order> = { status }
      if (status === 'delivered') {
        updates.deliveredAt = new Date().toISOString()
      }

      const updatedOrder = await updateOrder(id, updates)
      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

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

      const updatedOrder = await updateOrder(id, {
        status: 'delivered',
        deliveryData,
        deliveryNote,
        deliveredAt: new Date().toISOString()
      })

      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      console.log('Order delivered:', id, { deliveryData, deliveryNote })

      return { success: true, order: updatedOrder }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Cancel order
  fastify.post('/admin/orders/:id/cancel', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    const updatedOrder = await updateOrder(id, {
      status: 'cancelled'
    })

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    return { success: true, order: updatedOrder }
  })

  // Refund order
  fastify.post('/admin/orders/:id/refund', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    const updatedOrder = await updateOrder(id, {
      status: 'refunded'
    })

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

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
      return { success: true, restored: result.restored }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}

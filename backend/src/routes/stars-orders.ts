import { FastifyInstance, FastifyRequest } from 'fastify'
import { getStarsOrdersCollection, StarsOrder } from '../database'
import { sendStars, activatePremium, validateUsername, isFragmentApiConfigured } from '../fragment-api'
import { telegramStars, rubToStars } from '../telegram-stars'
import { cryptoBot } from '../cryptobot'
import { xRocket } from '../xrocket'
import { cactusPay } from '../cactuspay'
import { logger } from '../logger'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'fastpay'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return (request as any).tenantId || DEFAULT_TENANT_ID
}

export async function starsOrderRoutes(fastify: FastifyInstance) {
  // ============================================
  // CREATE STARS ORDER
  // ============================================

  fastify.post('/create-order', async (request, reply) => {
    try {
      const { username, stars, price, userId, userName, userUsername } = request.body as any

      if (!username || !stars || !price) {
        reply.code(400)
        return { success: false, error: 'Missing required fields: username, stars, price' }
      }

      if (stars < 50) {
        reply.code(400)
        return { success: false, error: 'Minimum amount is 50 stars' }
      }

      // Check if Fragment API is configured
      if (!isFragmentApiConfigured()) {
        reply.code(503)
        return {
          success: false,
          error: 'Stars service is temporarily unavailable. Please contact support.'
        }
      }

      // Generate order ID
      const orderId = `STARS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username

      // Create order in database
      const order: StarsOrder = {
        tenantId: reqTenantId(request),
        orderId,
        userId: userId || 'anonymous',
        userName,
        userUsername,
        type: 'stars',
        amount: stars,
        price,
        status: 'pending',
        username: cleanUsername,
        paymentMethod: 'telegram-stars', // Will be updated after payment method selected
        createdAt: new Date().toISOString()
      }

      await getStarsOrdersCollection().insertOne(order as any)

      logger.info({ orderId, username: cleanUsername, stars, price }, 'Stars order created')

      return {
        success: true,
        orderId,
        order: {
          orderId,
          type: 'stars',
          amount: stars,
          price,
          username: cleanUsername
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error creating Stars order')
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create Stars order'
      }
    }
  })

  // ============================================
  // CREATE PREMIUM ORDER
  // ============================================

  fastify.post('/create-premium-order', async (request, reply) => {
    try {
      const { username, months, price, userId, userName, userUsername } = request.body as any

      if (!username || !months || !price) {
        reply.code(400)
        return {
          success: false,
          error: 'Missing required fields: username, months, price'
        }
      }

      // Validate months (must be 3, 6, or 12)
      if (![3, 6, 12].includes(months)) {
        reply.code(400)
        return {
          success: false,
          error: 'Invalid subscription period. Must be 3, 6, or 12 months'
        }
      }

      // Check if Fragment API is configured
      if (!isFragmentApiConfigured()) {
        reply.code(503)
        return {
          success: false,
          error: 'Premium service is temporarily unavailable. Please contact support.'
        }
      }

      // Validate username exists
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username
      const validation = await validateUsername(cleanUsername)
      if (!validation.exists) {
        reply.code(400)
        return {
          success: false,
          error: `Username @${cleanUsername} not found on Telegram`
        }
      }

      // Generate order ID
      const orderId = `PREMIUM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create order in database
      const order: StarsOrder = {
        tenantId: reqTenantId(request),
        orderId,
        userId: userId || 'anonymous',
        userName,
        userUsername,
        type: 'premium',
        months,
        price,
        status: 'pending',
        username: cleanUsername,
        paymentMethod: 'telegram-stars', // Will be updated after payment method selected
        createdAt: new Date().toISOString()
      }

      await getStarsOrdersCollection().insertOne(order as any)

      logger.info({ orderId, username: cleanUsername, months, price }, 'Premium order created')

      return {
        success: true,
        orderId,
        order: {
          orderId,
          type: 'premium',
          months,
          price,
          username: cleanUsername
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error creating Premium order')
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create Premium order'
      }
    }
  })

  // ============================================
  // PROCESS PAYMENT (after payment confirmed)
  // ============================================

  fastify.post('/process-payment', async (request, reply) => {
    try {
      const { orderId, paymentId, paymentMethod } = request.body as any

      if (!orderId) {
        reply.code(400)
        return { success: false, error: 'Order ID required' }
      }

      // Find order
      const order = await getStarsOrdersCollection().findOne({
        tenantId: reqTenantId(request),
        orderId
      })

      if (!order) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // Check if already processed
      if (order.status === 'completed') {
        return {
          success: true,
          message: 'Order already processed',
          order
        }
      }

      if (order.status !== 'pending' && order.status !== 'paid') {
        reply.code(400)
        return {
          success: false,
          error: `Order cannot be processed in status: ${order.status}`
        }
      }

      // Update order status to processing
      await getStarsOrdersCollection().updateOne(
        { tenantId: reqTenantId(request), orderId },
        {
          $set: {
            status: 'processing',
            paymentId,
            paymentMethod: paymentMethod || order.paymentMethod,
            paidAt: new Date().toISOString()
          }
        }
      )

      logger.info({ orderId, type: order.type }, 'Processing Stars/Premium order')

      let result
      if (order.type === 'stars') {
        // Send Stars via Fragment API
        result = await sendStars(order.username, order.amount!)
      } else {
        // Activate Premium via Fragment API
        result = await activatePremium(order.username, order.months!)
      }

      if (result.success) {
        // Update order to completed
        await getStarsOrdersCollection().updateOne(
          { tenantId: reqTenantId(request), orderId },
          {
            $set: {
              status: 'completed',
              completedAt: new Date().toISOString(),
              fragmentOrderId: result.data?.orderId,
              fragmentTransactionHash: result.data?.transactionHash
            }
          }
        )

        logger.info({ orderId, type: order.type, fragmentOrderId: result.data?.orderId }, 'Stars/Premium order completed')

        return {
          success: true,
          message: order.type === 'stars'
            ? `${order.amount} Stars delivered to @${order.username}`
            : `Premium ${order.months} months activated for @${order.username}`,
          order: {
            ...order,
            status: 'completed',
            fragmentOrderId: result.data?.orderId
          }
        }
      } else {
        // Update order to failed
        await getStarsOrdersCollection().updateOne(
          { tenantId: reqTenantId(request), orderId },
          {
            $set: {
              status: 'failed',
              failedAt: new Date().toISOString(),
              errorMessage: result.error
            }
          }
        )

        logger.error({ orderId, error: result.error }, 'Stars/Premium order failed')

        reply.code(500)
        return {
          success: false,
          error: result.error || 'Failed to process order'
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error processing payment')
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to process payment'
      }
    }
  })

  // ============================================
  // GET ORDER STATUS
  // ============================================

  fastify.get('/order/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as any

      const order = await getStarsOrdersCollection().findOne({
        tenantId: reqTenantId(request),
        orderId
      })

      if (!order) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      return {
        success: true,
        order
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error fetching order')
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to fetch order'
      }
    }
  })

  // ============================================
  // GET USER ORDERS
  // ============================================

  fastify.get('/orders/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any

      const orders = await getStarsOrdersCollection()
        .find({ tenantId: reqTenantId(request), userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      return {
        success: true,
        orders
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error fetching user orders')
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to fetch orders'
      }
    }
  })

  logger.info('Stars orders routes registered')
}

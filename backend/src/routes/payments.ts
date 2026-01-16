import { FastifyInstance, FastifyRequest } from 'fastify'
import { cryptoBot, CryptoBotAPI } from '../cryptobot'
import { xRocket, XRocketAPI } from '../xrocket'
import { telegramStars, rubToStars } from '../telegram-stars'
import { fragmentAPI, getStarsPackagePrice, getPremiumPackagePrice } from '../fragment'
import { getSellerById } from '../dataStore'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'fastpay'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import { cactusPay, PaymentMethod } from '../cactuspay'
import { validateBody, createCryptoInvoiceSchema, createCactusPaymentSchema, createXRocketInvoiceSchema, createStarsInvoiceSchema, cancelPaymentSchema } from '../validation'
import { convertRubToCrypto, CryptoAsset, getExchangeRates, refreshExchangeRates } from '../cryptoConverter'
import { addOrder, updateOrder, getOrderById, Order, incrementPromoUsage, getProductById } from '../dataStore'
import { logActivity } from '../database'
import { processAutoDelivery } from '../delivery'
import { sendPaymentConfirmation, sendAdminNewOrderNotification } from '../email'
import { logger } from '../logger'
import {
  sendOrderNotification,
  sendPaymentNotification,
  sendDeliveryNotification as sendTelegramDeliveryNotification
} from '../telegramNotifier'
import { onOrderPaid, onOrderDelivered } from '../marketplace'

declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
  }
}

// Helper: Check if payment method is enabled for tenant
async function isPaymentMethodEnabled(tenantId: string, method: string): Promise<boolean> {
  try {
    const { getTenantsCollection } = await import('../database')
    const tenant = await getTenantsCollection().findOne({ id: tenantId }) as any

    // If no config, allow all methods (backward compatibility)
    if (!tenant || !tenant.paymentConfig || !tenant.paymentConfig.enabledMethods) {
      return true
    }

    return (tenant.paymentConfig.enabledMethods as string[]).includes(method)
  } catch (error) {
    console.error('Error checking payment method:', error)
    return true // Fail open for backward compatibility
  }
}

export async function paymentRoutes(fastify: FastifyInstance) {
  // ============================================
  // EXCHANGE RATES
  // ============================================

  // Get current exchange rates
  fastify.get('/payment/rates', async () => {
    const data = getExchangeRates()
    return {
      success: true,
      rates: data.rates,
      lastUpdate: data.lastUpdate
    }
  })

  // Force refresh exchange rates (admin only)
  fastify.post('/payment/rates/refresh', async (request, reply) => {
    try {
      const rates = await refreshExchangeRates()
      return {
        success: true,
        rates,
        message: 'Exchange rates refreshed'
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // DIAGNOSTICS - Check all payment providers
  // ============================================

  fastify.get('/payment/diagnostics', async (request, reply) => {
    const results: Record<string, any> = {}

    // Check CryptoBot
    try {
      const cryptoBotInfo = cryptoBot.getTokenInfo()
      if (cryptoBotInfo.configured) {
        const me = await cryptoBot.getMe()
        results.cryptobot = {
          status: 'ok',
          configured: true,
          appName: me.name,
          tokenPreview: cryptoBotInfo.preview
        }
      } else {
        results.cryptobot = {
          status: 'error',
          configured: false,
          error: 'Token not configured'
        }
      }
    } catch (error: any) {
      results.cryptobot = {
        status: 'error',
        configured: cryptoBot.getTokenInfo().configured,
        error: error.message
      }
    }

    // Check XRocket
    try {
      const xRocketInfo = xRocket.getTokenInfo()
      if (xRocketInfo.configured) {
        const appInfo = await xRocket.getAppInfo()
        results.xrocket = {
          status: 'ok',
          configured: true,
          appName: appInfo?.name,
          tokenPreview: xRocketInfo.preview
        }
      } else {
        results.xrocket = {
          status: 'error',
          configured: false,
          error: 'Token not configured'
        }
      }
    } catch (error: any) {
      results.xrocket = {
        status: 'error',
        configured: xRocket.getTokenInfo().configured,
        error: error.message
      }
    }

    // Check CactusPay
    try {
      const cactusInfo = cactusPay.getTokenInfo()
      results.cactuspay = {
        status: cactusInfo.configured ? 'ok' : 'not_configured',
        configured: cactusInfo.configured,
        tokenPreview: cactusInfo.preview
      }
    } catch (error: any) {
      results.cactuspay = {
        status: 'error',
        configured: false,
        error: error.message
      }
    }

    // Check Telegram Stars
    try {
      const starsInfo = telegramStars.getTokenInfo()
      results.telegram_stars = {
        status: starsInfo.configured ? 'ok' : 'not_configured',
        configured: starsInfo.configured,
        tokenPreview: starsInfo.preview
      }
    } catch (error: any) {
      results.telegram_stars = {
        status: 'error',
        configured: false,
        error: error.message
      }
    }

    // Check Redis (for idempotency)
    try {
      const { redis } = await import('../redis')
      const isConnected = redis.isEnabled()
      results.redis = {
        status: isConnected ? 'ok' : 'not_configured',
        connected: isConnected
      }
    } catch (error: any) {
      results.redis = {
        status: 'not_configured',
        connected: false,
        error: error.message
      }
    }

    // Check MongoDB
    try {
      const { getDB } = await import('../database')
      const db = getDB()
      await db.command({ ping: 1 })
      results.mongodb = { status: 'ok', connected: true }
    } catch (error: any) {
      results.mongodb = {
        status: 'error',
        connected: false,
        error: error.message
      }
    }

    // Summary
    const allOk = Object.values(results).every((r: any) => r.status === 'ok')
    const criticalOk = results.mongodb?.status === 'ok' &&
      (results.cryptobot?.status === 'ok' || results.xrocket?.status === 'ok' || results.cactuspay?.status === 'ok')

    return {
      success: allOk,
      critical: criticalOk,
      timestamp: new Date().toISOString(),
      providers: results
    }
  })

  // ============================================
  // CRYPTOBOT PAYMENTS
  // ============================================

  // Test CryptoBot connection
  fastify.get('/payment/test-cryptobot', async (request, reply) => {
    try {
      const tokenInfo = cryptoBot.getTokenInfo()
      console.log('Testing CryptoBot connection:', tokenInfo)

      if (!tokenInfo.configured) {
        return {
          success: false,
          error: 'CryptoBot token not configured',
          tokenInfo
        }
      }

      const result = await cryptoBot.getMe()
      return {
        success: true,
        data: result,
        tokenInfo
      }
    } catch (error: any) {
      console.error('CryptoBot test error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message,
        tokenInfo: cryptoBot.getTokenInfo()
      }
    }
  })

  // Create crypto invoice
  fastify.post('/payment/create-invoice', async (request, reply) => {
    try {
      const data = validateBody(createCryptoInvoiceSchema, request.body)
      const tenantId = reqTenantId(request)

      // Check if payment method is enabled
      if (!await isPaymentMethodEnabled(tenantId, 'cryptobot')) {
        reply.code(400)
        return { success: false, error: 'CryptoBot payment method is disabled' }
      }

      // Load product to get seller info
      const { loadProducts } = await import('../dataStore')
      const products = await loadProducts(tenantId)
      const product = products.find(p => p._id === data.productId)
      const variant = product?.variants?.find((v: any) => v.id === data.variantId)

      // Try to get seller's custom CryptoBot token
      let cryptoBotInstance = cryptoBot
      let usingSeller = false

      if (product?.seller?.id) {
        const seller = await getSellerById(product.seller.id, tenantId)
        if (seller?.paymentConfig?.cryptobotToken) {
          cryptoBotInstance = new CryptoBotAPI(seller.paymentConfig.cryptobotToken)
          usingSeller = true
          console.log(`Using seller's CryptoBot token for seller: ${product.seller.id}`)
        }
      }

      const tokenInfo = cryptoBotInstance.getTokenInfo()

      console.log('Creating crypto invoice:', { ...data, tokenInfo, usingSeller })

      if (!tokenInfo.configured) {
        reply.code(500)
        return {
          success: false,
          error: 'Payment system not configured',
          details: { tokenInfo }
        }
      }

      // Convert RUB to crypto
      const cryptoAmount = await convertRubToCrypto(data.amount, (data.asset || 'USDT') as CryptoAsset)

      const invoice = await cryptoBotInstance.createInvoice({
        amount: cryptoAmount.toString(),
        asset: data.asset || 'USDT',
        description: data.description || `Payment for ${product?.name || 'Product'}${variant ? ` - ${variant.name}` : ''}`,
        payload: JSON.stringify({
          productId: data.productId,
          variantId: data.variantId,
          userId: data.userId,
          userName: data.userName,
          userUsername: data.userUsername,
          originalAmount: data.amount
        })
      })

      // Create order
      const orderId = `CB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const order: Order = {
        tenantId: reqTenantId(request),
        id: orderId,
        oderId: String(invoice.invoice_id),
        userId: data.userId || 'anonymous',
        userName: data.userName,
        userUsername: data.userUsername,
        productId: data.productId,
        productName: product?.name || 'Unknown',
        variantId: data.variantId,
        variantName: variant?.name,
        amount: data.amount,
        paymentMethod: 'cryptobot',
        paymentId: String(invoice.invoice_id),
        status: 'pending',
        promoCode: data.promoCode, // Store promo code for increment after payment
        createdAt: new Date().toISOString(),
      }
      await addOrder(order, reqTenantId(request))
      console.log('Order created:', orderId)

      // Log activity
      await logActivity({
        tenantId: reqTenantId(request),
        userId: data.userId || 'anonymous',
        username: data.userUsername ? `@${data.userUsername}` : data.userName,
        action: 'order_created',
        productId: data.productId,
        productName: product?.name || 'Unknown',
        metadata: { orderId, amount: data.amount, paymentMethod: 'cryptobot' }
      })

      return {
        success: true,
        invoice: {
          id: invoice.invoice_id,
          hash: invoice.hash,
          payUrl: invoice.bot_invoice_url,
          amount: invoice.amount,
          asset: invoice.asset,
          status: invoice.status,
        },
        orderId
      }
    } catch (error: any) {
      const tokenInfo = cryptoBot.getTokenInfo()

      console.error('❌ Error creating invoice:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
        tokenInfo
      })

      if (!tokenInfo.configured || error.message?.includes('token')) {
        reply.code(500)
        return {
          success: false,
          error: 'Payment system not configured.',
          details: {
            tokenInfo,
            originalError: error.message
          }
        }
      }

      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create invoice',
        details: error.response?.data
      }
    }
  })

  // Get invoice status
  fastify.get('/payment/invoice/:invoiceId', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const result = await cryptoBot.getInvoices({ invoice_ids: String(invoiceId) })

      if (!result || !result.items || result.items.length === 0) {
        reply.code(404)
        return { success: false, error: 'Invoice not found' }
      }

      return { success: true, invoice: result.items[0] }
    } catch (error: any) {
      console.error('Error getting invoice:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get CryptoBot balance
  fastify.get('/payment/balance', async (request, reply) => {
    try {
      const balance = await cryptoBot.getBalance()
      return { success: true, balance }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // CryptoBot webhook
  fastify.post('/payment/webhook', {
    config: {
      rawBody: true
    }
  }, async (request, reply) => {
    try {
      const signature = request.headers['crypto-pay-api-signature'] as string
      const rawBody = (request as any).rawBody || JSON.stringify(request.body)

      // Verify signature
      if (signature && !cryptoBot.verifyWebhookSignature(signature, rawBody)) {
        console.error('Invalid webhook signature')
        reply.code(401)
        return { error: 'Invalid signature' }
      }

      const { update_type, payload } = request.body as any

      console.log('CryptoBot webhook received:', {
        update_type,
        invoice_id: payload?.invoice_id,
        status: payload?.status,
        amount: payload?.amount,
        asset: payload?.asset
      })

      if (update_type === 'invoice_paid' && payload) {
        logger.info({
          invoiceId: payload.invoice_id,
          amount: payload.amount,
          asset: payload.asset,
          paidAt: payload.paid_at,
        }, 'CryptoBot payment confirmed')

        // IDEMPOTENCY: Check if webhook already processed
        const webhookId = `cryptobot:${payload.invoice_id}:${payload.paid_at}`
        const { redis } = await import('../redis')
        const alreadyProcessed = await redis.get(`webhook:${webhookId}`)

        if (alreadyProcessed) {
          logger.info({ webhookId }, 'Webhook already processed (idempotency check)')
          return { success: true, status: 'already_processed' }
        }

        // Mark webhook as processing (with 24h TTL to prevent reprocessing)
        await redis.setex(`webhook:${webhookId}`, 86400, 'processing')

        // Parse custom payload
        let customPayload: any = {}
        try {
          customPayload = JSON.parse(payload.payload || '{}')
        } catch (e) {
          logger.warn({ payload: payload.payload }, 'Failed to parse webhook payload')
        }

        // Find order by payment ID (invoice_id)
        const paymentId = String(payload.invoice_id)
        let order = await getOrderById(customPayload.orderId)

        if (!order) {
          // Try to find by payment ID
          const orders = await import('../dataStore')
          const allOrders = await orders.loadOrders()
          order = allOrders.find(o => o.paymentId === paymentId) || null
        }

        if (!order) {
          logger.warn({ paymentId }, 'Order not found for payment')
          return { success: true }
        }

        // SECURITY: Check if order already processed (prevent duplicate delivery)
        if (order.status === 'paid' || order.status === 'delivered') {
          logger.info({ orderId: order.id, status: order.status }, 'Order already processed, skipping')
          // Mark webhook as successfully processed
          await redis.setex(`webhook:${webhookId}`, 86400, 'completed')
          return { success: true, status: 'already_paid' }
        }

        // Update order status to paid
        const updatedOrder = await updateOrder(order.id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
        })

        if (updatedOrder) {
          logger.info({ orderId: order.id }, 'Order marked as paid')

          // Log activity
          await logActivity({
            tenantId: order.tenantId || DEFAULT_TENANT_ID,
            userId: order.userId || 'anonymous',
            username: order.userUsername ? `@${order.userUsername}` : order.userName,
            action: 'payment_completed',
            productId: order.productId,
            productName: order.productName,
            metadata: { orderId: order.id, amount: order.amount, paymentMethod: 'cryptobot' }
          })

          // Marketplace: Create escrow transaction
          try {
            await onOrderPaid(order.id)
            logger.info({ orderId: order.id }, 'Escrow transaction created')
          } catch (escrowError) {
            logger.warn({ orderId: order.id, error: escrowError }, 'Failed to create escrow transaction')
          }

          // Send Telegram notifications
          try {
            // Notify user about payment confirmation
            await sendPaymentNotification(updatedOrder)

            // Notify admins about new paid order
            await sendOrderNotification(updatedOrder)
          } catch (notifyError) {
            logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram notifications')
          }

          // Increment promo code usage after successful payment
          if (updatedOrder.promoCode) {
            try {
              await incrementPromoUsage(updatedOrder.promoCode)
              logger.info({ orderId: order.id, promoCode: updatedOrder.promoCode }, 'Promo code usage incremented')
            } catch (promoError) {
              logger.warn({ orderId: order.id, promoCode: updatedOrder.promoCode, error: promoError }, 'Failed to increment promo usage')
            }
          }

          // Process auto-delivery
          const deliveryResult = await processAutoDelivery(updatedOrder)

          if (deliveryResult.success) {
            logger.info({
              orderId: order.id,
              delivered: true
            }, 'Auto-delivery successful')

            // Log delivery activity
            await logActivity({
              tenantId: order.tenantId || DEFAULT_TENANT_ID,
              userId: order.userId || 'anonymous',
              username: order.userUsername ? `@${order.userUsername}` : order.userName,
              action: 'order_delivered',
              productId: order.productId,
              productName: order.productName,
              metadata: { orderId: order.id }
            })

            // Marketplace: Update seller stats on delivery
            try {
              await onOrderDelivered(order.id)
              logger.info({ orderId: order.id }, 'Seller stats updated for delivery')
            } catch (statsError) {
              logger.warn({ orderId: order.id, error: statsError }, 'Failed to update seller stats')
            }

            // Send Telegram delivery notification
            try {
              await sendTelegramDeliveryNotification(updatedOrder)
            } catch (notifyError) {
              logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram delivery notification')
            }
          } else {
            logger.info({
              orderId: order.id,
              reason: deliveryResult.error
            }, 'Auto-delivery not performed')

            // Send admin notification for manual delivery
            await sendAdminNewOrderNotification({
              orderNumber: order.id,
              productName: order.productName,
              amount: order.amount,
              userName: order.userName || 'Unknown',
              paymentMethod: order.paymentMethod
            })
          }
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Webhook error:', error)
      reply.code(500)
      return { error: error.message }
    }
  })

  // ============================================
  // CRYPTOBOT CHECKS
  // ============================================

  // Create a crypto check (gift link)
  fastify.post('/payment/create-check', async (request, reply) => {
    try {
      const { asset, amount, pin_to_user_id, pin_to_username } = request.body as any

      if (!asset || !amount) {
        reply.code(400)
        return { success: false, error: 'asset and amount are required' }
      }

      const check = await cryptoBot.createCheck({
        asset,
        amount,
        pin_to_user_id,
        pin_to_username
      })

      return { success: true, check }
    } catch (error: any) {
      console.error('Create check error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get checks list
  fastify.get('/payment/checks', async (request, reply) => {
    try {
      const { asset, status } = request.query as any
      const checks = await cryptoBot.getChecks({ asset, status })
      return { success: true, checks: checks.items || [] }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete a check
  fastify.delete('/payment/check/:checkId', async (request, reply) => {
    try {
      const { checkId } = request.params as any
      await cryptoBot.deleteCheck(Number(checkId))
      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // CRYPTOBOT TRANSFERS
  // ============================================

  // Transfer crypto to a user
  fastify.post('/payment/transfer', async (request, reply) => {
    try {
      const { user_id, asset, amount, spend_id, comment } = request.body as any

      if (!user_id || !asset || !amount || !spend_id) {
        reply.code(400)
        return { success: false, error: 'user_id, asset, amount, and spend_id are required' }
      }

      const transfer = await cryptoBot.transfer({
        user_id: Number(user_id),
        asset,
        amount,
        spend_id,
        comment
      })

      return { success: true, transfer }
    } catch (error: any) {
      console.error('Transfer error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get transfers list
  fastify.get('/payment/transfers', async (request, reply) => {
    try {
      const { asset } = request.query as any
      const transfers = await cryptoBot.getTransfers({ asset })
      return { success: true, transfers: transfers.items || [] }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // XROCKET PAYMENTS
  // ============================================

  // Test XRocket connection
  fastify.get('/payment/test-xrocket', async (request, reply) => {
    try {
      const tokenInfo = xRocket.getTokenInfo()
      console.log('Testing XRocket connection:', tokenInfo)

      if (!tokenInfo.configured) {
        return {
          success: false,
          error: 'XRocket token not configured',
          tokenInfo
        }
      }

      const result = await xRocket.getAppInfo()
      return {
        success: true,
        data: result,
        tokenInfo
      }
    } catch (error: any) {
      console.error('XRocket test error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message,
        tokenInfo: xRocket.getTokenInfo()
      }
    }
  })

  // Create XRocket invoice
  fastify.post('/payment/xrocket/create-invoice', async (request, reply) => {
    try {
      const data = validateBody(createXRocketInvoiceSchema, request.body)
      const tenantId = reqTenantId(request)

      // Check if payment method is enabled
      if (!await isPaymentMethodEnabled(tenantId, 'xrocket')) {
        reply.code(400)
        return { success: false, error: 'xRocket payment method is disabled' }
      }

      const { loadProducts } = await import('../dataStore')
      const products = await loadProducts(tenantId)
      const product = products.find(p => p._id === data.productId)
      const variant = product?.variants?.find((v: any) => v.id === data.variantId)

      // Try to get seller's custom XRocket API key
      let xRocketInstance = xRocket
      let usingSeller = false

      if (product?.seller?.id) {
        const seller = await getSellerById(product.seller.id, tenantId)
        if (seller?.paymentConfig?.xrocketApiKey) {
          xRocketInstance = new XRocketAPI(seller.paymentConfig.xrocketApiKey)
          usingSeller = true
          console.log(`Using seller's XRocket API key for seller: ${product.seller.id}`)
        }
      }

      const tokenInfo = xRocketInstance.getTokenInfo()

      console.log('Creating XRocket invoice:', { ...data, tokenInfo, usingSeller })

      if (!tokenInfo.configured) {
        reply.code(500)
        return {
          success: false,
          error: 'XRocket payment system not configured',
          details: { tokenInfo }
        }
      }

      // Generate order ID
      const orderId = `XR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Convert RUB to crypto
      const cryptoAmount = await convertRubToCrypto(data.amount, (data.currency || 'TONCOIN') as CryptoAsset)

      const invoice = await xRocketInstance.createInvoice({
        amount: Number(cryptoAmount),
        currency: data.currency || 'TONCOIN',
        description: data.description || `Payment for ${product?.name || 'Product'}${variant ? ` - ${variant.name}` : ''}`,
        callbackUrl: `${process.env.WEBHOOK_BASE_URL || 'https://fastpayai.onrender.com'}/payment/xrocket/webhook`,
        payload: JSON.stringify({
          orderId,
          productId: data.productId,
          variantId: data.variantId,
          userId: data.userId,
          userName: data.userName,
          userUsername: data.userUsername,
          originalAmount: data.amount
        })
      })

      // Create order
      const order: Order = {
        tenantId: reqTenantId(request),
        id: orderId,
        oderId: String(invoice.id),
        userId: data.userId || 'anonymous',
        userName: data.userName,
        userUsername: data.userUsername,
        productId: data.productId,
        productName: product?.name || 'Unknown',
        variantId: data.variantId,
        variantName: variant?.name,
        amount: data.amount,
        paymentMethod: 'xrocket',
        paymentId: String(invoice.id),
        status: 'pending',
        promoCode: data.promoCode,
        createdAt: new Date().toISOString(),
      }
      await addOrder(order, reqTenantId(request))
      console.log('XRocket order created:', orderId)

      // Log activity
      await logActivity({
        tenantId: reqTenantId(request),
        userId: data.userId || 'anonymous',
        username: data.userUsername ? `@${data.userUsername}` : data.userName,
        action: 'order_created',
        productId: data.productId,
        productName: product?.name || 'Unknown',
        metadata: { orderId, amount: data.amount, paymentMethod: 'xrocket' }
      })

      return {
        success: true,
        invoice: {
          id: invoice.id,
          payUrl: invoice.link,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
        },
        orderId
      }
    } catch (error: any) {
      console.error('❌ Error creating XRocket invoice:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create XRocket invoice'
      }
    }
  })

  // Get XRocket invoice status
  fastify.get('/payment/xrocket/invoice/:invoiceId', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const invoice = await xRocket.getInvoice(Number(invoiceId))

      return { success: true, invoice }
    } catch (error: any) {
      console.error('Error getting XRocket invoice:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get XRocket invoices list
  fastify.get('/payment/xrocket/invoices', async (request, reply) => {
    try {
      const { limit, offset } = request.query as any
      const invoices = await xRocket.getInvoices({ limit: Number(limit) || 100, offset: Number(offset) || 0 })
      return { success: true, invoices }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // XRocket webhook
  fastify.post('/payment/xrocket/webhook', {
    config: {
      rawBody: true
    }
  }, async (request, reply) => {
    try {
      const signature = request.headers['rocket-pay-signature'] as string
      const rawBody = (request as any).rawBody || JSON.stringify(request.body)

      // Verify signature if provided
      if (signature && !xRocket.verifyWebhookSignature(signature, rawBody)) {
        console.error('Invalid XRocket webhook signature')
        reply.code(401)
        return { error: 'Invalid signature' }
      }

      const webhookData = request.body as any

      console.log('XRocket webhook received:', webhookData)

      // Handle invoice paid event
      if (webhookData.status === 'paid' || webhookData.type === 'invoice_paid') {
        const payload = webhookData.payload ? JSON.parse(webhookData.payload) : {}
        const invoiceId = webhookData.id || webhookData.invoice_id

        logger.info({
          invoiceId,
          amount: webhookData.amount,
          currency: webhookData.currency,
        }, 'XRocket payment confirmed')

        // IDEMPOTENCY - Check if webhook already processed
        const webhookTimestamp = webhookData.created_at || Date.now()
        const webhookId = `xrocket:${invoiceId}:${webhookTimestamp}`
        const { redis } = await import('../redis')
        const alreadyProcessed = await redis.get(`webhook:${webhookId}`)

        if (alreadyProcessed) {
          logger.info({ webhookId }, 'XRocket webhook already processed (idempotency check)')
          return { success: true, status: 'already_processed' }
        }

        // Mark webhook as processing (with 24h TTL to prevent reprocessing)
        await redis.setex(`webhook:${webhookId}`, 86400, 'processing')

        // Find order
        let order = await getOrderById(payload.orderId)

        if (!order) {
          const orders = await import('../dataStore')
          const allOrders = await orders.loadOrders()
          order = allOrders.find(o => o.paymentId === String(invoiceId)) || null
        }

        if (!order) {
          logger.warn({ invoiceId }, 'Order not found for XRocket payment')
          return { success: true }
        }

        // SECURITY: Check if order already processed
        if (order.status === 'paid' || order.status === 'delivered') {
          logger.info({ orderId: order.id, status: order.status }, 'Order already processed, skipping')
          await redis.setex(`webhook:${webhookId}`, 86400, 'completed')
          return { success: true, status: 'already_paid' }
        }

        // Update order status to paid
        const updatedOrder = await updateOrder(order.id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
        })

        if (updatedOrder) {
          logger.info({ orderId: order.id }, 'XRocket order marked as paid')

          // Log activity
          await logActivity({
            tenantId: order.tenantId || DEFAULT_TENANT_ID,
            userId: order.userId || 'anonymous',
            username: order.userUsername ? `@${order.userUsername}` : order.userName,
            action: 'payment_completed',
            productId: order.productId,
            productName: order.productName,
            metadata: { orderId: order.id, amount: order.amount, paymentMethod: 'xrocket' }
          })

          // Marketplace: Create escrow transaction
          try {
            await onOrderPaid(order.id)
          } catch (escrowError) {
            logger.warn({ orderId: order.id, error: escrowError }, 'Failed to create escrow transaction')
          }

          // Send Telegram notifications
          try {
            await sendPaymentNotification(updatedOrder)
            await sendOrderNotification(updatedOrder)
          } catch (notifyError) {
            logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram notifications')
          }

          // Increment promo code usage
          if (updatedOrder.promoCode) {
            try {
              await incrementPromoUsage(updatedOrder.promoCode)
            } catch (promoError) {
              logger.warn({ orderId: order.id, error: promoError }, 'Failed to increment promo usage')
            }
          }

          // Process auto-delivery
          const deliveryResult = await processAutoDelivery(updatedOrder)

          if (deliveryResult.success) {
            logger.info({ orderId: order.id }, 'XRocket auto-delivery successful')

            // Log delivery activity
            await logActivity({
              tenantId: order.tenantId || DEFAULT_TENANT_ID,
              userId: order.userId || 'anonymous',
              username: order.userUsername ? `@${order.userUsername}` : order.userName,
              action: 'order_delivered',
              productId: order.productId,
              productName: order.productName,
              metadata: { orderId: order.id }
            })

            try {
              await onOrderDelivered(order.id)
            } catch (statsError) {
              logger.warn({ orderId: order.id, error: statsError }, 'Failed to update seller stats')
            }

            try {
              await sendTelegramDeliveryNotification(updatedOrder)
            } catch (notifyError) {
              logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram delivery notification')
            }
          } else {
            await sendAdminNewOrderNotification({
              orderNumber: order.id,
              productName: order.productName,
              amount: order.amount,
              userName: order.userName || 'Unknown',
              paymentMethod: order.paymentMethod
            })
          }
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('XRocket webhook error:', error)
      reply.code(500)
      return { error: error.message }
    }
  })

  // ============================================
  // XROCKET TRANSFERS
  // ============================================

  // Transfer crypto to a user via XRocket
  fastify.post('/payment/xrocket/transfer', async (request, reply) => {
    try {
      const { tgUserId, currency, amount, transferId, description } = request.body as any

      if (!tgUserId || !currency || !amount || !transferId) {
        reply.code(400)
        return { success: false, error: 'tgUserId, currency, amount, and transferId are required' }
      }

      const transfer = await xRocket.transfer({
        tgUserId: Number(tgUserId),
        currency,
        amount: Number(amount),
        transferId,
        description
      })

      return { success: true, transfer }
    } catch (error: any) {
      console.error('XRocket transfer error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get XRocket transfers list
  fastify.get('/payment/xrocket/transfers', async (request, reply) => {
    try {
      const { limit, offset } = request.query as any
      const transfers = await xRocket.getTransfers({ limit: Number(limit) || 100, offset: Number(offset) || 0 })
      return { success: true, transfers }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // XROCKET MULTI-CHEQUES (similar to CryptoBot checks)
  // ============================================

  // Create multi-cheque
  fastify.post('/payment/xrocket/create-cheque', async (request, reply) => {
    try {
      const { currency, chequePerUser, usersNumber, password, description } = request.body as any

      if (!currency || !chequePerUser || !usersNumber) {
        reply.code(400)
        return { success: false, error: 'currency, chequePerUser, and usersNumber are required' }
      }

      const cheque = await xRocket.createMultiCheque({
        currency,
        chequePerUser: Number(chequePerUser),
        usersNumber: Number(usersNumber),
        password,
        description
      })

      return { success: true, cheque }
    } catch (error: any) {
      console.error('Create XRocket cheque error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get multi-cheques list
  fastify.get('/payment/xrocket/cheques', async (request, reply) => {
    try {
      const { limit, offset } = request.query as any
      const cheques = await xRocket.getMultiCheques({ limit: Number(limit) || 100, offset: Number(offset) || 0 })
      return { success: true, cheques }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get single multi-cheque
  fastify.get('/payment/xrocket/cheque/:chequeId', async (request, reply) => {
    try {
      const { chequeId } = request.params as any
      const cheque = await xRocket.getMultiCheque(Number(chequeId))
      return { success: true, cheque }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete multi-cheque
  fastify.delete('/payment/xrocket/cheque/:chequeId', async (request, reply) => {
    try {
      const { chequeId } = request.params as any
      await xRocket.deleteMultiCheque(Number(chequeId))
      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // XROCKET COINS INFO
  // ============================================

  // Get available coins
  fastify.get('/payment/xrocket/coins', async (request, reply) => {
    try {
      const coins = await xRocket.getCoins()
      return { success: true, coins }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // TELEGRAM STARS PAYMENTS
  // ============================================

  // Test Telegram Stars connection
  fastify.get('/payment/test-stars', async (request, reply) => {
    try {
      const tokenInfo = telegramStars.getTokenInfo()
      console.log('Testing Telegram Stars connection:', tokenInfo)

      if (!tokenInfo.configured) {
        return {
          success: false,
          error: 'BOT_TOKEN not configured for Telegram Stars',
          tokenInfo
        }
      }

      return {
        success: true,
        message: 'Telegram Stars configured',
        tokenInfo
      }
    } catch (error: any) {
      console.error('Telegram Stars test error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message,
        tokenInfo: telegramStars.getTokenInfo()
      }
    }
  })

  // Create Telegram Stars invoice link
  fastify.post('/payment/stars/create-invoice', async (request, reply) => {
    try {
      const data = validateBody(createStarsInvoiceSchema, request.body)
      const tenantId = reqTenantId(request)

      // Check if payment method is enabled
      if (!await isPaymentMethodEnabled(tenantId, 'telegram-stars')) {
        reply.code(400)
        return { success: false, error: 'Telegram Stars payment method is disabled' }
      }

      const tokenInfo = telegramStars.getTokenInfo()

      console.log('Creating Telegram Stars invoice:', { ...data, tokenInfo })

      if (!tokenInfo.configured) {
        reply.code(500)
        return {
          success: false,
          error: 'Telegram Stars not configured',
          details: { tokenInfo }
        }
      }

      const { loadProducts } = await import('../dataStore')
      const products = await loadProducts(reqTenantId(request))
      const product = products.find(p => p._id === data.productId)
      const variant = product?.variants?.find((v: any) => v.id === data.variantId)

      // Generate order ID
      const orderId = `STARS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Convert RUB to Stars
      const starsAmount = rubToStars(data.amount)

      const invoiceLink = await telegramStars.createInvoiceLink({
        title: product?.name || 'Товар',
        description: data.description || `${product?.name || 'Product'}${variant ? ` - ${variant.name}` : ''}`,
        payload: JSON.stringify({
          orderId,
          productId: data.productId,
          variantId: data.variantId,
          userId: data.userId,
          userName: data.userName,
          userUsername: data.userUsername,
          originalAmount: data.amount,
          tenantId: reqTenantId(request)
        }),
        prices: [{ label: product?.name || 'Товар', amount: starsAmount }]
      })

      // Create order
      const order: Order = {
        tenantId: reqTenantId(request),
        id: orderId,
        oderId: orderId,
        userId: data.userId || 'anonymous',
        userName: data.userName,
        userUsername: data.userUsername,
        productId: data.productId,
        productName: product?.name || 'Unknown',
        variantId: data.variantId,
        variantName: variant?.name,
        amount: data.amount,
        paymentMethod: 'telegram-stars',
        paymentId: orderId,
        status: 'pending',
        promoCode: data.promoCode,
        createdAt: new Date().toISOString(),
      }
      await addOrder(order, reqTenantId(request))
      console.log('Telegram Stars order created:', orderId)

      return {
        success: true,
        invoice: {
          payUrl: invoiceLink,
          starsAmount,
          originalAmount: data.amount,
        },
        orderId
      }
    } catch (error: any) {
      console.error('❌ Error creating Telegram Stars invoice:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create Telegram Stars invoice'
      }
    }
  })

  // Telegram Stars webhook (handles pre_checkout_query and successful_payment)
  fastify.post('/payment/stars/webhook', async (request, reply) => {
    try {
      const update = request.body as any

      console.log('Telegram Stars webhook received:', update)

      // Handle pre_checkout_query - must respond within 10 seconds
      if (update.pre_checkout_query) {
        const query = update.pre_checkout_query
        logger.info({ queryId: query.id, payload: query.invoice_payload }, 'Pre-checkout query received')

        // Validate the order
        try {
          const payload = JSON.parse(query.invoice_payload)
          const order = await getOrderById(payload.orderId)

          if (!order) {
            await telegramStars.answerPreCheckoutQuery(query.id, false, 'Заказ не найден')
            return { success: true }
          }

          if (order.status !== 'pending') {
            await telegramStars.answerPreCheckoutQuery(query.id, false, 'Заказ уже обработан')
            return { success: true }
          }

          // Approve the checkout
          await telegramStars.answerPreCheckoutQuery(query.id, true)
        } catch (e) {
          await telegramStars.answerPreCheckoutQuery(query.id, false, 'Ошибка обработки заказа')
        }

        return { success: true }
      }

      // Handle successful_payment
      if (update.message?.successful_payment) {
        const payment = update.message.successful_payment
        logger.info({
          chargeId: payment.telegram_payment_charge_id,
          amount: payment.total_amount,
          currency: payment.currency,
        }, 'Telegram Stars payment successful')

        let payload: any = {}
        try {
          payload = JSON.parse(payment.invoice_payload)
        } catch (e) {
          logger.warn({ payload: payment.invoice_payload }, 'Failed to parse payment payload')
        }

        // Find order
        let order = await getOrderById(payload.orderId)

        if (!order) {
          logger.warn({ orderId: payload.orderId }, 'Order not found for Stars payment')
          return { success: true }
        }

        // SECURITY: Check if order already processed
        if (order.status === 'paid' || order.status === 'delivered') {
          logger.info({ orderId: order.id, status: order.status }, 'Order already processed, skipping')
          return { success: true }
        }

        // Update order status to paid
        const updatedOrder = await updateOrder(order.id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
          paymentId: payment.telegram_payment_charge_id,
        })

        if (updatedOrder) {
          logger.info({ orderId: order.id }, 'Telegram Stars order marked as paid')

          // Marketplace: Create escrow transaction
          try {
            await onOrderPaid(order.id)
          } catch (escrowError) {
            logger.warn({ orderId: order.id, error: escrowError }, 'Failed to create escrow transaction')
          }

          // Send Telegram notifications
          try {
            await sendPaymentNotification(updatedOrder)
            await sendOrderNotification(updatedOrder)
          } catch (notifyError) {
            logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram notifications')
          }

          // Increment promo code usage
          if (updatedOrder.promoCode) {
            try {
              await incrementPromoUsage(updatedOrder.promoCode)
            } catch (promoError) {
              logger.warn({ orderId: order.id, error: promoError }, 'Failed to increment promo usage')
            }
          }

          // Process auto-delivery
          const deliveryResult = await processAutoDelivery(updatedOrder)

          if (deliveryResult.success) {
            logger.info({ orderId: order.id }, 'Telegram Stars auto-delivery successful')

            try {
              await onOrderDelivered(order.id)
            } catch (statsError) {
              logger.warn({ orderId: order.id, error: statsError }, 'Failed to update seller stats')
            }

            try {
              await sendTelegramDeliveryNotification(updatedOrder)
            } catch (notifyError) {
              logger.warn({ orderId: order.id, error: notifyError }, 'Failed to send Telegram delivery notification')
            }
          } else {
            await sendAdminNewOrderNotification({
              orderNumber: order.id,
              productName: order.productName,
              amount: order.amount,
              userName: order.userName || 'Unknown',
              paymentMethod: order.paymentMethod
            })
          }
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Telegram Stars webhook error:', error)
      reply.code(500)
      return { error: error.message }
    }
  })

  // Get Stars transactions
  fastify.get('/payment/stars/transactions', async (request, reply) => {
    try {
      const { limit, offset } = request.query as any
      const transactions = await telegramStars.getStarTransactions(Number(offset) || 0, Number(limit) || 100)
      return { success: true, transactions }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Refund Stars payment
  fastify.post('/payment/stars/refund', async (request, reply) => {
    try {
      const { userId, telegramPaymentChargeId } = request.body as any

      if (!userId || !telegramPaymentChargeId) {
        reply.code(400)
        return { success: false, error: 'userId and telegramPaymentChargeId are required' }
      }

      await telegramStars.refundStarPayment(Number(userId), telegramPaymentChargeId)
      return { success: true, message: 'Refund processed' }
    } catch (error: any) {
      console.error('Stars refund error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // CACTUSPAY PAYMENTS
  // ============================================

  // Test CactusPay connection
  fastify.get('/payment/test-cactuspay', async (request, reply) => {
    try {
      const tokenInfo = cactusPay.getTokenInfo()
      console.log('Testing CactusPay connection:', tokenInfo)

      if (!tokenInfo.configured) {
        return {
          success: false,
          error: 'CactusPay token not configured',
          tokenInfo
        }
      }

      // CactusPay doesn't have a getBalance method, just verify token is configured
      return {
        success: true,
        message: 'CactusPay token configured',
        tokenInfo
      }
    } catch (error: any) {
      console.error('CactusPay test error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message,
        tokenInfo: cactusPay.getTokenInfo()
      }
    }
  })

  // Create CactusPay payment
  fastify.post('/payment/cactuspay/create', async (request, reply) => {
    try {
      const data = validateBody(createCactusPaymentSchema, request.body)
      const tenantId = reqTenantId(request)

      // Check if payment method is enabled (method can be 'sbp' or 'card')
      const methodKey = data.method === 'sbp' ? 'cactuspay-sbp' : 'cactuspay-card'
      if (!await isPaymentMethodEnabled(tenantId, methodKey)) {
        reply.code(400)
        return { success: false, error: `CactusPay ${data.method} payment method is disabled` }
      }

      const tokenInfo = cactusPay.getTokenInfo()

      console.log('Creating CactusPay payment:', { ...data, tokenInfo })

      if (!tokenInfo.configured) {
        reply.code(500)
        return {
          success: false,
          error: 'Payment system not configured',
          details: { tokenInfo }
        }
      }

      const product = await getProductById(data.productId, reqTenantId(request))
      const variant = product?.variants?.find((v: any) => v.id === data.variantId)

      // Generate order ID
      const orderId = `CP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Map method
      let paymentMethod: PaymentMethod = 'sbp'
      if (data.method === 'card') paymentMethod = 'card'
      else if (data.method === 'sbp') paymentMethod = 'sbp'
      else if (data.method === 'yoomoney') paymentMethod = 'yoomoney'
      else if (data.method === 'crypto') paymentMethod = 'crypto'
      else if (data.method === 'nspk') paymentMethod = 'nspk'

      const paymentMethodType = `cactuspay-${paymentMethod}`

      const result = await cactusPay.createPayment({
        order_id: orderId,
        amount: data.amount,
        method: paymentMethod,
        description: data.description || `${product?.name || 'Product'}${variant ? ` - ${variant.name}` : ''}`,
        user_ip: data.userIp || '127.0.0.1'
      })

      if (result.status === 'success' && result.response) {
        // Create order
        const order: Order = {
          tenantId: reqTenantId(request),
          id: orderId,
          oderId: orderId,
          userId: data.userId || 'anonymous',
          userName: data.userName,
          userUsername: data.userUsername,
          productId: data.productId,
          productName: product?.name || 'Unknown',
          variantId: data.variantId,
          variantName: variant?.name,
          amount: data.amount,
          paymentMethod: paymentMethodType as any,
          paymentId: orderId,
          status: 'pending',
          promoCode: data.promoCode, // Store promo code for increment after payment
          createdAt: new Date().toISOString(),
        }
        await addOrder(order, reqTenantId(request))
        console.log('Order created:', orderId)

        return {
          success: true,
          payment: {
            orderId: orderId,
            payUrl: result.response.url,
            amount: data.amount,
            requisite: result.response.requisite,
          }
        }
      } else {
        throw new Error('Failed to create payment')
      }
    } catch (error: any) {
      console.error('CactusPay create payment error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create payment'
      }
    }
  })

  // Get CactusPay payment status
  fastify.get('/payment/cactuspay/status/:orderId', async (request, reply) => {
    try {
      const { orderId } = request.params as any

      if (!orderId) {
        reply.code(400)
        return { success: false, error: 'Order ID required' }
      }

      const result = await cactusPay.getPaymentStatus(orderId)

      return {
        success: true,
        payment: {
          orderId,
          status: result.response?.status || 'unknown',
          amount: result.response?.amount
        }
      }
    } catch (error: any) {
      console.error('CactusPay status error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to get payment status'
      }
    }
  })

  // CactusPay webhook
  fastify.post('/payment/cactuspay/webhook', async (request, reply) => {
    try {
      const { id, order_id, status, amount } = request.body as any

      logger.info({
        id,
        order_id,
        status,
        amount
      }, 'CactusPay webhook received')

      if (!order_id) {
        logger.warn('CactusPay webhook: missing order_id')
        return { success: true }
      }

      // IDEMPOTENCY - Check if webhook already processed (check BEFORE expensive operations)
      const webhookId = `cactuspay:${order_id}:${id}`
      const { redis } = await import('../redis')
      const alreadyProcessed = await redis.get(`webhook:${webhookId}`)

      if (alreadyProcessed) {
        logger.info({ webhookId }, 'CactusPay webhook already processed (idempotency check)')
        return { success: true, status: 'already_processed' }
      }

      // Mark webhook as processing (with 24h TTL to prevent reprocessing)
      await redis.setex(`webhook:${webhookId}`, 86400, 'processing')

      // Get order first to check if already processed
      const existingOrder = await getOrderById(order_id)
      if (!existingOrder) {
        logger.warn({ orderId: order_id }, 'Order not found')
        return { success: true }
      }

      // SECURITY: Check if order already processed (prevent duplicate delivery)
      if (existingOrder.status === 'paid' || existingOrder.status === 'delivered') {
        logger.info({ orderId: order_id, status: existingOrder.status }, 'Order already processed, skipping')
        await redis.setex(`webhook:${webhookId}`, 86400, 'completed')
        return { success: true, status: 'already_paid' }
      }

      // SECURITY: Verify payment status via CactusPay API (don't trust webhook data)
      const statusResult = await cactusPay.getPaymentStatus(order_id)

      if (statusResult.response?.status !== 'ACCEPT') {
        logger.warn({ orderId: order_id, apiStatus: statusResult.response?.status }, 'Payment not confirmed by API')
        return { success: true }
      }

      // SECURITY: Verify amount matches
      const paidAmount = parseFloat(statusResult.response.amount)
      if (Math.abs(paidAmount - existingOrder.amount) > 1) { // Allow 1 RUB tolerance
        logger.error({
          orderId: order_id,
          expectedAmount: existingOrder.amount,
          paidAmount
        }, 'SECURITY: Amount mismatch detected!')
        return { success: false, error: 'Amount mismatch' }
      }

      logger.info({
        orderId: order_id,
        amount: statusResult.response.amount,
        cactusPayId: id
      }, 'CactusPay payment confirmed')

      // Update order status to paid
      const updatedOrder = await updateOrder(order_id, {
        status: 'paid',
        paymentId: String(id),
        paidAt: new Date().toISOString()
      })

      if (updatedOrder) {
        logger.info({ orderId: updatedOrder.id }, 'Order marked as paid')

        // Marketplace: Create escrow transaction
        try {
          await onOrderPaid(order_id)
          logger.info({ orderId: order_id }, 'Escrow transaction created')
        } catch (escrowError) {
          logger.warn({ orderId: order_id, error: escrowError }, 'Failed to create escrow transaction')
        }

        // Send Telegram notifications
        try {
          // Notify user about payment confirmation
          await sendPaymentNotification(updatedOrder)

          // Notify admins about new paid order
          await sendOrderNotification(updatedOrder)
        } catch (notifyError) {
          logger.warn({ orderId: updatedOrder.id, error: notifyError }, 'Failed to send Telegram notifications')
        }

        // Increment promo code usage after successful payment
        if (updatedOrder.promoCode) {
          try {
            await incrementPromoUsage(updatedOrder.promoCode)
            logger.info({ orderId: updatedOrder.id, promoCode: updatedOrder.promoCode }, 'Promo code usage incremented')
          } catch (promoError) {
            logger.warn({ orderId: updatedOrder.id, promoCode: updatedOrder.promoCode, error: promoError }, 'Failed to increment promo usage')
          }
        }

        // Process auto-delivery
        const deliveryResult = await processAutoDelivery(updatedOrder)

        if (deliveryResult.success) {
          logger.info({
            orderId: updatedOrder.id,
            delivered: true
          }, 'Auto-delivery successful')

          // Marketplace: Update seller stats on delivery
          try {
            await onOrderDelivered(updatedOrder.id)
            logger.info({ orderId: updatedOrder.id }, 'Seller stats updated for delivery')
          } catch (statsError) {
            logger.warn({ orderId: updatedOrder.id, error: statsError }, 'Failed to update seller stats')
          }

          // Send Telegram delivery notification
          try {
            await sendTelegramDeliveryNotification(updatedOrder)
          } catch (notifyError) {
            logger.warn({ orderId: updatedOrder.id, error: notifyError }, 'Failed to send Telegram delivery notification')
          }
        } else {
          logger.info({
            orderId: updatedOrder.id,
            reason: deliveryResult.error
          }, 'Auto-delivery not performed')

          // Send admin notification for manual delivery
          await sendAdminNewOrderNotification({
            orderNumber: updatedOrder.id,
            productName: updatedOrder.productName,
            amount: updatedOrder.amount,
            userName: updatedOrder.userName || 'Unknown',
            paymentMethod: updatedOrder.paymentMethod
          })
        }
      }

      return { success: true }
    } catch (error: any) {
      logger.error({ err: error }, 'CactusPay webhook error')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Cancel CactusPay payment
  fastify.post('/payment/cactuspay/cancel', async (request, reply) => {
    try {
      const { orderId } = validateBody(cancelPaymentSchema, request.body)

      const result = await cactusPay.cancelDetails(orderId)

      return {
        success: result.status === 'success',
        message: result.status === 'success' ? 'Payment cancelled' : 'Failed to cancel'
      }
    } catch (error: any) {
      console.error('CactusPay cancel error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to cancel payment'
      }
    }
  })

  // ============================================
  // FRAGMENT STARS RESELLING
  // ============================================

  // Check Fragment API status
  fastify.get('/payment/fragment/status', async (request, reply) => {
    const status = fragmentAPI.getConfigStatus()
    return {
      success: true,
      ...status
    }
  })

  // Create invoice for buying Stars via Fragment
  // User pays with Telegram Bot Payments, we buy from Fragment and send to them
  fastify.post('/api/stars/create-invoice', async (request, reply) => {
    try {
      const { username, stars, price, userId } = request.body as any

      if (!username || !stars || !price) {
        reply.code(400)
        return { success: false, error: 'Missing required fields: username, stars, price' }
      }

      if (stars < 50) {
        reply.code(400)
        return { success: false, error: 'Minimum amount is 50 stars' }
      }

      // Check if Fragment API is configured
      if (!fragmentAPI.isConfigured()) {
        reply.code(503)
        return {
          success: false,
          error: 'Fragment API is not configured. Please contact administrator.'
        }
      }

      // Check if Telegram Bot is configured
      if (!telegramStars.isConfigured()) {
        reply.code(503)
        return {
          success: false,
          error: 'Telegram Bot is not configured. Please contact administrator.'
        }
      }

      // Create Telegram Stars invoice for user to pay
      const invoiceLink = await telegramStars.createInvoiceLink({
        title: `${stars} Telegram Stars`,
        description: `Purchase ${stars} ⭐ Stars for @${username.replace('@', '')}`,
        payload: JSON.stringify({
          type: 'stars_resell',
          username: username.replace('@', ''),
          stars,
          userId,
          timestamp: Date.now()
        }),
        prices: [{ label: 'Stars', amount: rubToStars(price) }] // Convert RUB to Stars for payment
      })

      return {
        success: true,
        invoiceUrl: invoiceLink,
        stars,
        price
      }
    } catch (error: any) {
      console.error('Fragment Stars invoice creation error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create invoice'
      }
    }
  })

  // Webhook handler for Fragment Stars reselling
  // This is called after user pays the Stars invoice
  fastify.post('/api/stars/webhook', async (request, reply) => {
    try {
      const update = request.body as any
      console.log('Fragment Stars webhook received:', update)

      // Handle successful payment
      if (update.message && update.message.successful_payment) {
        const payment = update.message.successful_payment
        const payload = JSON.parse(payment.invoice_payload)

        if (payload.type === 'stars_resell') {
          const { username, stars } = payload

          console.log(`Processing Fragment Stars purchase: ${stars} stars for @${username}`)

          // Buy Stars from Fragment and send to user
          const result = await fragmentAPI.buyStars({
            username: username.startsWith('@') ? username : `@${username}`,
            quantity: stars
          })

          if (result.success) {
            console.log(`✅ Successfully sent ${stars} stars to @${username}`)

            // Send confirmation message to user
            const chatId = update.message.chat.id
            try {
              await telegramStars['makeRequest']('sendMessage', {
                chat_id: chatId,
                text: `✅ ${stars} ⭐ Stars delivered to @${username}!\n\nOrder ID: ${result.data?.orderId || 'N/A'}`,
                parse_mode: 'HTML'
              })
            } catch (msgError) {
              console.error('Failed to send confirmation message:', msgError)
            }

            return { success: true, message: 'Stars delivered successfully' }
          } else {
            console.error(`❌ Failed to send stars: ${result.error}`)

            // Refund the payment
            try {
              await telegramStars.refundStarPayment(
                update.message.from.id,
                payment.telegram_payment_charge_id
              )
              console.log('✅ Payment refunded')
            } catch (refundError) {
              console.error('Failed to refund payment:', refundError)
            }

            return {
              success: false,
              error: result.error || 'Failed to deliver stars'
            }
          }
        }
      }

      // Handle pre-checkout query
      if (update.pre_checkout_query) {
        const preCheckoutQuery = update.pre_checkout_query
        const payload = JSON.parse(preCheckoutQuery.invoice_payload)

        if (payload.type === 'stars_resell') {
          // Validate before accepting payment
          if (!fragmentAPI.isConfigured()) {
            await telegramStars.answerPreCheckoutQuery(
              preCheckoutQuery.id,
              false,
              'Service temporarily unavailable'
            )
            return { success: false, error: 'Fragment API not configured' }
          }

          // Accept the payment
          await telegramStars.answerPreCheckoutQuery(preCheckoutQuery.id, true)
          return { success: true, message: 'Pre-checkout accepted' }
        }
      }

      return { success: true, message: 'Webhook processed' }
    } catch (error: any) {
      console.error('Fragment Stars webhook error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Webhook processing failed'
      }
    }
  })

  // Get Stars package prices
  fastify.get('/api/stars/packages', async (request, reply) => {
    const packages = [
      { id: '50', amount: 50, price: getStarsPackagePrice(50) },
      { id: '100', amount: 100, price: getStarsPackagePrice(100) },
      { id: '500', amount: 500, price: getStarsPackagePrice(500) },
      { id: '1000', amount: 1000, price: getStarsPackagePrice(1000) },
      { id: '2500', amount: 2500, price: getStarsPackagePrice(2500) }
    ]

    return {
      success: true,
      packages,
      configured: fragmentAPI.isConfigured()
    }
  })

  // =============================================================================
  // Premium Subscription Endpoints (Fragment API Integration)
  // =============================================================================

  // Create invoice for buying Premium via Fragment
  fastify.post('/api/premium/create-invoice', async (request, reply) => {
    try {
      const { username, months, price, userId } = request.body as any

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
      if (!fragmentAPI.isConfigured()) {
        reply.code(503)
        return {
          success: false,
          error: 'Premium service is temporarily unavailable. Fragment API not configured.'
        }
      }

      // Validate username with Fragment API
      try {
        const validation = await fragmentAPI.validateUsername(username)
        if (!validation.exists) {
          reply.code(400)
          return {
            success: false,
            error: `Username @${username} not found on Telegram`
          }
        }
      } catch (error: any) {
        console.error('Username validation error:', error)
        reply.code(400)
        return {
          success: false,
          error: 'Failed to validate username. Please check and try again.'
        }
      }

      // Create Telegram Stars invoice for user to pay
      const invoiceLink = await telegramStars.createInvoiceLink({
        title: `Telegram Premium ${months} months`,
        description: `Premium subscription for ${months} months for @${username.replace('@', '')}`,
        payload: JSON.stringify({
          type: 'premium_resell',
          username: username.replace('@', ''),
          months,
          userId
        }),
        prices: [{ label: 'Premium Subscription', amount: rubToStars(price) }]
      })

      console.log('Premium invoice created:', { username, months, price, invoiceLink })

      return {
        success: true,
        invoiceUrl: invoiceLink,
        months,
        price
      }
    } catch (error: any) {
      console.error('Premium invoice creation error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Failed to create Premium invoice'
      }
    }
  })

  // Webhook handler for Premium subscriptions
  fastify.post('/api/premium/webhook', async (request, reply) => {
    try {
      const update = request.body as any
      console.log('Premium webhook received:', update)

      // Handle successful payment
      if (update.message && update.message.successful_payment) {
        const payment = update.message.successful_payment
        const payload = JSON.parse(payment.invoice_payload)

        if (payload.type === 'premium_resell') {
          const { username, months } = payload

          console.log(`Processing Premium purchase: ${months} months for @${username}`)

          // Buy Premium from Fragment and send to user
          const result = await fragmentAPI.buyPremium({
            username: username.startsWith('@') ? username : `@${username}`,
            months
          })

          if (result.success) {
            console.log(`✅ Successfully sent ${months} months Premium to @${username}`)

            // Send confirmation message to user
            const chatId = update.message.chat.id
            try {
              await telegramStars['makeRequest']('sendMessage', {
                chat_id: chatId,
                text: `✅ Telegram Premium ${months} months delivered to @${username}!\n\nOrder ID: ${result.data?.orderId || 'N/A'}`,
                parse_mode: 'HTML'
              })
            } catch (msgError) {
              console.error('Failed to send confirmation message:', msgError)
            }

            return { success: true, message: 'Premium delivered successfully' }
          } else {
            console.error(`❌ Failed to send Premium: ${result.error}`)

            // Refund the payment
            try {
              await telegramStars.refundStarPayment(
                update.message.from.id,
                payment.telegram_payment_charge_id
              )
              console.log('✅ Payment refunded')
            } catch (refundError) {
              console.error('Failed to refund payment:', refundError)
            }

            return {
              success: false,
              error: result.error || 'Failed to deliver Premium'
            }
          }
        }
      }

      // Handle pre-checkout query
      if (update.pre_checkout_query) {
        const preCheckoutQuery = update.pre_checkout_query
        const payload = JSON.parse(preCheckoutQuery.invoice_payload)

        if (payload.type === 'premium_resell') {
          // Validate before accepting payment
          if (!fragmentAPI.isConfigured()) {
            await telegramStars.answerPreCheckoutQuery(
              preCheckoutQuery.id,
              false,
              'Service temporarily unavailable'
            )
            return { success: false, error: 'Fragment API not configured' }
          }

          // Accept the payment
          await telegramStars.answerPreCheckoutQuery(preCheckoutQuery.id, true)
          return { success: true, message: 'Pre-checkout accepted' }
        }
      }

      return { success: true, message: 'Webhook processed' }
    } catch (error: any) {
      console.error('Premium webhook error:', error)
      reply.code(500)
      return {
        success: false,
        error: error.message || 'Webhook processing failed'
      }
    }
  })

  // Get Premium package prices
  fastify.get('/api/premium/packages', async (request, reply) => {
    const packages = [
      { id: 'premium-3', months: 3, price: getPremiumPackagePrice(3) },
      { id: 'premium-6', months: 6, price: getPremiumPackagePrice(6) },
      { id: 'premium-12', months: 12, price: getPremiumPackagePrice(12) }
    ]

    return {
      success: true,
      packages,
      configured: fragmentAPI.isConfigured()
    }
  })
}

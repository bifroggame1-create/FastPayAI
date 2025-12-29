import { FastifyInstance } from 'fastify'
import { cryptoBot } from '../cryptobot'
import { cactusPay, PaymentMethod } from '../cactuspay'
import { validateBody, createCryptoInvoiceSchema, createCactusPaymentSchema, cancelPaymentSchema } from '../validation'
import { convertRubToCrypto, CryptoAsset, getExchangeRates, refreshExchangeRates } from '../cryptoConverter'
import { addOrder, updateOrder, getOrderById, Order, incrementPromoUsage } from '../dataStore'
import { processAutoDelivery } from '../delivery'
import { sendPaymentConfirmation, sendAdminNewOrderNotification } from '../email'
import { logger } from '../logger'

declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
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
      const tokenInfo = cryptoBot.getTokenInfo()

      console.log('Creating crypto invoice:', { ...data, tokenInfo })

      if (!tokenInfo.configured) {
        reply.code(500)
        return {
          success: false,
          error: 'Payment system not configured',
          details: { tokenInfo }
        }
      }

      const product = fastify.products.find(p => p._id === data.productId)
      const variant = product?.variants?.find((v: any) => v.id === data.variantId)

      // Convert RUB to crypto
      const cryptoAmount = await convertRubToCrypto(data.amount, (data.asset || 'USDT') as CryptoAsset)

      const invoice = await cryptoBot.createInvoice({
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
      await addOrder(order)
      console.log('Order created:', orderId)

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
          return { success: true }
        }

        // Update order status to paid
        const updatedOrder = await updateOrder(order.id, {
          status: 'paid',
          paidAt: new Date().toISOString(),
        })

        if (updatedOrder) {
          logger.info({ orderId: order.id }, 'Order marked as paid')

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

      const product = fastify.products.find(p => p._id === data.productId)
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
        await addOrder(order)
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

      // Get order first to check if already processed
      const existingOrder = await getOrderById(order_id)
      if (!existingOrder) {
        logger.warn({ orderId: order_id }, 'Order not found')
        return { success: true }
      }

      // SECURITY: Check if order already processed (prevent duplicate delivery)
      if (existingOrder.status === 'paid' || existingOrder.status === 'delivered') {
        logger.info({ orderId: order_id, status: existingOrder.status }, 'Order already processed, skipping')
        return { success: true }
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
}

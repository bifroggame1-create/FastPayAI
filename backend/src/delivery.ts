import { logger } from './logger'
import { getProductsCollection, getOrdersCollection, DeliveryKey, Product, Order } from './database'
import { sendDeliveryNotification, sendAdminNewOrderNotification } from './email'

/**
 * Get an available delivery key for a product
 */
export async function getAvailableKey(
  productId: string,
  variantId?: string
): Promise<DeliveryKey | null> {
  const products = getProductsCollection()

  const product = await products.findOne({ _id: productId })
  if (!product || !product.deliveryKeys || product.deliveryKeys.length === 0) {
    return null
  }

  // Find first unused key (optionally matching variantId)
  const availableKey = product.deliveryKeys.find(key => {
    if (key.isUsed) return false
    if (variantId && key.variantId && key.variantId !== variantId) return false
    return true
  })

  return availableKey || null
}

/**
 * Mark a key as used
 */
export async function markKeyAsUsed(
  productId: string,
  keyId: string,
  orderId: string
): Promise<boolean> {
  const products = getProductsCollection()

  const result = await products.updateOne(
    { _id: productId, 'deliveryKeys.id': keyId },
    {
      $set: {
        'deliveryKeys.$.isUsed': true,
        'deliveryKeys.$.usedByOrderId': orderId,
        'deliveryKeys.$.usedAt': new Date().toISOString()
      }
    }
  )

  return result.modifiedCount > 0
}

/**
 * Count available keys for a product
 */
export async function countAvailableKeys(
  productId: string,
  variantId?: string
): Promise<number> {
  const products = getProductsCollection()

  const product = await products.findOne({ _id: productId })
  if (!product || !product.deliveryKeys) return 0

  return product.deliveryKeys.filter(key => {
    if (key.isUsed) return false
    if (variantId && key.variantId && key.variantId !== variantId) return false
    return true
  }).length
}

/**
 * Add delivery keys to a product
 */
export async function addDeliveryKeys(
  productId: string,
  keys: string[],
  variantId?: string
): Promise<DeliveryKey[]> {
  const products = getProductsCollection()

  const newKeys: DeliveryKey[] = keys.map(key => ({
    id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    key: key.trim(),
    variantId,
    isUsed: false,
    addedAt: new Date().toISOString()
  }))

  await products.updateOne(
    { _id: productId },
    { $push: { deliveryKeys: { $each: newKeys } } }
  )

  return newKeys
}

/**
 * Remove a delivery key from a product
 */
export async function removeDeliveryKey(
  productId: string,
  keyId: string
): Promise<boolean> {
  const products = getProductsCollection()

  const result = await products.updateOne(
    { _id: productId },
    { $pull: { deliveryKeys: { id: keyId } } }
  )

  return result.modifiedCount > 0
}

/**
 * Process auto-delivery for an order
 * Returns the delivery data if successful, null if failed
 */
export async function processAutoDelivery(
  order: Order
): Promise<{ success: boolean; deliveryData?: string; error?: string }> {
  const products = getProductsCollection()
  const orders = getOrdersCollection()

  try {
    // Get product
    const product = await products.findOne({ _id: order.productId })

    if (!product) {
      logger.warn({ orderId: order.id }, 'Product not found for auto-delivery')
      return { success: false, error: 'Product not found' }
    }

    // Check if auto-delivery is enabled
    if (product.deliveryType !== 'auto') {
      logger.info({ orderId: order.id, productId: order.productId }, 'Manual delivery required')
      return { success: false, error: 'Manual delivery required' }
    }

    // Get available key
    const key = await getAvailableKey(order.productId, order.variantId)

    if (!key) {
      logger.warn({ orderId: order.id, productId: order.productId }, 'No available keys for auto-delivery')

      // Notify admin about out of stock
      await sendAdminNewOrderNotification({
        orderNumber: order.id,
        productName: order.productName,
        amount: order.amount,
        userName: order.userName || 'Unknown',
        paymentMethod: `${order.paymentMethod} (KEYS OUT OF STOCK!)`
      })

      return { success: false, error: 'No keys available' }
    }

    // Mark key as used
    const marked = await markKeyAsUsed(order.productId, key.id, order.id)

    if (!marked) {
      logger.error({ orderId: order.id, keyId: key.id }, 'Failed to mark key as used')
      return { success: false, error: 'Failed to reserve key' }
    }

    // Build delivery data
    let deliveryData = key.key
    if (product.deliveryInstructions) {
      deliveryData = `${key.key}\n\n${product.deliveryInstructions}`
    }

    // Update order with delivery data
    await orders.updateOne(
      { id: order.id },
      {
        $set: {
          status: 'delivered',
          deliveryData,
          deliveredAt: new Date().toISOString()
        }
      }
    )

    logger.info({
      orderId: order.id,
      productId: order.productId,
      keyId: key.id
    }, 'Auto-delivery completed')

    // Check remaining keys and update stock if needed
    const remainingKeys = await countAvailableKeys(order.productId, order.variantId)
    if (remainingKeys === 0) {
      await products.updateOne(
        { _id: order.productId },
        { $set: { inStock: false } }
      )
      logger.warn({ productId: order.productId }, 'Product out of stock')
    }

    return { success: true, deliveryData }

  } catch (error: any) {
    logger.error({ err: error, orderId: order.id }, 'Auto-delivery failed')
    return { success: false, error: error.message }
  }
}

/**
 * Get delivery stats for a product
 */
export async function getDeliveryStats(productId: string): Promise<{
  total: number
  used: number
  available: number
}> {
  const products = getProductsCollection()

  const product = await products.findOne({ _id: productId })
  if (!product || !product.deliveryKeys) {
    return { total: 0, used: 0, available: 0 }
  }

  const total = product.deliveryKeys.length
  const used = product.deliveryKeys.filter(k => k.isUsed).length

  return {
    total,
    used,
    available: total - used
  }
}

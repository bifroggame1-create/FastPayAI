import { FastifyInstance } from 'fastify'
import { validateBody, validatePromoSchema } from '../validation'
import { getPromoByCode, incrementPromoUsage } from '../dataStore'

declare module 'fastify' {
  interface FastifyInstance {
    promoCodes: any[]
  }
}

export async function promoRoutes(fastify: FastifyInstance) {
  // Validate promo code
  fastify.post('/promo/validate', async (request) => {
    try {
      const { code, orderAmount } = validateBody(validatePromoSchema, request.body)

      const promo = await getPromoByCode(code)

      if (!promo) {
        return { valid: false, error: 'Промокод не найден' }
      }

      if (!promo.isActive) {
        return { valid: false, error: 'Промокод неактивен' }
      }

      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        return { valid: false, error: 'Промокод истёк' }
      }

      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return { valid: false, error: 'Промокод исчерпан' }
      }

      if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
        return { valid: false, error: `Минимальная сумма заказа: ${promo.minOrderAmount}₽` }
      }

      // Calculate discount
      let discount = 0
      if (promo.discountType === 'percentage') {
        discount = Math.round(orderAmount * (promo.discountValue / 100))
      } else {
        discount = Math.min(promo.discountValue, orderAmount)
      }

      // Increment usage
      await incrementPromoUsage(code)

      return {
        valid: true,
        discount,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        description: promo.description
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.error || error.message
      }
    }
  })

  // Get active promo codes (public)
  fastify.get('/promo/active', async () => {
    const activePromos = fastify.promoCodes.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date()))
    return activePromos.map(p => ({
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minOrderAmount: p.minOrderAmount
    }))
  })
}

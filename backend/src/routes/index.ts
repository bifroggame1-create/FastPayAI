import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth'
import { productRoutes } from './products'
import { adminRoutes } from './admin'
import { paymentRoutes } from './payments'
import { userRoutes } from './users'
import { promoRoutes } from './promo'
import { chatRoutes } from './chats'
import { healthRoutes } from './health'
import { analyticsRoutes } from './analytics'
import { referralRoutes } from './referral'
import { reviewRoutes } from './reviews'
import { notificationRoutes } from './notifications'
import { tagsRoutes } from './tags'
import { fileRoutes } from './files'
import { marketplaceRoutes } from './marketplace'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(authRoutes)
  await fastify.register(productRoutes)
  await fastify.register(adminRoutes)
  await fastify.register(paymentRoutes)
  await fastify.register(userRoutes)
  await fastify.register(promoRoutes)
  await fastify.register(chatRoutes)
  await fastify.register(healthRoutes)
  await fastify.register(analyticsRoutes)
  await fastify.register(referralRoutes)
  await fastify.register(reviewRoutes)
  await fastify.register(notificationRoutes)
  await fastify.register(tagsRoutes)
  await fastify.register(fileRoutes)
  await fastify.register(marketplaceRoutes)

  console.log('All routes registered')
}

export {
  authRoutes,
  productRoutes,
  adminRoutes,
  paymentRoutes,
  userRoutes,
  promoRoutes,
  chatRoutes,
  healthRoutes,
  analyticsRoutes,
  referralRoutes,
  reviewRoutes,
  notificationRoutes,
  tagsRoutes,
  fileRoutes,
  marketplaceRoutes
}

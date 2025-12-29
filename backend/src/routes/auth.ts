import { FastifyInstance } from 'fastify'
import {
  validateTelegramWebAppData,
  generateToken,
  authMiddleware,
  JWTPayload
} from '../auth'
import { validateBody, telegramAuthSchema } from '../validation'

export async function authRoutes(fastify: FastifyInstance) {
  // Telegram WebApp authentication
  fastify.post('/auth/telegram', async (request, reply) => {
    try {
      const { initData } = validateBody(telegramAuthSchema, request.body)

      const user = validateTelegramWebAppData(initData)
      if (!user) {
        // In development, allow mock auth
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Telegram validation failed, using mock auth (dev only)')
          const mockToken = generateToken({
            id: 123456789,
            first_name: 'Dev',
            username: 'devuser'
          })
          return {
            success: true,
            token: mockToken,
            user: {
              id: '123456789',
              name: 'Dev User',
              username: 'devuser',
              isAdmin: false
            }
          }
        }

        reply.code(401)
        return { success: false, error: 'Invalid Telegram data' }
      }

      const token = generateToken(user)

      // Check if user is admin
      const ADMIN_IDS = (process.env.ADMIN_IDS || '1301598469').split(',').map(id => id.trim())
      const isAdmin = ADMIN_IDS.includes(String(user.id))

      console.log('🔐 Auth:', { userId: user.id, username: user.username, isAdmin, adminIds: ADMIN_IDS })

      return {
        success: true,
        token,
        user: {
          id: String(user.id),
          name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
          username: user.username,
          avatar: user.photo_url,
          isAdmin
        }
      }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Verify token
  fastify.get('/auth/verify', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload
    return {
      success: true,
      user: {
        id: user.userId,
        username: user.username,
        isAdmin: user.isAdmin
      }
    }
  })
}

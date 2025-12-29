import { FastifyInstance } from 'fastify'
import {
  validateTelegramWebAppData,
  generateToken,
  authMiddleware,
  JWTPayload
} from '../auth'
import { validateBody, telegramAuthSchema } from '../validation'

// Bootstrap admin IDs - can authenticate even without BOT_TOKEN
const BOOTSTRAP_ADMIN_IDS = (process.env.ADMIN_IDS || '1301598469').split(',').map(id => id.trim())

// Try to extract user from initData without cryptographic validation (for bootstrap admins fallback)
function extractUserFromInitData(initData: string): { id: number; first_name: string; last_name?: string; username?: string } | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const userJson = urlParams.get('user')
    if (userJson) {
      return JSON.parse(userJson)
    }
  } catch (e) {
    // ignore
  }
  return null
}

export async function authRoutes(fastify: FastifyInstance) {
  // Telegram WebApp authentication
  fastify.post('/auth/telegram', async (request, reply) => {
    try {
      const { initData } = validateBody(telegramAuthSchema, request.body)

      let user = validateTelegramWebAppData(initData)

      // If validation failed, try fallback for bootstrap admins
      if (!user) {
        const extractedUser = extractUserFromInitData(initData)

        // Allow bootstrap admins to authenticate even without BOT_TOKEN validation
        if (extractedUser && BOOTSTRAP_ADMIN_IDS.includes(String(extractedUser.id))) {
          console.warn('⚠️ Using bootstrap admin fallback auth for user:', extractedUser.id)
          user = extractedUser as any
        } else if (process.env.NODE_ENV !== 'production') {
          // In development, allow mock auth
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
        } else {
          console.error('❌ Auth failed: BOT_TOKEN not set or invalid initData')
          reply.code(401)
          return { success: false, error: 'Invalid Telegram data. Make sure BOT_TOKEN is configured.' }
        }
      }

      // At this point user is guaranteed to be non-null
      const validUser = user!
      const token = generateToken(validUser)

      // Check if user is admin
      const isAdmin = BOOTSTRAP_ADMIN_IDS.includes(String(validUser.id))

      console.log('🔐 Auth:', { userId: validUser.id, username: validUser.username, isAdmin, adminIds: BOOTSTRAP_ADMIN_IDS })

      return {
        success: true,
        token,
        user: {
          id: String(validUser.id),
          name: `${validUser.first_name}${validUser.last_name ? ' ' + validUser.last_name : ''}`,
          username: validUser.username,
          avatar: (validUser as any).photo_url,
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

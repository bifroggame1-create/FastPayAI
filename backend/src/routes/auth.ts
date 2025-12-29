import { FastifyInstance } from 'fastify'
import {
  validateTelegramWebAppData,
  generateToken,
  authMiddleware,
  JWTPayload
} from '../auth'
import { validateBody, telegramAuthSchema } from '../validation'
import { getAdminByUserId, getAdminByUsername } from '../dataStore'

// Bootstrap admin IDs - can authenticate even without BOT_TOKEN
const BOOTSTRAP_ADMIN_IDS = (process.env.ADMIN_IDS || '1301598469').split(',').map(id => id.trim())

// Check if user is admin (bootstrap IDs or in database)
async function checkIsAdmin(userId: string, username?: string): Promise<boolean> {
  // Check bootstrap admin IDs first
  if (BOOTSTRAP_ADMIN_IDS.includes(userId)) {
    return true
  }

  // Check database for admin by userId
  const adminByUserId = await getAdminByUserId(userId)
  if (adminByUserId) {
    return true
  }

  // Check database for admin by username
  if (username) {
    const adminByUsername = await getAdminByUsername(username.toLowerCase())
    if (adminByUsername) {
      return true
    }
  }

  return false
}

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

      // Check if user is admin (bootstrap IDs or in database)
      const isAdmin = await checkIsAdmin(String(validUser.id), validUser.username)

      console.log('🔐 Auth:', { userId: validUser.id, username: validUser.username, isAdmin })

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

  // Bootstrap admin authentication - simplified auth for admin IDs only
  fastify.post('/auth/bootstrap', async (request, reply) => {
    try {
      const { userId, name, username } = request.body as { userId?: string; name?: string; username?: string }

      if (!userId) {
        reply.code(400)
        return { success: false, error: 'userId is required' }
      }

      // Check if user is admin (bootstrap IDs or in database)
      const isAdmin = await checkIsAdmin(userId, username)

      if (!isAdmin) {
        reply.code(403)
        return { success: false, error: 'Not an admin' }
      }

      console.log('🔐 Bootstrap auth for admin:', userId)

      const token = generateToken({
        id: parseInt(userId),
        first_name: name || 'Admin',
        username: username || 'admin'
      })

      return {
        success: true,
        token,
        user: {
          id: userId,
          name: name || 'Admin',
          username: username || 'admin',
          isAdmin: true
        }
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Verify token
  fastify.get('/auth/verify', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload

    // Check current admin status from database (may have changed since token was issued)
    const isAdmin = await checkIsAdmin(user.userId, user.username)

    return {
      success: true,
      user: {
        id: user.userId,
        username: user.username,
        isAdmin
      }
    }
  })
}

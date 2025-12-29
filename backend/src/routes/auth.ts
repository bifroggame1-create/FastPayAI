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

        // Allow bootstrap admins to authenticate even without BOT_TOKEN validation (dev only)
        if (extractedUser && BOOTSTRAP_ADMIN_IDS.includes(String(extractedUser.id)) && process.env.NODE_ENV !== 'production') {
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

  // REMOVED: Bootstrap admin authentication endpoint
  // This was a security vulnerability - allowed anyone to get admin tokens by knowing admin IDs
  // All authentication must now go through /auth/telegram with proper Telegram validation

  // Verify token and return fresh admin status
  fastify.get('/auth/verify', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload

    // Check current admin status from database (may have changed since token was issued)
    const isAdmin = await checkIsAdmin(user.userId, user.username)

    console.log('🔐 Token verify:', { userId: user.userId, username: user.username, isAdmin })

    return {
      success: true,
      user: {
        id: user.userId,
        name: user.username || `User ${user.userId}`,
        username: user.username,
        isAdmin
      }
    }
  })

  // Force refresh authentication - SECURED: requires valid JWT token
  // Only returns admin status for the authenticated user (prevents enumeration)
  fastify.post('/auth/refresh', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload

    // Only check admin status for the authenticated user
    const isAdmin = await checkIsAdmin(user.userId, user.username)
    console.log('🔐 Auth refresh:', { userId: user.userId, username: user.username, isAdmin })

    return {
      success: true,
      isAdmin
    }
  })
}

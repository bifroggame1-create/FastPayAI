import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'

// JWT secret - REQUIRED in production
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ JWT_SECRET environment variable is REQUIRED in production')
  }
  // In development, use a consistent dev secret (not random to preserve sessions)
  console.warn('⚠️ JWT_SECRET not set, using development default. SET IT IN PRODUCTION!')
  const DEV_SECRET = 'dev-secret-do-not-use-in-production-' + crypto.createHash('sha256').update(__dirname).digest('hex')
  module.exports.JWT_SECRET = DEV_SECRET
} else {
  module.exports.JWT_SECRET = JWT_SECRET
}
const JWT_EXPIRES_IN = '7d'

// Telegram Bot Token for WebApp validation
const BOT_TOKEN = process.env.BOT_TOKEN || ''

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface JWTPayload {
  userId: string
  username?: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

// Admin user IDs (REQUIRED - no default for security)
const ADMIN_IDS_STRING = process.env.ADMIN_IDS || ''
if (!ADMIN_IDS_STRING && process.env.NODE_ENV === 'production') {
  console.error('❌ ADMIN_IDS environment variable is REQUIRED in production')
  throw new Error('ADMIN_IDS must be set in production')
}
const ADMIN_IDS = ADMIN_IDS_STRING.split(',').map(id => id.trim()).filter(id => id.length > 0)
if (ADMIN_IDS.length === 0) {
  console.warn('⚠️ No ADMIN_IDS configured - admin features will be disabled')
}

/**
 * Validate Telegram WebApp initData
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string): TelegramUser | null {
  if (!BOT_TOKEN) {
    console.warn('⚠️ BOT_TOKEN not set, skipping Telegram validation')
    return null
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      console.error('No hash in initData')
      return null
    }

    // Remove hash from params for validation
    urlParams.delete('hash')

    // Sort params alphabetically and create data check string
    const dataCheckArr: string[] = []
    urlParams.sort()
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`)
    })
    const dataCheckString = dataCheckArr.join('\n')

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    // Compare hashes
    if (calculatedHash !== hash) {
      console.error('Hash mismatch in Telegram validation')
      return null
    }

    // Check auth_date (not older than 24 hours)
    const authDate = urlParams.get('auth_date')
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10)
      const now = Math.floor(Date.now() / 1000)
      if (now - authTimestamp > 86400) {
        console.error('Auth data is too old')
        return null
      }
    }

    // Parse user data
    const userJson = urlParams.get('user')
    if (!userJson) {
      console.error('No user in initData')
      return null
    }

    return JSON.parse(userJson) as TelegramUser
  } catch (error) {
    console.error('Error validating Telegram WebApp data:', error)
    return null
  }
}

/**
 * Generate JWT token for user
 * Note: isAdmin flag in JWT is set at login time.
 * For real-time admin status, always check with isAdmin() function or use adminMiddleware.
 */
export async function generateToken(user: TelegramUser, tenantId?: string): Promise<string> {
  const payload: JWTPayload = {
    userId: String(user.id),
    username: user.username,
    isAdmin: await isAdmin(String(user.id), user.username, tenantId)
  }

  const secret = module.exports.JWT_SECRET || JWT_SECRET
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = module.exports.JWT_SECRET || JWT_SECRET
    return jwt.verify(token, secret) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Optional authentication middleware - validates JWT if present but doesn't require it
 * Use this for endpoints that should work for both authenticated and unauthenticated users
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization)

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      // Get tenantId from request context
      const tenantId = (request as any).tenantId

      // Check if user is admin
      const isUserAdmin = payload.isAdmin || ADMIN_IDS.includes(payload.userId) || await isAdmin(payload.userId, payload.username, tenantId)

      // Add user info to request with admin flag
      ;(request as any).user = { ...payload, isAdmin: isUserAdmin, isSeller: !isUserAdmin }
    }
  }
  // If no token or invalid token, continue without user (request.user will be undefined)
}

/**
 * Authentication middleware - validates JWT and adds user to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization)

  if (!token) {
    reply.code(401).send({ success: false, error: 'Authentication required' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    reply.code(401).send({ success: false, error: 'Invalid or expired token' })
    return
  }

  // Add user info to request
  ;(request as any).user = payload
}

/**
 * Admin middleware - checks if user is admin via JWT only
 * SECURITY: All other auth methods (headers, query params, body) have been removed
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // JWT auth only - no bypasses allowed
  const token = extractToken(request.headers.authorization)

  if (!token) {
    console.log('🔐 Admin access DENIED - no token')
    reply.code(401).send({ success: false, error: 'Admin authentication required' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    console.log('🔐 Admin access DENIED - invalid token')
    reply.code(401).send({ success: false, error: 'Invalid or expired token' })
    return
  }

  // Get tenantId from request context (set by tenantMiddleware)
  const tenantId = (request as any).tenantId

  // Check if user is admin (from JWT payload, ADMIN_IDS env var, or database)
  const isUserAdmin = payload.isAdmin || ADMIN_IDS.includes(payload.userId) || await isAdmin(payload.userId, payload.username, tenantId)

  if (!isUserAdmin) {
    console.log('🔐 Admin access DENIED - not an admin:', payload.userId, 'tenantId:', tenantId)
    reply.code(403).send({ success: false, error: 'Admin privileges required' })
    return
  }

  // Add user info to request
  ;(request as any).user = { ...payload, isAdmin: true }
  console.log('🔐 Admin access granted:', payload.userId, payload.username, 'tenantId:', tenantId)
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization)

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      ;(request as any).user = payload
    }
  }
}

/**
 * Check if user ID is admin (checks both env var and database)
 */
export async function isAdmin(userId: string, username?: string, tenantId?: string): Promise<boolean> {
  // Check ADMIN_IDS environment variable first
  if (ADMIN_IDS.includes(userId)) {
    return true
  }

  // Dynamic import to avoid circular dependency
  try {
    const { getAdminByUserId, getAdminByUsername } = await import('./dataStore')

    // Check database for admin by userId
    const adminByUserId = await getAdminByUserId(userId, tenantId)
    if (adminByUserId) {
      return true
    }

    // Check database for admin by username
    if (username) {
      const adminByUsername = await getAdminByUsername(username.toLowerCase(), tenantId)
      if (adminByUsername) {
        return true
      }
    }
  } catch (error) {
    console.error('Error checking admin status from database:', error)
  }

  return false
}

// Log configuration on startup
console.log('🔐 Auth module initialized:', {
  jwtConfigured: true,
  botTokenConfigured: !!BOT_TOKEN,
  adminIds: ADMIN_IDS
})

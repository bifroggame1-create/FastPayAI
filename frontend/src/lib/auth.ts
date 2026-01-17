/**
 * Authentication module - Secure auth with httpOnly cookies support
 * Works in Telegram Mini App and browser environments
 *
 * SECURITY: Uses httpOnly cookies for token storage when available
 * Falls back to localStorage for environments without cookie support
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai.onrender.com').replace(/\/+$/, '')
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'fastpay'

// Auth mode: 'cookie' for httpOnly cookies, 'localStorage' for fallback
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === 'cookie' ? 'cookie' : 'localStorage'

// Debug logging (disabled in production)
const DEBUG = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => DEBUG && console.log(...args)
const logError = (...args: unknown[]) => DEBUG && console.error(...args)

// Storage keys (used only in localStorage mode)
const STORAGE = {
  TOKEN: 'fp_token',
  USER: 'fp_user'
} as const

export interface AuthUser {
  id: string
  name: string
  username?: string
  avatar?: string
  isAdmin: boolean
  isSeller?: boolean
  bonusBalance?: number
}

// In-memory cache
let cachedUser: AuthUser | null = null
let cachedToken: string | null = null

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get Telegram WebApp user data
 */
function getTelegramUser(): { id: string; firstName: string; username?: string } | null {
  if (!isBrowser()) return null

  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string; username?: string } } } } }).Telegram?.WebApp
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user
      return {
        id: String(user.id),
        firstName: user.first_name,
        username: user.username
      }
    }
  } catch (e) {
    logError('Error getting Telegram user:', e)
  }

  return null
}

/**
 * Get Telegram initData for backend validation
 */
function getTelegramInitData(): string | null {
  if (!isBrowser()) return null

  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
    return tg?.initData || null
  } catch {
    return null
  }
}

/**
 * Save auth data
 * In cookie mode: only saves user to memory (token is in httpOnly cookie)
 * In localStorage mode: saves both to localStorage
 */
function saveAuth(token: string | null, user: AuthUser): void {
  // Create a defensive copy to prevent external mutations
  cachedUser = { ...user }

  if (AUTH_MODE === 'cookie') {
    // In cookie mode, token is managed by backend via httpOnly cookie
    // We only cache user data in memory
    cachedToken = null
  } else {
    // localStorage mode
    cachedToken = token
    if (isBrowser() && token) {
      localStorage.setItem(STORAGE.TOKEN, token)
      localStorage.setItem(STORAGE.USER, JSON.stringify(user))
    }
  }
}

/**
 * Load auth data - uses in-memory cache when available, falls back to localStorage
 */
function loadAuth(): { token: string | null; user: AuthUser | null } {
  // Return from in-memory cache if available
  if (cachedUser) {
    return { token: cachedToken, user: cachedUser }
  }

  // Only access localStorage if in localStorage mode and cache is empty
  if (AUTH_MODE === 'localStorage' && isBrowser()) {
    try {
      const token = localStorage.getItem(STORAGE.TOKEN)
      const userStr = localStorage.getItem(STORAGE.USER)

      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser
        // Update in-memory cache
        cachedToken = token
        cachedUser = user
        return { token, user }
      }
    } catch (e) {
      // Invalid data in localStorage
      logError('Failed to load auth from localStorage:', e)
    }
  }

  return { token: null, user: null }
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  cachedToken = null
  cachedUser = null

  if (isBrowser()) {
    localStorage.removeItem(STORAGE.TOKEN)
    localStorage.removeItem(STORAGE.USER)
    localStorage.removeItem('fp_admin') // Legacy cleanup

    // If using cookies, call logout endpoint to clear httpOnly cookie
    if (AUTH_MODE === 'cookie') {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Tenant-ID': TENANT_ID }
      }).catch(() => {})
    }
  }
}

/**
 * Get current token (only available in localStorage mode)
 */
export function getToken(): string | null {
  if (AUTH_MODE === 'cookie') {
    // In cookie mode, token is not accessible to JS
    return null
  }
  const { token } = loadAuth()
  return token
}

/**
 * Get current user
 */
export function getUser(): AuthUser | null {
  const { user } = loadAuth()
  return user
}

/**
 * Check if current user is admin (local check only, for UI purposes)
 * SECURITY: This is only for UI display. Backend ALWAYS verifies admin status via JWT.
 *
 * IMPORTANT: This function uses in-memory cache first (updated by authenticate/verifyToken).
 * Fallback to localStorage is minimal and only checks once.
 */
export function isAdmin(): boolean {
  // Primary source: in-memory cache (updated by authenticate/verifyToken)
  if (cachedUser?.isAdmin) return true

  // Fallback: check localStorage only if in localStorage mode
  if (isBrowser() && AUTH_MODE === 'localStorage') {
    const userStr = localStorage.getItem(STORAGE.USER)
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser
        const hasToken = !!localStorage.getItem(STORAGE.TOKEN)

        if (user.isAdmin && hasToken) {
          // Update cache from localStorage for future calls
          cachedUser = user
          return true
        }
      } catch {
        // Invalid JSON - ignore
      }
    }
  }

  return false
}

/**
 * Get fetch options based on auth mode
 */
export function getAuthFetchOptions(): RequestInit {
  if (AUTH_MODE === 'cookie') {
    return { credentials: 'include' }
  }

  const token = getToken()
  return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {}
}

/**
 * Authenticate with backend
 */
export async function authenticate(): Promise<boolean> {
  log('🔐 Starting authentication...')

  let initData = getTelegramInitData()
  const tgUser = getTelegramUser()

  log('🔐 Telegram data:', {
    hasInitData: !!initData,
    initDataLength: initData?.length || 0,
    tgUser
  })

  // If no initData but have user, construct it
  if ((!initData || initData.length === 0) && tgUser) {
    const userJson = JSON.stringify({
      id: parseInt(tgUser.id),
      first_name: tgUser.firstName,
      username: tgUser.username
    })
    initData = `user=${encodeURIComponent(userJson)}&auth_date=${Math.floor(Date.now() / 1000)}`
    log('🔐 Constructed initData from user')
  }

  if (!initData || initData.length === 0) {
    logError('❌ No Telegram data available')
    return false
  }

  try {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify({ initData })
    }

    // Add credentials for cookie mode
    if (AUTH_MODE === 'cookie') {
      fetchOptions.credentials = 'include'
    }

    const response = await fetch(`${API_URL}/auth/telegram`, fetchOptions)
    const data = await response.json()
    log('🔐 Auth response:', data)

    if (data.success && data.user) {
      const user: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        avatar: data.user.avatar,
        isAdmin: data.user.isAdmin === true,
        bonusBalance: data.user.bonusBalance
      }

      // In cookie mode, token comes as httpOnly cookie
      // In localStorage mode, save token from response
      saveAuth(AUTH_MODE === 'localStorage' ? data.token : null, user)
      log('✅ Authenticated:', user.name, 'isAdmin:', user.isAdmin)
      return true
    }

    logError('❌ Auth failed:', data.error)
    return false
  } catch (error) {
    logError('❌ Auth error:', error)
    return false
  }
}

/**
 * Verify existing token/session
 */
export async function verifyToken(): Promise<boolean | 'rate_limit'> {
  // In localStorage mode, verify JWT
  if (AUTH_MODE === 'localStorage') {
    const { token } = loadAuth()
    if (!token) return false
  }

  try {
    const fetchOptions: RequestInit = {
      headers: {
        'X-Tenant-ID': TENANT_ID
      }
    }

    if (AUTH_MODE === 'cookie') {
      fetchOptions.credentials = 'include'
    } else {
      const token = getToken()
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Authorization': `Bearer ${token}`
        }
      }
    }

    // FIX: Changed to POST method (verification is not idempotent due to server-side state updates)
    const response = await fetch(`${API_URL}/auth/verify`, {
      ...fetchOptions,
      method: 'POST'
    })

    // Don't invalidate token on rate limit - it's temporary
    if (response.status === 429) {
      log('⚠️ Rate limited on token verify - assuming token still valid')
      return 'rate_limit'
    }

    const data = await response.json()

    if (data.success && data.user) {
      const currentUser = getUser()
      if (currentUser) {
        // FIX: Create a new object instead of mutating the cached one
        const updatedUser: AuthUser = {
          ...currentUser,
          isAdmin: data.user.isAdmin === true,
          bonusBalance: data.user.bonusBalance
        }
        saveAuth(AUTH_MODE === 'localStorage' ? getToken() : null, updatedUser)
      }
      return true
    }

    return false
  } catch (error) {
    logError('Token verification error:', error)
    return false
  }
}

/**
 * Initialize auth - call on app start
 */
export async function initAuth(): Promise<AuthUser | null> {
  log('🔐 Initializing auth... Mode:', AUTH_MODE)

  const tgUser = getTelegramUser()
  log('🔐 Telegram user:', tgUser)

  // First try to verify existing session/token
  const { user } = loadAuth()

  if (user || AUTH_MODE === 'cookie') {
    log('🔐 Verifying existing session...')
    const valid = await verifyToken()

    if (valid === true) {
      log('✅ Session valid, user:', getUser()?.name)
      return getUser()
    }

    // If rate limited, assume token is still valid
    if (valid === 'rate_limit') {
      log('⚠️ Rate limited - using cached session')
      return user
    }

    log('🔐 Session invalid, re-authenticating...')
    if (AUTH_MODE === 'localStorage') {
      clearAuth()
    }
  }

  // Authenticate fresh
  const success = await authenticate()

  if (success) {
    return getUser()
  }

  if (tgUser) {
    log('🔐 Auth failed - user must re-authenticate via Telegram')
  }

  return null
}

// Export for compatibility
export const getAuthUser = getUser
export const forceReauth = clearAuth
export const getStoredAdminStatus = isAdmin

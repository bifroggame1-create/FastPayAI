import { getTelegramInitData, getTelegramUser } from './telegram'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai.onrender.com'
const TOKEN_KEY = 'fastpay_token'
const USER_KEY = 'fastpay_user'

export interface AuthUser {
  id: string
  name: string
  username?: string
  avatar?: string
  isAdmin: boolean
}

let authToken: string | null = null
let authUser: AuthUser | null = null
let authPromise: Promise<boolean> | null = null

// Get stored token
export function getToken(): string | null {
  if (authToken) return authToken

  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem(TOKEN_KEY)
  }

  return authToken
}

// Get authenticated user
export function getAuthUser(): AuthUser | null {
  if (authUser) return authUser

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        authUser = JSON.parse(stored)
      } catch (e) {
        // Invalid stored user
      }
    }
  }

  return authUser
}

// Authenticate with backend
export async function authenticate(): Promise<boolean> {
  // If already authenticating, wait for that
  if (authPromise) {
    return authPromise
  }

  // If already have token, verify it and get fresh admin status
  const existingToken = getToken()
  if (existingToken) {
    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${existingToken}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          authUser = data.user
          // Update localStorage with fresh admin status from server
          if (typeof window !== 'undefined') {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          }
          console.log('✅ Token verified, isAdmin:', data.user?.isAdmin)
          return true
        }
      }
    } catch (e) {
      console.error('Token verification failed:', e)
    }

    // Token invalid, clear it
    clearAuth()
  }

  // Get Telegram initData
  let initData = getTelegramInitData()

  console.log('🔐 Auth: initData length =', initData?.length || 0)

  // If no initData or empty string, try to construct minimal one from available Telegram data
  if (!initData || initData.length === 0) {
    const telegramUser = getTelegramUser()

    // Try to get user from Telegram WebApp initDataUnsafe directly
    let userId: string | null = null
    let firstName = 'User'
    let username: string | undefined

    if (telegramUser) {
      userId = telegramUser.id
      firstName = telegramUser.name.split(' ')[0]
      username = telegramUser.username
    } else if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user
      userId = String(user.id)
      firstName = user.first_name
      username = user.username
    }

    if (userId) {
      // Construct minimal initData with user info for backend fallback auth
      const userJson = JSON.stringify({
        id: parseInt(userId),
        first_name: firstName,
        username: username
      })
      initData = `user=${encodeURIComponent(userJson)}&auth_date=${Math.floor(Date.now() / 1000)}`
      console.log('📱 Using constructed initData for auth, userId:', userId)
    } else {
      // No Telegram data available - authentication not possible
      console.warn('No Telegram data available - cannot authenticate')
      return false
    }
  }

  // Authenticate with backend
  authPromise = (async () => {
    try {
      console.log('🔐 Calling /auth/telegram with initData length:', initData.length)
      let res = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData })
      })

      console.log('🔐 Auth response status:', res.status)
      const data = await res.json()
      console.log('🔐 Auth response:', data.success ? 'success' : 'failed', data.error || '')

      if (data.success && data.token) {
        authToken = data.token
        authUser = data.user

        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.token)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }

        console.log('✅ Authenticated:', authUser?.name, 'isAdmin:', authUser?.isAdmin)
        return true
      } else {
        console.error('❌ Authentication failed:', data.error)
        return false
      }
    } catch (e) {
      console.error('❌ Authentication error:', e)
      return false
    } finally {
      authPromise = null
    }
  })()

  return authPromise
}

// Clear authentication
export function clearAuth(): void {
  authToken = null
  authUser = null

  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

// Check if user is admin
export function isAdmin(): boolean {
  return authUser?.isAdmin || false
}

// Get authorization header
export function getAuthHeader(): Record<string, string> {
  const token = getToken()
  if (token) {
    return { 'Authorization': `Bearer ${token}` }
  }
  return {}
}

import { getTelegramInitData, getTelegramUser } from './telegram'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai-back.onrender.com'
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

  // If already have token, verify it
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
  const initData = getTelegramInitData()

  if (!initData) {
    // No Telegram data - use mock user in development
    if (process.env.NODE_ENV !== 'production') {
      const telegramUser = getTelegramUser()
      if (telegramUser) {
        authUser = {
          id: telegramUser.id,
          name: telegramUser.name,
          username: telegramUser.username,
          avatar: telegramUser.avatar,
          isAdmin: false
        }
        return true
      }
    }
    console.warn('No Telegram initData available')
    return false
  }

  // Authenticate with backend
  authPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData })
      })

      const data = await res.json()

      if (data.success && data.token) {
        authToken = data.token
        authUser = data.user

        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, data.token)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        }

        console.log('✅ Authenticated:', authUser?.name)
        return true
      } else {
        console.error('Authentication failed:', data.error)
        return false
      }
    } catch (e) {
      console.error('Authentication error:', e)
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

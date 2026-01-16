import axios, { AxiosInstance } from 'axios'
import * as fs from 'fs'
import * as path from 'path'

// Fragment API configuration (Official REST API)
interface FragmentConfig {
  apiKey: string
  phone: string
  mnemonics: string
  version: string // V4R2 or W5
}

interface BuyStarsParams {
  username: string // @username or username
  quantity: number // Amount of stars to buy
}

interface BuyPremiumParams {
  username: string
  months: number // 3, 6, or 12 months
}

interface FragmentResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface WalletBalance {
  balance: number
  currency: string
}

interface UserValidation {
  exists: boolean
  username: string
  recipient?: string
}

// Token storage
const TOKEN_FILE = path.join(process.cwd(), 'fragment_token.json')

interface TokenStorage {
  token: string
  version: string
  expiresAt: number
}

export class FragmentAPI {
  private config: FragmentConfig
  private apiUrl: string = 'https://api.fragment.com/v1'
  private token: string | null = null
  private axiosInstance: AxiosInstance
  private initialized: boolean = false

  constructor() {
    this.config = {
      apiKey: process.env.FRAGMENT_API_KEY || '',
      phone: process.env.FRAGMENT_PHONE || '',
      mnemonics: process.env.FRAGMENT_MNEMONICS || '',
      version: process.env.FRAGMENT_VERSION || 'V4R2'
    }

    this.initialized = !!(this.config.apiKey && this.config.phone && this.config.mnemonics)

    // Axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FastPayAI/1.0'
      }
    })

    // Load cached token if exists
    this.loadToken()

    if (this.initialized) {
      console.log('✅ Fragment API (Official REST) initialized')
    } else {
      console.warn('⚠️  Fragment API not configured - set FRAGMENT_API_KEY, FRAGMENT_PHONE, FRAGMENT_MNEMONICS in .env')
    }
  }

  /**
   * Load cached JWT token from file
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as TokenStorage

        // Check if token is still valid (not expired)
        if (data.expiresAt > Date.now() && data.version === this.config.version) {
          this.token = data.token
          console.log('✅ Loaded cached Fragment JWT token')
        } else {
          console.log('⚠️  Cached token expired or version mismatch')
          this.clearToken()
        }
      }
    } catch (error) {
      console.error('Error loading Fragment token:', error)
      this.clearToken()
    }
  }

  /**
   * Save JWT token to file
   */
  private saveToken(token: string): void {
    try {
      const storage: TokenStorage = {
        token,
        version: this.config.version,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(storage, null, 2))
      console.log('✅ Fragment JWT token saved')
    } catch (error) {
      console.error('Error saving Fragment token:', error)
    }
  }

  /**
   * Clear cached token
   */
  private clearToken(): void {
    this.token = null
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE)
    }
  }

  /**
   * Authenticate with Fragment API and get JWT token
   */
  async authenticate(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Fragment API is not configured')
    }

    try {
      console.log('🔐 Authenticating with Fragment API...')

      const response = await this.axiosInstance.post('/auth/authenticate/', {
        api_key: this.config.apiKey,
        phone: this.config.phone,
        version: this.config.version,
        mnemonics: this.config.mnemonics
      })

      if (response.data && response.data.token) {
        this.token = response.data.token
        this.saveToken(this.token)
        console.log('✅ Fragment API authenticated successfully')
        return true
      } else {
        console.error('❌ Fragment API authentication failed - no token received')
        return false
      }
    } catch (error: any) {
      console.error('Fragment API authentication error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      // Clear invalid token
      this.clearToken()
      return false
    }
  }

  /**
   * Ensure we have a valid JWT token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      const success = await this.authenticate()
      if (!success) {
        throw new Error('Failed to authenticate with Fragment API')
      }
    }
  }

  /**
   * Make authenticated request to Fragment API
   * Handles 401/403 by re-authenticating
   */
  private async makeAuthenticatedRequest<T>(
    method: 'get' | 'post',
    endpoint: string,
    data?: any
  ): Promise<T> {
    await this.ensureAuthenticated()

    try {
      const config = {
        headers: {
          'Authorization': `JWT ${this.token}`
        }
      }

      const response = method === 'get'
        ? await this.axiosInstance.get(endpoint, config)
        : await this.axiosInstance.post(endpoint, data, config)

      return response.data
    } catch (error: any) {
      // If 401/403, try re-authenticating once
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('⚠️  Token expired, re-authenticating...')
        this.clearToken()
        const success = await this.authenticate()

        if (success) {
          // Retry request with new token
          const config = {
            headers: {
              'Authorization': `JWT ${this.token}`
            }
          }

          const response = method === 'get'
            ? await this.axiosInstance.get(endpoint, config)
            : await this.axiosInstance.post(endpoint, data, config)

          return response.data
        }
      }

      throw error
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    try {
      const data = await this.makeAuthenticatedRequest<any>('get', '/misc/wallet/')

      return {
        balance: data.balance || 0,
        currency: data.currency || 'TON'
      }
    } catch (error: any) {
      console.error('Error fetching wallet balance:', error.message)
      throw new Error('Failed to fetch wallet balance')
    }
  }

  /**
   * Validate if username exists and can receive Stars/Premium
   */
  async validateUsername(username: string): Promise<UserValidation> {
    // Ensure username has @ prefix
    if (!username.startsWith('@')) {
      username = '@' + username
    }

    try {
      const cleanUsername = username.replace('@', '')
      const data = await this.makeAuthenticatedRequest<any>('get', `/misc/user/${cleanUsername}/`)

      return {
        exists: true,
        username: cleanUsername,
        recipient: data.recipient
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          exists: false,
          username: username.replace('@', '')
        }
      }

      console.error('Error validating username:', error.message)
      throw new Error('Failed to validate username')
    }
  }

  /**
   * Buy Telegram Stars and send them to a user
   * Minimum amount: varies by Fragment API
   */
  async buyStars(params: BuyStarsParams): Promise<FragmentResponse> {
    if (!this.initialized) {
      throw new Error('Fragment API is not configured')
    }

    // Ensure username format
    if (!params.username.startsWith('@')) {
      params.username = '@' + params.username
    }

    try {
      console.log(`Fragment API: Buying ${params.quantity} stars for ${params.username}`)

      // Check balance first (optional but recommended)
      const balance = await this.getBalance()
      console.log(`Current balance: ${balance.balance} ${balance.currency}`)

      // Send stars
      const data = await this.makeAuthenticatedRequest<any>('post', '/order/stars/', {
        username: params.username,
        quantity: params.quantity
      })

      console.log('Fragment API Response:', data)

      if (data && (data.success || data.ok)) {
        return {
          success: true,
          message: `Successfully sent ${params.quantity} stars to ${params.username}`,
          data: {
            orderId: data.order_id || data.orderId,
            orderUrl: data.order_url || data.orderUrl
          }
        }
      } else {
        return {
          success: false,
          error: data?.error || data?.message || 'Unknown error from Fragment API'
        }
      }
    } catch (error: any) {
      console.error('Fragment API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      // Extract error message from response
      let errorMessage = error.message || 'Fragment API error'

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
      }

      // Handle specific errors
      if (error.response?.status === 400) {
        errorMessage = 'Invalid request - ' + errorMessage
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - please try again later'
      } else if (error.response?.status >= 500) {
        errorMessage = 'Fragment API server error - please try again later'
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Buy Telegram Premium subscription for a user
   */
  async buyPremium(params: BuyPremiumParams): Promise<FragmentResponse> {
    if (!this.initialized) {
      throw new Error('Fragment API is not configured')
    }

    // Ensure username format
    if (!params.username.startsWith('@')) {
      params.username = '@' + params.username
    }

    // Validate months
    if (![3, 6, 12].includes(params.months)) {
      throw new Error('Invalid subscription period. Must be 3, 6, or 12 months')
    }

    try {
      console.log(`Fragment API: Buying ${params.months} months Premium for ${params.username}`)

      // Check balance first
      const balance = await this.getBalance()
      console.log(`Current balance: ${balance.balance} ${balance.currency}`)

      // Send premium gift
      const data = await this.makeAuthenticatedRequest<any>('post', '/order/premium/', {
        username: params.username,
        months: params.months
      })

      console.log('Fragment API Response:', data)

      if (data && (data.success || data.ok)) {
        return {
          success: true,
          message: `Successfully sent ${params.months} months Premium to ${params.username}`,
          data: {
            orderId: data.order_id || data.orderId,
            orderUrl: data.order_url || data.orderUrl
          }
        }
      } else {
        return {
          success: false,
          error: data?.error || data?.message || 'Unknown error from Fragment API'
        }
      }
    } catch (error: any) {
      console.error('Fragment API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      // Extract error message
      let errorMessage = error.message || 'Fragment API error'

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
      }

      // Handle specific errors
      if (error.response?.status === 400) {
        errorMessage = 'Invalid request - ' + errorMessage
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - please try again later'
      } else if (error.response?.status >= 500) {
        errorMessage = 'Fragment API server error - please try again later'
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Check if Fragment API is configured and ready to use
   */
  isConfigured(): boolean {
    return this.initialized
  }

  /**
   * Get configuration status (for diagnostics)
   */
  getConfigStatus(): {
    configured: boolean
    hasApiKey: boolean
    hasPhone: boolean
    hasMnemonics: boolean
    hasToken: boolean
    version: string
  } {
    return {
      configured: this.initialized,
      hasApiKey: !!this.config.apiKey,
      hasPhone: !!this.config.phone,
      hasMnemonics: !!this.config.mnemonics,
      hasToken: !!this.token,
      version: this.config.version
    }
  }

  /**
   * Calculate markup for Stars reselling
   * Default: 20% markup over Fragment purchase price
   */
  static calculateResellPrice(starsAmount: number, markupPercent: number = 20): number {
    // Fragment approximate prices (in RUB)
    // These are rough estimates and should be updated based on actual Fragment prices
    const fragmentPricePerStar = 1.5 // ~1.5 RUB per star on Fragment

    const baseCost = starsAmount * fragmentPricePerStar
    const markup = baseCost * (markupPercent / 100)

    return Math.ceil(baseCost + markup)
  }

  /**
   * Calculate Premium subscription price
   */
  static calculatePremiumPrice(months: number, markupPercent: number = 20): number {
    // Fragment prices for Premium (approximate in RUB)
    const basePrices: Record<number, number> = {
      3: 450,   // 3 months ≈ 450 RUB
      6: 750,   // 6 months ≈ 750 RUB
      12: 1350  // 12 months ≈ 1350 RUB
    }

    const baseCost = basePrices[months] || 0
    const markup = baseCost * (markupPercent / 100)

    return Math.ceil(baseCost + markup)
  }
}

// Singleton instance
export const fragmentAPI = new FragmentAPI()

/**
 * Price calculation helper for Stars
 * Returns the sell price for a Stars package with markup
 */
export function getStarsPackagePrice(starsAmount: number): number {
  return FragmentAPI.calculateResellPrice(starsAmount, 20) // 20% markup
}

/**
 * Price calculation helper for Premium
 * Returns the sell price for Premium subscription with markup
 */
export function getPremiumPackagePrice(months: number): number {
  return FragmentAPI.calculatePremiumPrice(months, 20) // 20% markup
}

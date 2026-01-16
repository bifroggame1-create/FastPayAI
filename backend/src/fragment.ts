import axios from 'axios'

// Fragment API configuration
interface FragmentConfig {
  hash: string
  cookies: string
  seed: string
}

interface BuyStarsParams {
  username: string // @username
  amount: number // Minimum 50 stars
}

interface BuyStarsResponse {
  success: boolean
  message?: string
  transactionId?: string
  error?: string
}

export class FragmentAPI {
  private config: FragmentConfig
  private apiUrl: string = 'https://api.bohd4n.dev/api/v1/BuyStars'
  private initialized: boolean = false

  constructor() {
    this.config = {
      hash: process.env.FRAGMENT_HASH || '',
      cookies: process.env.FRAGMENT_COOKIES || '',
      seed: process.env.FRAGMENT_SEED || ''
    }

    this.initialized = !!(this.config.hash && this.config.cookies && this.config.seed)

    if (this.initialized) {
      console.log('✅ Fragment API initialized')
    } else {
      console.warn('⚠️  Fragment API not configured - set FRAGMENT_HASH, FRAGMENT_COOKIES, FRAGMENT_SEED in .env')
    }
  }

  /**
   * Buy Telegram Stars and send them to a user via Fragment
   * Minimum amount: 50 stars
   */
  async buyStars(params: BuyStarsParams): Promise<BuyStarsResponse> {
    if (!this.initialized) {
      throw new Error('Fragment API is not configured')
    }

    if (params.amount < 50) {
      throw new Error('Minimum amount is 50 stars')
    }

    if (!params.username.startsWith('@')) {
      params.username = '@' + params.username
    }

    try {
      console.log(`Fragment API: Buying ${params.amount} stars for ${params.username}`)

      const response = await axios.post(this.apiUrl, {
        username: params.username,
        amount: params.amount,
        hash: this.config.hash,
        cookies: this.config.cookies,
        seed: this.config.seed
      }, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FastPayAI/1.0'
        }
      })

      console.log('Fragment API Response:', response.data)

      if (response.data && response.data.success) {
        return {
          success: true,
          message: `Successfully sent ${params.amount} stars to ${params.username}`,
          transactionId: response.data.transactionId || response.data.transaction_id
        }
      } else {
        return {
          success: false,
          error: response.data?.message || response.data?.error || 'Unknown error from Fragment API'
        }
      }
    } catch (error: any) {
      console.error('Fragment API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      // Check for specific errors
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Fragment API authentication failed - cookies may be expired'
        }
      }

      if (error.response?.status === 400) {
        return {
          success: false,
          error: error.response?.data?.message || 'Invalid request to Fragment API'
        }
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Fragment API timeout - please try again'
        }
      }

      return {
        success: false,
        error: error.message || 'Fragment API error'
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
    hasHash: boolean
    hasCookies: boolean
    hasSeed: boolean
  } {
    return {
      configured: this.initialized,
      hasHash: !!this.config.hash,
      hasCookies: !!this.config.cookies,
      hasSeed: !!this.config.seed
    }
  }

  /**
   * Update Fragment cookies (for auto-refresh mechanism)
   */
  updateCookies(newCookies: string): void {
    this.config.cookies = newCookies
    this.initialized = !!(this.config.hash && this.config.cookies && this.config.seed)
    console.log('✅ Fragment cookies updated')
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
}

// Singleton instance
export const fragmentAPI = new FragmentAPI()

/**
 * Auto-refresh Fragment cookies mechanism
 * This should be called periodically (e.g., every 24 hours) to keep cookies fresh
 *
 * Implementation note:
 * - Fragment cookies typically expire after some time
 * - You'll need to implement a mechanism to fetch new cookies
 * - This could be done via a separate service or manual update
 */
export async function refreshFragmentCookies(): Promise<boolean> {
  try {
    // TODO: Implement actual cookie refresh logic
    // This might involve:
    // 1. Using Puppeteer/Playwright to login to Fragment
    // 2. Extracting new cookies
    // 3. Updating the environment variables or database

    console.log('⚠️  Fragment cookie refresh not yet implemented')
    console.log('👉 To refresh cookies manually:')
    console.log('   1. Login to fragment.com')
    console.log('   2. Extract cookies from browser')
    console.log('   3. Update FRAGMENT_COOKIES env variable')

    return false
  } catch (error: any) {
    console.error('Error refreshing Fragment cookies:', error.message)
    return false
  }
}

/**
 * Price calculation helper
 * Returns the sell price for a Stars package with markup
 */
export function getStarsPackagePrice(starsAmount: number): number {
  return FragmentAPI.calculateResellPrice(starsAmount, 20) // 20% markup
}

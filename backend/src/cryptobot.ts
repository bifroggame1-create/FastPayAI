import axios from 'axios'

const CRYPTOBOT_API_URL = 'https://pay.crypt.bot/api'

// Fallback token for cases when Render env vars don't propagate correctly
const FALLBACK_TOKEN = '73448:AAQ8MQU0NP78iPtunmwzuj4FIuD973q3AaS'

interface CreateInvoiceParams {
  asset: string // Currency code (USDT, TON, BTC, etc.)
  amount: string | number // Amount as string or number (will be converted to string)
  description?: string
  paid_btn_name?: 'viewItem' | 'openChannel' | 'openBot' | 'callback'
  paid_btn_url?: string
  payload?: string
  allow_comments?: boolean
  allow_anonymous?: boolean
  expires_in?: number // Invoice expiration time in seconds (1-2678400)
}

interface Invoice {
  invoice_id: number
  hash: string
  currency_type: string
  asset: string
  amount: string
  pay_url: string
  bot_invoice_url: string
  description?: string
  status: 'active' | 'paid' | 'expired'
  created_at: string
  allow_comments: boolean
  allow_anonymous: boolean
}

export class CryptoBotAPI {
  private token: string = ''
  private apiUrl: string
  private initialized: boolean = false

  constructor(token?: string) {
    this.apiUrl = CRYPTOBOT_API_URL
    if (token) {
      this.token = token.trim().replace(/['"]/g, '').replace(/\r?\n/g, '')
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      // Lazy load token from environment (after dotenv has loaded)
      const envToken = process.env.CRYPTOBOT_TOKEN || FALLBACK_TOKEN

      if (envToken) {
        this.token = envToken.trim().replace(/['"]/g, '').replace(/\r?\n/g, '')

        // Validate token format
        const isValidFormat = /^\d+:[A-Za-z0-9_-]+$/.test(this.token)

        console.log('✅ CryptoBot token initialized:', {
          length: this.token.length,
          preview: this.token.substring(0, 10) + '...',
          formatValid: isValidFormat,
          source: process.env.CRYPTOBOT_TOKEN ? 'env' : 'fallback'
        })

        if (!isValidFormat) {
          console.warn('⚠️ CryptoBot token format looks invalid. Expected format: 12345:ABCDEF...')
        }
      } else {
        console.error('❌ CryptoBot token is empty or not configured')
      }

      this.initialized = true
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    this.ensureInitialized()

    try {
      console.log(`CryptoBot API Request: ${method} ${endpoint}`, data)

      if (!this.token) {
        throw new Error('CryptoBot token is not configured')
      }

      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Crypto-Pay-API-Token': this.token,
          'Content-Type': 'application/json',
        },
        data,
      })

      console.log('CryptoBot API Response:', response.data)

      if (response.data.ok) {
        return response.data.result
      } else {
        const errorMsg = response.data.error?.name || 'CryptoBot API error'
        console.error('CryptoBot API returned error:', response.data.error)
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('CryptoBot API error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    // Ensure amount is a string
    const requestParams = {
      ...params,
      amount: String(params.amount),
    }
    return this.makeRequest('POST', '/createInvoice', requestParams)
  }

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return this.makeRequest('GET', `/getInvoices?invoice_ids=${invoiceId}`)
  }

  async getInvoices(params?: {
    asset?: string
    invoice_ids?: string
    status?: 'active' | 'paid' | 'expired'
    offset?: number
    count?: number
  }): Promise<{ items: Invoice[] }> {
    const queryParams = new URLSearchParams(params as any).toString()
    return this.makeRequest('GET', `/getInvoices?${queryParams}`)
  }

  async getMe(): Promise<any> {
    return this.makeRequest('GET', '/getMe')
  }

  async getBalance(): Promise<any> {
    return this.makeRequest('GET', '/getBalance')
  }

  async getExchangeRates(): Promise<any> {
    return this.makeRequest('GET', '/getExchangeRates')
  }

  async getCurrencies(): Promise<any> {
    return this.makeRequest('GET', '/getCurrencies')
  }

  isConfigured(): boolean {
    this.ensureInitialized()
    return !!this.token
  }

  getTokenInfo(): { configured: boolean; length: number; preview: string; source: string } {
    this.ensureInitialized()
    return {
      configured: !!this.token,
      length: this.token.length,
      preview: this.token ? this.token.substring(0, 10) + '...' : 'not set',
      source: process.env.CRYPTOBOT_TOKEN ? 'env' : 'fallback'
    }
  }
}

export const cryptoBot = new CryptoBotAPI()

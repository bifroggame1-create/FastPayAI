import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const CRYPTOBOT_API_URL = 'https://pay.crypt.bot/api'
const CRYPTOBOT_TOKEN = process.env.CRYPTOBOT_TOKEN

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
  private token: string
  private apiUrl: string

  constructor(token?: string) {
    // Clean token - remove quotes, spaces, newlines
    const rawToken = token || CRYPTOBOT_TOKEN || ''
    this.token = rawToken.trim().replace(/['"]/g, '').replace(/\r?\n/g, '')
    this.apiUrl = CRYPTOBOT_API_URL

    // Validate token format (should be like: 12345:ABCDEF...)
    if (this.token && !/^\d+:[A-Za-z0-9_-]+$/.test(this.token)) {
      console.warn('⚠️ CryptoBot token format looks invalid. Expected format: 12345:ABCDEF...')
      console.warn('Token issues detected:', {
        hasQuotes: rawToken !== rawToken.replace(/['"]/g, ''),
        hasSpaces: rawToken !== rawToken.trim(),
        hasNewlines: rawToken !== rawToken.replace(/\r?\n/g, ''),
        invalidChars: this.token.match(/[^0-9:A-Za-z_-]/g),
      })
    }

    // Log token info for debugging (first 10 chars only for security)
    if (this.token) {
      console.log('✅ CryptoBot token initialized:', {
        length: this.token.length,
        preview: this.token.substring(0, 10) + '...',
        formatValid: /^\d+:[A-Za-z0-9_-]+$/.test(this.token),
      })
    } else {
      console.error('❌ CryptoBot token is empty or not configured')
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
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
}

export const cryptoBot = new CryptoBotAPI()

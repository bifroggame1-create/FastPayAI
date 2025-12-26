import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const CRYPTOBOT_API_URL = 'https://pay.crypt.bot/api'
const CRYPTOBOT_TOKEN = process.env.CRYPTOBOT_TOKEN

interface CreateInvoiceParams {
  asset: string // Currency code (USDT, TON, BTC, etc.)
  amount: number
  description?: string
  paid_btn_name?: 'viewItem' | 'openChannel' | 'openBot' | 'callback'
  paid_btn_url?: string
  payload?: string
  allow_comments?: boolean
  allow_anonymous?: boolean
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
    this.token = token || CRYPTOBOT_TOKEN || ''
    this.apiUrl = CRYPTOBOT_API_URL
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Crypto-Pay-API-Token': this.token,
          'Content-Type': 'application/json',
        },
        data,
      })

      if (response.data.ok) {
        return response.data.result
      } else {
        throw new Error(response.data.error?.name || 'CryptoBot API error')
      }
    } catch (error: any) {
      console.error('CryptoBot API error:', error.response?.data || error.message)
      throw error
    }
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    return this.makeRequest('POST', '/createInvoice', params)
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

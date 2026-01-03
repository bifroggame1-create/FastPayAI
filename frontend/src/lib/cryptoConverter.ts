/**
 * Crypto currency converter with dynamic rates support
 * Fetches rates from backend API, falls back to cached/default rates
 */

export type CryptoAsset = 'TON' | 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'USDC'

// Default fallback rates (updated periodically)
const DEFAULT_RATES: Record<CryptoAsset, number> = {
  TON: 285,      // 1 TON ≈ 285 RUB
  USDT: 105,     // 1 USDT ≈ 105 RUB
  BTC: 10500000, // 1 BTC ≈ 10,500,000 RUB
  ETH: 370000,   // 1 ETH ≈ 370,000 RUB
  LTC: 11000,    // 1 LTC ≈ 11,000 RUB
  USDC: 105,     // 1 USDC ≈ 105 RUB
}

// Cached rates with timestamp
interface CachedRates {
  rates: Record<CryptoAsset, number>
  timestamp: number
}

let cachedRates: CachedRates | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache TTL

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://fastpayai.onrender.com').replace(/\/+$/, '')

/**
 * Fetch exchange rates from backend API
 */
async function fetchRatesFromAPI(): Promise<Record<CryptoAsset, number> | null> {
  try {
    const response = await fetch(`${API_URL}/exchange-rates`, {
      headers: {
        'X-Tenant-ID': process.env.NEXT_PUBLIC_TENANT_ID || 'fastpay'
      }
    })

    if (!response.ok) return null

    const data = await response.json()

    if (data.rates) {
      return data.rates as Record<CryptoAsset, number>
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get current exchange rates (with caching)
 */
export async function getExchangeRates(): Promise<Record<CryptoAsset, number>> {
  const now = Date.now()

  // Return cached rates if still valid
  if (cachedRates && (now - cachedRates.timestamp) < CACHE_TTL) {
    return cachedRates.rates
  }

  // Try to fetch from API
  const apiRates = await fetchRatesFromAPI()

  if (apiRates) {
    cachedRates = { rates: apiRates, timestamp: now }
    return apiRates
  }

  // Fallback to default rates
  return DEFAULT_RATES
}

/**
 * Get exchange rates synchronously (uses cache or defaults)
 */
export function getExchangeRatesSync(): Record<CryptoAsset, number> {
  if (cachedRates) {
    return cachedRates.rates
  }
  return DEFAULT_RATES
}

/**
 * Convert RUB amount to crypto amount
 */
export function convertRubToCrypto(rubAmount: number, asset: CryptoAsset): string {
  const rates = getExchangeRatesSync()
  const rate = rates[asset]

  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  const cryptoAmount = rubAmount / rate

  // Set precision based on crypto type
  let precision = 2
  if (asset === 'BTC' || asset === 'ETH') {
    precision = 8
  } else if (asset === 'TON') {
    precision = 4
  }

  return cryptoAmount.toFixed(precision)
}

/**
 * Convert crypto amount to RUB
 */
export function convertCryptoToRub(cryptoAmount: number, asset: CryptoAsset): number {
  const rates = getExchangeRatesSync()
  const rate = rates[asset]

  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  return cryptoAmount * rate
}

/**
 * Format crypto amount with symbol
 */
export function formatCryptoAmount(rubAmount: number, asset: CryptoAsset): string {
  const amount = convertRubToCrypto(rubAmount, asset)
  return `${amount} ${asset}`
}

/**
 * Get crypto symbol emoji
 */
export function getCryptoSymbol(asset: CryptoAsset): string {
  const symbols: Record<CryptoAsset, string> = {
    TON: '💎',
    USDT: '🟢',
    BTC: '₿',
    ETH: 'Ξ',
    LTC: 'Ł',
    USDC: '🟢',
  }
  return symbols[asset] || ''
}

/**
 * Initialize rates (call on app start)
 * Pre-fetches rates to avoid delay on first conversion
 */
export async function initExchangeRates(): Promise<void> {
  await getExchangeRates()
}

/**
 * Force refresh rates
 */
export async function refreshExchangeRates(): Promise<Record<CryptoAsset, number>> {
  cachedRates = null
  return getExchangeRates()
}

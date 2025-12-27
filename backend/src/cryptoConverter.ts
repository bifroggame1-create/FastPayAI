// Crypto currency converter for RUB to crypto

// Approximate exchange rates (update these regularly or fetch from API)
const EXCHANGE_RATES = {
  // 1 unit of crypto = X RUB
  TON: 285,      // 1 TON ≈ 285 RUB
  USDT: 105,     // 1 USDT ≈ 105 RUB
  BTC: 10500000, // 1 BTC ≈ 10,500,000 RUB
  ETH: 370000,   // 1 ETH ≈ 370,000 RUB
  LTC: 11000,    // 1 LTC ≈ 11,000 RUB
  USDC: 105,     // 1 USDC ≈ 105 RUB
}

export type CryptoAsset = keyof typeof EXCHANGE_RATES

/**
 * Convert RUB amount to crypto amount
 * @param rubAmount Amount in Russian Rubles
 * @param asset Crypto asset (TON, USDT, BTC, etc.)
 * @returns Amount in crypto with proper precision
 */
export function convertRubToCrypto(rubAmount: number, asset: CryptoAsset): string {
  const rate = EXCHANGE_RATES[asset]
  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  const cryptoAmount = rubAmount / rate

  // Set precision based on crypto type
  let precision = 2
  if (asset === 'BTC' || asset === 'ETH') {
    precision = 8 // High precision for expensive coins
  } else if (asset === 'TON') {
    precision = 4
  }

  return cryptoAmount.toFixed(precision)
}

/**
 * Get minimum payment amount for crypto asset
 */
export function getMinimumAmount(asset: CryptoAsset): string {
  const minimums: Record<CryptoAsset, string> = {
    TON: '0.1',
    USDT: '1',
    BTC: '0.00001',
    ETH: '0.001',
    LTC: '0.01',
    USDC: '1',
  }

  return minimums[asset] || '1'
}

/**
 * Format crypto amount for display
 */
export function formatCryptoAmount(amount: string, asset: CryptoAsset): string {
  return `${amount} ${asset}`
}

/**
 * Fragment API Integration for Telegram Stars and Premium
 * https://fragment.com/api
 */

import axios from 'axios'
import { logger } from './logger'

const FRAGMENT_API_URL = process.env.FRAGMENT_API_URL || 'https://fragment.com/api'
const FRAGMENT_API_KEY = process.env.FRAGMENT_API_KEY || ''

interface FragmentApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Send Stars to a Telegram user
 */
export async function sendStars(username: string, amount: number): Promise<FragmentApiResponse> {
  try {
    if (!FRAGMENT_API_KEY) {
      return {
        success: false,
        error: 'Fragment API key not configured'
      }
    }

    // Validate username format
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username

    logger.info({ username: cleanUsername, amount }, 'Sending Stars via Fragment API')

    const response = await axios.post(
      `${FRAGMENT_API_URL}/stars/send`,
      {
        username: cleanUsername,
        amount
      },
      {
        headers: {
          'Authorization': `Bearer ${FRAGMENT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    )

    if (response.data.success) {
      logger.info({ username: cleanUsername, amount, orderId: response.data.orderId }, 'Stars sent successfully')
      return {
        success: true,
        data: {
          orderId: response.data.orderId,
          transactionHash: response.data.transactionHash,
          username: cleanUsername,
          amount
        }
      }
    } else {
      logger.error({ username: cleanUsername, amount, error: response.data.error }, 'Failed to send Stars')
      return {
        success: false,
        error: response.data.error || 'Failed to send Stars'
      }
    }
  } catch (error: any) {
    logger.error({ username, amount, error: error.message }, 'Fragment API error - sendStars')

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.error || error.message

      if (status === 404) {
        return { success: false, error: `Username @${username} not found on Telegram` }
      } else if (status === 400) {
        return { success: false, error: `Invalid request: ${message}` }
      } else if (status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' }
      } else if (status === 401 || status === 403) {
        return { success: false, error: 'Fragment API authentication failed' }
      }
    } else if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'Request timeout. Please try again.' }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Cannot connect to Fragment API' }
    }

    return {
      success: false,
      error: error.message || 'Failed to send Stars'
    }
  }
}

/**
 * Activate Premium subscription for a Telegram user
 */
export async function activatePremium(username: string, months: number): Promise<FragmentApiResponse> {
  try {
    if (!FRAGMENT_API_KEY) {
      return {
        success: false,
        error: 'Fragment API key not configured'
      }
    }

    // Validate months (must be 3, 6, or 12)
    if (![3, 6, 12].includes(months)) {
      return {
        success: false,
        error: 'Invalid subscription period. Must be 3, 6, or 12 months'
      }
    }

    const cleanUsername = username.startsWith('@') ? username.substring(1) : username

    logger.info({ username: cleanUsername, months }, 'Activating Premium via Fragment API')

    const response = await axios.post(
      `${FRAGMENT_API_URL}/premium/activate`,
      {
        username: cleanUsername,
        months
      },
      {
        headers: {
          'Authorization': `Bearer ${FRAGMENT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    )

    if (response.data.success) {
      logger.info({ username: cleanUsername, months, orderId: response.data.orderId }, 'Premium activated successfully')
      return {
        success: true,
        data: {
          orderId: response.data.orderId,
          username: cleanUsername,
          months,
          expiresAt: response.data.expiresAt
        }
      }
    } else {
      logger.error({ username: cleanUsername, months, error: response.data.error }, 'Failed to activate Premium')
      return {
        success: false,
        error: response.data.error || 'Failed to activate Premium'
      }
    }
  } catch (error: any) {
    logger.error({ username, months, error: error.message }, 'Fragment API error - activatePremium')

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.error || error.message

      if (status === 404) {
        return { success: false, error: `Username @${username} not found on Telegram` }
      } else if (status === 400) {
        return { success: false, error: `Invalid request: ${message}` }
      } else if (status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' }
      } else if (status === 401 || status === 403) {
        return { success: false, error: 'Fragment API authentication failed' }
      }
    } else if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'Request timeout. Please try again.' }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Cannot connect to Fragment API' }
    }

    return {
      success: false,
      error: error.message || 'Failed to activate Premium'
    }
  }
}

/**
 * Validate if username exists on Telegram
 */
export async function validateUsername(username: string): Promise<{ exists: boolean; error?: string }> {
  try {
    if (!FRAGMENT_API_KEY) {
      return {
        exists: false,
        error: 'Fragment API key not configured'
      }
    }

    const cleanUsername = username.startsWith('@') ? username.substring(1) : username

    const response = await axios.get(
      `${FRAGMENT_API_URL}/user/validate/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${FRAGMENT_API_KEY}`
        },
        timeout: 10000 // 10 second timeout
      }
    )

    return {
      exists: response.data.exists === true
    }
  } catch (error: any) {
    logger.error({ username, error: error.message }, 'Fragment API error - validateUsername')

    if (error.response?.status === 404) {
      return { exists: false }
    }

    return {
      exists: false,
      error: error.message || 'Failed to validate username'
    }
  }
}

/**
 * Check if Fragment API is configured and operational
 */
export function isFragmentApiConfigured(): boolean {
  return !!FRAGMENT_API_KEY && FRAGMENT_API_KEY.length > 10
}

/**
 * Get Fragment API configuration status
 */
export function getFragmentApiStatus() {
  return {
    configured: isFragmentApiConfigured(),
    apiUrl: FRAGMENT_API_URL,
    keyConfigured: !!FRAGMENT_API_KEY
  }
}

logger.info({ configured: isFragmentApiConfigured() }, 'Fragment API module loaded')

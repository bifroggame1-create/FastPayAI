/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on startup to fail fast
 * if critical configuration is missing. Prevents runtime errors and
 * ensures production deployments have all necessary configuration.
 */

interface EnvValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface EnvVarConfig {
  name: string
  required: boolean
  productionOnly?: boolean
  validateFn?: (value: string) => { valid: boolean; error?: string }
}

const ENV_VARS: EnvVarConfig[] = [
  // Database
  {
    name: 'MONGODB_URI',
    required: true,
    validateFn: (value) => {
      if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        return { valid: false, error: 'Must start with mongodb:// or mongodb+srv://' }
      }
      return { valid: true }
    }
  },
  {
    name: 'MONGODB_DB_NAME',
    required: true
  },

  // Frontend & CORS
  {
    name: 'FRONTEND_URL',
    required: true,
    validateFn: (value) => {
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return { valid: false, error: 'Must start with http:// or https://' }
      }
      return { valid: true }
    }
  },

  // Payment Providers (at least one required)
  {
    name: 'CRYPTOBOT_TOKEN',
    required: false // Optional if other payment methods exist
  },
  {
    name: 'CACTUSPAY_TOKEN',
    required: false
  },
  {
    name: 'XROCKET_TOKEN',
    required: false
  },

  // Telegram Integration
  {
    name: 'BOT_TOKEN',
    required: true,
    validateFn: (value) => {
      // Telegram bot tokens format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
      if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(value)) {
        return { valid: false, error: 'Invalid Telegram bot token format' }
      }
      return { valid: true }
    }
  },
  {
    name: 'ADMIN_IDS',
    required: true,
    validateFn: (value) => {
      const ids = value.split(',').map(id => id.trim())
      if (ids.length === 0 || ids.some(id => !/^\d+$/.test(id))) {
        return { valid: false, error: 'Must be comma-separated numeric Telegram IDs' }
      }
      return { valid: true }
    }
  },

  // Security
  {
    name: 'JWT_SECRET',
    required: true,
    validateFn: (value) => {
      if (value.length < 32) {
        return { valid: false, error: 'Must be at least 32 characters for security' }
      }
      return { valid: true }
    }
  },
  {
    name: 'DELIVERY_SECRET',
    required: false,
    productionOnly: true,
    validateFn: (value) => {
      if (value && value.length !== 64) {
        return { valid: false, error: 'Must be 64 hex characters (openssl rand -hex 32)' }
      }
      return { valid: true }
    }
  },

  // Webhooks
  {
    name: 'WEBHOOK_BASE_URL',
    required: true,
    validateFn: (value) => {
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return { valid: false, error: 'Must start with http:// or https://' }
      }
      if (process.env.NODE_ENV === 'production' && !value.startsWith('https://')) {
        return { valid: false, error: 'Must use https:// in production' }
      }
      return { valid: true }
    }
  },

  // Environment
  {
    name: 'NODE_ENV',
    required: true,
    validateFn: (value) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return { valid: false, error: 'Must be development, production, or test' }
      }
      return { valid: true }
    }
  },

  // Multi-tenant
  {
    name: 'DEFAULT_TENANT_ID',
    required: false // Falls back to 'fastpay' in code
  }
]

/**
 * Validates all environment variables and returns detailed results
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const isProduction = process.env.NODE_ENV === 'production'

  // Check each configured environment variable
  for (const config of ENV_VARS) {
    const value = process.env[config.name]

    // Skip production-only checks in development
    if (config.productionOnly && !isProduction) {
      continue
    }

    // Check if required variable is missing
    if (config.required && !value) {
      errors.push(`❌ ${config.name} is required but not set`)
      continue
    }

    // Skip validation if variable is optional and not set
    if (!value) {
      if (!config.required) {
        warnings.push(`⚠️  ${config.name} is not set (optional)`)
      }
      continue
    }

    // Run custom validation if provided
    if (config.validateFn) {
      const result = config.validateFn(value)
      if (!result.valid) {
        errors.push(`❌ ${config.name}: ${result.error}`)
      }
    }
  }

  // Check that at least one payment provider is configured
  const hasPaymentProvider =
    process.env.CRYPTOBOT_TOKEN ||
    process.env.CACTUSPAY_TOKEN ||
    process.env.XROCKET_TOKEN

  if (!hasPaymentProvider) {
    warnings.push('⚠️  No payment providers configured (CRYPTOBOT_TOKEN, CACTUSPAY_TOKEN, or XROCKET_TOKEN)')
  }

  // Production-specific checks
  if (isProduction) {
    if (!process.env.DELIVERY_SECRET) {
      warnings.push('⚠️  DELIVERY_SECRET is not set - delivery data encryption disabled')
    }

    if (process.env.ALLOW_DEV_AUTH === 'true') {
      warnings.push('⚠️  ALLOW_DEV_AUTH is enabled in production - this is insecure!')
    }

    if (!process.env.REDIS_URL) {
      warnings.push('⚠️  REDIS_URL not set - caching disabled (performance impact)')
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      warnings.push('⚠️  SMTP not configured - email notifications disabled')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates environment and exits process if critical errors found
 * Call this at the very start of your application
 */
export function validateEnvironmentOrExit(): void {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Validating Environment Variables...')
  console.log('='.repeat(60))

  const result = validateEnvironment()

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\nWarnings:')
    result.warnings.forEach(warning => console.log(warning))
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error('\n❌ Environment Validation Failed!\n')
    result.errors.forEach(error => console.error(error))
    console.error('\nPlease fix the above errors and restart the application.')
    console.error('Refer to .env.example for required variables.\n')
    process.exit(1)
  }

  console.log('\n✅ Environment validation passed!')
  console.log('='.repeat(60) + '\n')
}

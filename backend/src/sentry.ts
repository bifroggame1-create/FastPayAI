import * as Sentry from '@sentry/node'

const SENTRY_DSN = process.env.SENTRY_DSN

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: 0.2, // 20% of transactions

    // Release tracking
    release: process.env.npm_package_version || '1.0.0',

    // Server name for identification
    serverName: process.env.RENDER_SERVICE_NAME || 'fastpay-backend',

    // Capture unhandled rejections
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })

  console.log('[Sentry] Initialized successfully')
}

// Export Sentry for use in other files
export { Sentry }

// Helper to capture errors with context
export function captureError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    console.error('[Error]', error.message, context)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    Sentry.captureException(error)
  })
}

// Helper to add breadcrumb
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

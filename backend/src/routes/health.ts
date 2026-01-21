import { FastifyInstance } from 'fastify'
import { redis } from '../redis'
import { getDB } from '../database'

// Track server start time for uptime calculation
const startTime = Date.now()

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
  const start = Date.now()
  try {
    const db = getDB()
    await db.admin().ping()
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<{ status: 'ok' | 'error' | 'disabled'; latency?: number; error?: string }> {
  if (!redis.isEnabled()) {
    return { status: 'disabled' }
  }

  const start = Date.now()
  try {
    // Test Redis by attempting a simple get operation
    // If Redis is connected, this will work even if key doesn't exist
    await redis.get('health:check')
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Redis connection failed'
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'ok' | 'warning'; used: number; total: number; percentage: number } {
  const usage = process.memoryUsage()
  const used = usage.heapUsed
  const total = usage.heapTotal
  const percentage = (used / total) * 100

  return {
    status: percentage > 90 ? 'warning' : 'ok',
    used,
    total,
    percentage: Math.round(percentage * 100) / 100
  }
}

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Basic liveness probe - returns 200 if server is running
   * Fast endpoint without dependency checks
   */
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness probe',
      description: 'Basic health check - returns OK if server is running',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Server uptime in seconds' },
            mode: { type: 'string', example: 'production' },
            version: { type: 'string', example: '2.2.0' },
            cache: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                type: { type: 'string', example: 'redis' }
              }
            }
          }
        }
      }
    },
    config: {
      rateLimit: false // Bypass rate limiting for health checks
    }
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    mode: process.env.NODE_ENV || 'production',
    version: '2.2.0',
    buildTime: '2024-12-29T01:00:00Z',
    cache: {
      enabled: redis.isEnabled(),
      type: 'redis'
    }
  }))

  /**
   * GET /ready
   * Readiness probe - checks if server can handle requests
   * Verifies critical dependencies: database, cache, memory
   */
  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe',
      description: 'Checks if server is ready to handle requests (database, cache, memory)',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'object' },
                redis: { type: 'object' },
                memory: { type: 'object' }
              }
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error'] },
            timestamp: { type: 'string', format: 'date-time' },
            checks: { type: 'object' }
          }
        }
      }
    },
    config: {
      rateLimit: false
    }
  }, async (request, reply) => {
    // Run all health checks in parallel
    const [dbCheck, redisCheck, memCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      Promise.resolve(checkMemory())
    ])

    // Determine overall status
    let status: 'ok' | 'degraded' | 'error' = 'ok'

    // Database is critical - if down, service is not ready
    if (dbCheck.status === 'error') {
      status = 'error'
    }
    // Redis/memory issues are degraded (app works but not optimal)
    else if (redisCheck.status === 'error' || memCheck.status === 'warning') {
      status = 'degraded'
    }

    const response = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memCheck
      }
    }

    // Return 503 if critical services are down
    const statusCode = status === 'error' ? 503 : 200
    reply.code(statusCode).send(response)
  })

  /**
   * GET /healthz - Kubernetes liveness probe alias
   */
  fastify.get('/healthz', {
    config: { rateLimit: false }
  }, async (request, reply) => {
    reply.redirect(301, '/health')
  })

  /**
   * GET /readyz - Kubernetes readiness probe alias
   */
  fastify.get('/readyz', {
    config: { rateLimit: false }
  }, async (request, reply) => {
    reply.redirect(301, '/ready')
  })

  // Debug route to list all registered routes
  fastify.get('/health/routes', async () => {
    const routes: string[] = []
    fastify.printRoutes({ includeHooks: false, commonPrefix: false }).split('\n').forEach(line => {
      if (line.trim()) routes.push(line.trim())
    })
    return {
      status: 'ok',
      routeCount: routes.length,
      routes
    }
  })
}

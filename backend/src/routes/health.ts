import { FastifyInstance } from 'fastify'
import { redis } from '../redis'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check endpoint',
      description: 'Returns server status, version, and cache information',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            mode: { type: 'string', example: 'production' },
            version: { type: 'string', example: '2.0.0' },
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
    }
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'production',
    version: '2.0.0',
    cache: {
      enabled: redis.isEnabled(),
      type: 'redis'
    }
  }))
}

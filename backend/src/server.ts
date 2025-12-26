import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import { connectToDatabase } from './utils/database'
import productRoutes from './routes/products'
import userRoutes from './routes/users'
import orderRoutes from './routes/orders'

dotenv.config()

const fastify = Fastify({
  logger: true,
})

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    })

    // Connect to MongoDB
    await connectToDatabase()

    // Register routes
    await fastify.register(productRoutes)
    await fastify.register(userRoutes)
    await fastify.register(orderRoutes)

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Start server
    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })
    console.log(`Server is running on http://${host}:${port}`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()

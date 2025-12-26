import { FastifyInstance } from 'fastify'
import { ObjectId } from 'mongodb'
import { getDatabase } from '../utils/database'
import { Order } from '../types'

export default async function orderRoutes(fastify: FastifyInstance) {
  const db = getDatabase()
  const ordersCollection = db.collection<Order>('orders')

  // Get orders by user ID
  fastify.get('/orders/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }

    const orders = await ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()

    return orders
  })

  // Create new order
  fastify.post('/orders', async (request, reply) => {
    const orderData = request.body as Partial<Order>

    if (!orderData.userId || !orderData.products || orderData.products.length === 0) {
      return reply.code(400).send({ error: 'Invalid order data' })
    }

    const order: Order = {
      userId: orderData.userId,
      products: orderData.products,
      totalPrice: orderData.totalPrice || 0,
      status: 'pending',
      createdAt: new Date(),
    }

    const result = await ordersCollection.insertOne(order as any)

    // Update user stats
    const usersCollection = db.collection('users')
    await usersCollection.updateOne(
      { id: order.userId },
      { $inc: { 'stats.ordersCount': 1 } }
    )

    return { ...order, _id: result.insertedId }
  })

  // Get order by ID
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) })

    if (!order) {
      return reply.code(404).send({ error: 'Order not found' })
    }

    return order
  })
}

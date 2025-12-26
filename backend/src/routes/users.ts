import { FastifyInstance } from 'fastify'
import { getDatabase } from '../utils/database'
import { User } from '../types'

export default async function userRoutes(fastify: FastifyInstance) {
  const db = getDatabase()
  const usersCollection = db.collection<User>('users')

  // Get user by ID
  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await usersCollection.findOne({ id })

    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }

    return user
  })

  // Create or update user
  fastify.post('/users', async (request, reply) => {
    const userData = request.body as Partial<User>

    if (!userData.id) {
      return reply.code(400).send({ error: 'User ID is required' })
    }

    const existingUser = await usersCollection.findOne({ id: userData.id })

    if (existingUser) {
      return existingUser
    }

    const user: User = {
      id: userData.id,
      name: userData.name || 'User',
      avatar: userData.avatar,
      joinedAt: new Date(),
      stats: {
        rating: 0,
        reviewsCount: 0,
        ordersCount: 0,
        returnsCount: 0,
      },
    }

    await usersCollection.insertOne(user as any)

    return user
  })
}

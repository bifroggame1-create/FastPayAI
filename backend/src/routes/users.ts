import { FastifyInstance } from 'fastify'
import { validateBody, createUserSchema } from '../validation'
import { upsertUser, getUserById } from '../dataStore'

export async function userRoutes(fastify: FastifyInstance) {
  // Get user by ID
  fastify.get('/users/:id', async (request) => {
    const { id } = request.params as any
    const user = await getUserById(id)
    return user || { error: 'User not found' }
  })

  // Create or update user
  fastify.post('/users', async (request) => {
    try {
      const data = validateBody(createUserSchema, request.body)

      const user = await upsertUser({
        id: data.id,
        name: data.name,
        username: data.username,
        avatar: data.avatar,
        referredBy: data.referredBy,
        createdAt: new Date().toISOString()
      })

      return { success: true, user }
    } catch (error: any) {
      return {
        success: false,
        error: error.error || error.message,
        details: error.details
      }
    }
  })
}

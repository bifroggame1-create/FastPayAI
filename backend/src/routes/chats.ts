import { FastifyInstance } from 'fastify'
import { validateBody, createChatSchema } from '../validation'
import { addChat, getChatsByUserId, getChatById, Chat } from '../dataStore'

export async function chatRoutes(fastify: FastifyInstance) {
  // Create chat
  fastify.post('/chats/create', async (request, reply) => {
    try {
      const data = validateBody(createChatSchema, request.body)

      // Check if chat already exists between these users for this product
      const existingChats = await getChatsByUserId(data.buyerId)
      const existingChat = existingChats.find(
        c => c.participants.includes(data.sellerId) && c.productId === data.productId
      )

      if (existingChat) {
        return { success: true, chat: existingChat, existing: true }
      }

      const chat: Chat = {
        id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        participants: [data.buyerId, data.sellerId],
        productId: data.productId,
        productName: data.productName,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      }

      const savedChat = await addChat(chat)
      return { success: true, chat: savedChat }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Get user's chats
  fastify.get('/chats/user/:userId', async (request) => {
    const { userId } = request.params as any
    const chats = await getChatsByUserId(userId)
    return { success: true, chats }
  })

  // Get chat by ID
  fastify.get('/chats/:id', async (request, reply) => {
    const { id } = request.params as any
    const chat = await getChatById(id)

    if (!chat) {
      reply.code(404)
      return { success: false, error: 'Chat not found' }
    }

    return { success: true, chat }
  })
}

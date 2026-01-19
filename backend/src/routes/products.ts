import { FastifyInstance, FastifyRequest } from 'fastify'
import { validateQuery, productQuerySchema, favoriteIdsSchema } from '../validation'
import { searchProducts, getSearchSuggestions } from '../searchUtils'
import { loadProducts, getProductById } from '../dataStore'
import { optionalAuthMiddleware, authMiddleware } from '../auth'
import { getProductAnalyticsCollection, ProductAnalytics, ProductAnalyticsAction } from '../database'

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'fastpay'

function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}

// Products decorator for backward compatibility with admin routes
declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
  }
}

export async function productRoutes(fastify: FastifyInstance) {
  // Get all products with optional filtering - NOW READS FROM MONGODB
  fastify.get('/products', { preHandler: optionalAuthMiddleware }, async (request) => {
    const query = validateQuery(productQuerySchema, request.query)

    // Always load fresh from MongoDB for data consistency
    // Pass tenantId from request context (set by tenant middleware)
    let products = await loadProducts(request.tenantId)

    // Update in-memory cache for admin routes compatibility
    fastify.products = products

    // Check if user is authenticated and has admin/seller rights
    const user = (request as any).user
    const showAll = (request.query as any).showAll === 'true'

    // Only admins and sellers can see disabled products (when showAll=true)
    const canSeeAll = user && (user.isAdmin || user.isSeller)

    // Filter out disabled products for regular users (isEnabled !== false)
    // Products without isEnabled field are considered enabled (backward compat)
    if (!showAll || !canSeeAll) {
      products = products.filter(p => p.isEnabled !== false)
    }

    // Apply category filter
    if (query.category) {
      products = products.filter(p => p.category === query.category)
    }

    // Apply condition filter
    if (query.condition && query.condition !== 'all') {
      products = products.filter(p => p.condition === query.condition)
    }

    // Apply search
    if (query.search) {
      products = searchProducts(products, query.search)
    }

    // Apply tag filter
    if (query.tags) {
      // Support both single tag and array of tags
      const tagIds = Array.isArray(query.tags) ? query.tags : [query.tags]
      products = products.filter(p =>
        p.tags && p.tags.some((tagId: string) => tagIds.includes(tagId))
      )
    }

    return products
  })

  // Search suggestions - load from MongoDB
  fastify.get('/products/search/suggestions', async (request) => {
    const { q } = request.query as any
    const products = await loadProducts(request.tenantId)
    return getSearchSuggestions(products, q || '')
  })

  // Get single product by ID - load from MongoDB
  fastify.get('/products/:id', async (request) => {
    const { id } = request.params as any
    const product = await getProductById(id, request.tenantId)
    return product || { error: 'Product not found' }
  })

  // Get favorite products by IDs - load from MongoDB
  fastify.post('/products/favorites', async (request) => {
    const { favoriteIds } = request.body as any
    if (!favoriteIds || favoriteIds.length === 0) return []
    const products = await loadProducts(request.tenantId)
    return products.filter(p => favoriteIds.includes(p._id))
  })

  // Track product analytics (view, favorite, cart, purchase_attempt)
  fastify.post('/products/:id/track', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const authenticatedUser = (request as any).user
      const {
        action
      } = request.body as {
        action: ProductAnalyticsAction
      }

      // SECURITY FIX #7: Use authenticated userId from JWT instead of accepting from body
      const userId = authenticatedUser.userId
      const userName = authenticatedUser.username || `User ${userId}`
      const userUsername = authenticatedUser.username
      const userAvatar = authenticatedUser.avatar

      // Validate action
      const validActions: ProductAnalyticsAction[] = ['view', 'favorite', 'cart', 'purchase_attempt']
      if (!validActions.includes(action)) {
        return reply.code(400).send({ error: 'Invalid action' })
      }

      // Get product to extract seller info
      const product = await getProductById(id, request.tenantId)
      if (!product) {
        return reply.code(404).send({ error: 'Product not found' })
      }

      // Create analytics record
      const analytics: ProductAnalytics = {
        tenantId: reqTenantId(request),
        id: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: id,
        productName: product.name,
        sellerId: product.seller.id,
        userId,
        userName,
        userUsername,
        userAvatar,
        action,
        createdAt: new Date().toISOString()
      }

      await getProductAnalyticsCollection().insertOne(analytics as any)

      return { success: true }
    } catch (error) {
      console.error('Error tracking product analytics:', error)
      return reply.code(500).send({ error: 'Failed to track analytics' })
    }
  })
}

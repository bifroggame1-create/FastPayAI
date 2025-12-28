import { FastifyInstance } from 'fastify'
import { validateQuery, productQuerySchema, favoriteIdsSchema } from '../validation'
import { searchProducts, getSearchSuggestions } from '../searchUtils'

// Products will be injected via decorator
declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
  }
}

export async function productRoutes(fastify: FastifyInstance) {
  // Get all products with optional filtering
  fastify.get('/products', async (request) => {
    const query = validateQuery(productQuerySchema, request.query)
    let products = fastify.products

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

    return products
  })

  // Search suggestions
  fastify.get('/products/search/suggestions', async (request) => {
    const { q } = request.query as any
    return getSearchSuggestions(fastify.products, q || '')
  })

  // Get single product by ID
  fastify.get('/products/:id', async (request) => {
    const { id } = request.params as any
    const product = fastify.products.find(p => p._id === id)
    return product || { error: 'Product not found' }
  })

  // Get favorite products by IDs
  fastify.post('/products/favorites', async (request) => {
    const { favoriteIds } = request.body as any
    if (!favoriteIds || favoriteIds.length === 0) return []
    return fastify.products.filter(p => favoriteIds.includes(p._id))
  })
}

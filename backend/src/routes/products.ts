import { FastifyInstance } from 'fastify'
import { ObjectId } from 'mongodb'
import { getDatabase } from '../utils/database'
import { Product } from '../types'

export default async function productRoutes(fastify: FastifyInstance) {
  const db = getDatabase()
  const productsCollection = db.collection<Product>('products')

  // Get all products with filters
  fastify.get('/products', async (request, reply) => {
    const { category, condition, search } = request.query as {
      category?: string
      condition?: string
      search?: string
    }

    const filter: any = {}

    if (category && category !== 'all') {
      filter.category = category
    }

    if (condition && condition !== 'all') {
      filter.condition = condition
    }

    if (search) {
      filter.$text = { $search: search }
    }

    const products = await productsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return products
  })

  // Get product by ID
  fastify.get('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const product = await productsCollection.findOne({ _id: new ObjectId(id) })

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    return product
  })

  // Get favorite products
  fastify.post('/products/favorites', async (request, reply) => {
    const { favoriteIds } = request.body as { favoriteIds: string[] }

    if (!favoriteIds || favoriteIds.length === 0) {
      return []
    }

    const objectIds = favoriteIds.map(id => new ObjectId(id))
    const products = await productsCollection
      .find({ _id: { $in: objectIds } })
      .toArray()

    return products
  })

  // Create new product (admin only)
  fastify.post('/products', async (request, reply) => {
    const productData = request.body as Product

    const product: Product = {
      ...productData,
      createdAt: new Date(),
      inStock: true,
    }

    const result = await productsCollection.insertOne(product as any)

    return { ...product, _id: result.insertedId }
  })
}

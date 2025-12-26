import { connectToDatabase } from './database'
import { Product } from '../types'

const sampleProducts: Omit<Product, '_id'>[] = [
  {
    name: 'iPhone 16 128Gb Новый',
    price: 56990,
    images: [
      'https://images.unsplash.com/photo-1678652197142-d1e97f93148c?w=500',
    ],
    condition: 'new',
    category: 'phones',
    seller: {
      id: 'seller1',
      name: 'Эльшан А.',
      rating: 4.9,
    },
    rating: 4.9,
    description: 'Новый iPhone 16 с чеком и гарантией',
    inStock: true,
    createdAt: new Date('2025-12-26T02:49:00'),
  },
  {
    name: 'iPhone 17 Pro 256Gb Новый',
    price: 95990,
    images: [
      'https://images.unsplash.com/photo-1678652197142-d1e97f93148c?w=500',
    ],
    condition: 'new',
    category: 'phones',
    seller: {
      id: 'seller1',
      name: 'Эльшан А.',
      rating: 4.9,
    },
    rating: 4.9,
    description: 'Новый iPhone 17 Pro с чеком и гарантией',
    inStock: true,
    createdAt: new Date('2025-12-26T02:29:00'),
  },
  {
    name: 'iPhone 12 128Gb',
    price: 16800,
    images: [
      'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=500',
    ],
    condition: 'used',
    category: 'phones',
    seller: {
      id: 'seller2',
      name: 'Евгений Н.',
      rating: 5.0,
    },
    rating: 5.0,
    description: 'iPhone 12 в отличном состоянии',
    inStock: true,
    createdAt: new Date('2025-12-25T16:53:00'),
  },
  {
    name: 'AirPods Pro 2',
    price: 18990,
    images: [
      'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=500',
    ],
    condition: 'new',
    category: 'headphones',
    seller: {
      id: 'seller1',
      name: 'Эльшан А.',
      rating: 4.9,
    },
    rating: 4.8,
    description: 'Новые AirPods Pro 2 поколения',
    inStock: true,
    createdAt: new Date('2025-12-26T10:15:00'),
  },
  {
    name: 'Apple Watch Series 9',
    price: 32990,
    images: [
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500',
    ],
    condition: 'new',
    category: 'watches',
    seller: {
      id: 'seller3',
      name: 'Анна К.',
      rating: 4.7,
    },
    rating: 4.8,
    description: 'Apple Watch Series 9, 45mm',
    inStock: true,
    createdAt: new Date('2025-12-26T09:30:00'),
  },
  {
    name: 'iPad Air M2 128Gb',
    price: 54990,
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500',
    ],
    condition: 'new',
    category: 'tablets',
    seller: {
      id: 'seller1',
      name: 'Эльшан А.',
      rating: 4.9,
    },
    rating: 4.9,
    description: 'Новый iPad Air с чипом M2',
    inStock: true,
    createdAt: new Date('2025-12-26T08:00:00'),
  },
]

async function seed() {
  try {
    const db = await connectToDatabase()
    const productsCollection = db.collection('products')

    // Clear existing products
    await productsCollection.deleteMany({})

    // Insert sample products
    await productsCollection.insertMany(sampleProducts as any)

    console.log(`Seeded ${sampleProducts.length} products`)
    process.exit(0)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

seed()

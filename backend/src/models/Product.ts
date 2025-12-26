import { ObjectId } from 'mongodb'
import { Product } from '../types'

export const productSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'price', 'images', 'condition', 'category', 'seller', 'rating', 'createdAt', 'inStock'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Product name is required'
        },
        price: {
          bsonType: 'number',
          description: 'Product price is required'
        },
        images: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Product images array is required'
        },
        condition: {
          enum: ['new', 'used'],
          description: 'Product condition must be new or used'
        },
        category: {
          bsonType: 'string',
          description: 'Product category is required'
        },
        seller: {
          bsonType: 'object',
          required: ['id', 'name', 'rating'],
          properties: {
            id: { bsonType: 'string' },
            name: { bsonType: 'string' },
            avatar: { bsonType: 'string' },
            rating: { bsonType: 'number' }
          }
        },
        rating: {
          bsonType: 'number',
          description: 'Product rating is required'
        },
        description: {
          bsonType: 'string'
        },
        inStock: {
          bsonType: 'bool',
          description: 'Product stock status is required'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Creation date is required'
        }
      }
    }
  }
}

export const createProductIndexes = async (collection: any) => {
  await collection.createIndex({ category: 1 })
  await collection.createIndex({ condition: 1 })
  await collection.createIndex({ name: 'text', description: 'text' })
  await collection.createIndex({ createdAt: -1 })
}

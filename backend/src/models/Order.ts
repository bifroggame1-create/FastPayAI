export const orderSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'products', 'totalPrice', 'status', 'createdAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        products: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['productId', 'quantity', 'price'],
            properties: {
              productId: { bsonType: 'string' },
              quantity: { bsonType: 'number' },
              price: { bsonType: 'number' }
            }
          }
        },
        totalPrice: {
          bsonType: 'number',
          description: 'Total price is required'
        },
        status: {
          enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
          description: 'Order status is required'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Creation date is required'
        }
      }
    }
  }
}

export const createOrderIndexes = async (collection: any) => {
  await collection.createIndex({ userId: 1 })
  await collection.createIndex({ createdAt: -1 })
  await collection.createIndex({ status: 1 })
}

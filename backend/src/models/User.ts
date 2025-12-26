export const userSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'name', 'joinedAt', 'stats'],
      properties: {
        id: {
          bsonType: 'string',
          description: 'User ID is required'
        },
        name: {
          bsonType: 'string',
          description: 'User name is required'
        },
        avatar: {
          bsonType: 'string'
        },
        joinedAt: {
          bsonType: 'date',
          description: 'Join date is required'
        },
        stats: {
          bsonType: 'object',
          required: ['rating', 'reviewsCount', 'ordersCount', 'returnsCount'],
          properties: {
            rating: { bsonType: 'number' },
            reviewsCount: { bsonType: 'number' },
            ordersCount: { bsonType: 'number' },
            returnsCount: { bsonType: 'number' }
          }
        }
      }
    }
  }
}

export const createUserIndexes = async (collection: any) => {
  await collection.createIndex({ id: 1 }, { unique: true })
}

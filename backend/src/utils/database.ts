import { MongoClient, Db } from 'mongodb'
import { createProductIndexes } from '../models/Product'
import { createUserIndexes } from '../models/User'
import { createOrderIndexes } from '../models/Order'

let db: Db | null = null

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  const dbName = process.env.MONGODB_DB_NAME || 'techshop'

  const client = new MongoClient(uri)
  await client.connect()

  db = client.db(dbName)

  // Create indexes
  await createProductIndexes(db.collection('products'))
  await createUserIndexes(db.collection('users'))
  await createOrderIndexes(db.collection('orders'))

  console.log('Connected to MongoDB')

  return db
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected')
  }
  return db
}

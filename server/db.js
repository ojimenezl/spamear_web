import mongoose from 'mongoose'

let cached = globalThis.__spamearMongoose

if (!cached) {
  cached = globalThis.__spamearMongoose = { conn: null, promise: null }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[db] MONGODB_URI missing — using memory fallback flag')
      return null
    }
    throw new Error('MONGODB_URI is required')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 5,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}

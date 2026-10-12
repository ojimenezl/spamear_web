import mongoose from 'mongoose'

let cached = globalThis.__spamearMongoose

if (!cached) {
  cached = globalThis.__spamearMongoose = { conn: null, promise: null }
}

/** Safe diagnostics for /api/health (no secrets). */
export function mongoEnvInfo() {
  const raw = process.env.MONGODB_URI || ''
  const uri = raw.trim()
  let host = null
  let dbName = null
  try {
    if (uri) {
      const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'https://'))
      host = u.hostname || null
      dbName = (u.pathname || '').replace(/^\//, '') || null
    }
  } catch {
    host = 'unparseable'
  }
  return {
    hasMongoUri: Boolean(uri),
    uriLength: uri.length,
    host,
    dbName,
    looksQuoted: raw.startsWith('"') || raw.startsWith("'"),
  }
}

export async function connectDb() {
  const uri = (process.env.MONGODB_URI || '').trim()
  if (!uri) {
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
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
      serverSelectionTimeoutMS: 10000,
    })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (err) {
    cached.promise = null
    cached.conn = null
    throw err
  }
}

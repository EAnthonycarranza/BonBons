import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * database connection on every reload until Atlas refuses them. Caching the
 * connection promise on globalThis survives those reloads.
 */
let cached = globalThis._mongoose;
if (!cached) cached = globalThis._mongoose = { conn: null, promise: null };

/** True when a database is configured. The site falls back to sample data when not. */
export function hasDatabase() {
  return Boolean(MONGODB_URI && MONGODB_URI.trim());
}

export async function connectToDatabase() {
  if (!hasDatabase()) return null;
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so the next request retries instead of reusing a rejected promise.
    cached.promise = null;
    console.error("MongoDB connection failed:", err.message);
    return null;
  }
  return cached.conn;
}

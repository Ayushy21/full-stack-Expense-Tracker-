/**
 * MongoDB connection for serverless (Vercel). Reuses cached client.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

export async function getMongoClient() {
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');
  if (cachedClient) return cachedClient;
  cachedClient = await MongoClient.connect(uri);
  return cachedClient;
}

export function getDb() {
  return getMongoClient().then((client) => client.db());
}

export function expensesCollection(db) {
  return db.collection('expenses');
}

export function idempotencyCollection(db) {
  return db.collection('idempotency_keys');
}

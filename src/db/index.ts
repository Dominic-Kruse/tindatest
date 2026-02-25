import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

dotenv.config();

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Use SSL for cloud databases (Neon, etc.) but not for localhost/CI test databases
const isLocalDatabase = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const client = postgres(process.env.DATABASE_URL, {
  ssl: isLocalDatabase ? false : 'require',
});

export const db = drizzle(client, { schema });

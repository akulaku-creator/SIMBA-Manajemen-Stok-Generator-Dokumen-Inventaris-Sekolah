import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST &&
      process.env.SQL_USER &&
      process.env.SQL_PASSWORD &&
      process.env.SQL_DB_NAME
  );
}

function createPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error('Database environment variables (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME) are not configured.');
  }

  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });
}

export function getPool(): Pool {
  if (!_pool) {
    _pool = createPool();
  }
  return _pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export * from './schema.ts';

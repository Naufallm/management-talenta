import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import '../config.ts';
export interface DB {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function connectDb(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    const wrapper = (client: pg.Pool | pg.PoolClient): DB => ({
      query: async (sql, params = []) => (await client.query(sql, params)).rows,
      transaction: async (fn) => {
        const connection = await pool.connect();
        try {
          await connection.query('BEGIN');
          const result = await fn(wrapper(connection));
          await connection.query('COMMIT');
          return result;
        } catch (e) {
          await connection.query('ROLLBACK');
          throw e;
        } finally {
          connection.release();
        }
      },
      close: () => pool.end(),
    });
    return wrapper(pool);
  }
  const dir = process.env.PGLITE_DIR || './data/postgres';
  if (dir !== 'memory://') await mkdir(resolve(dir), { recursive: true });
  const embedded = new PGlite(dir === 'memory://' ? undefined : resolve(dir));
  await embedded.waitReady;
  const wrapper = (client: any): DB => ({
    query: async (sql, params = []) => (await client.query(sql, params)).rows,
    transaction: (fn) => client.transaction((tx: any) => fn(wrapper(tx))),
    close: () => embedded.close(),
  });
  return wrapper(embedded);
}
export async function migrate(db: DB) {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const dir = new URL('./migrations/', import.meta.url);
  for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort()) {
    if ((await db.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).length)
      continue;
    const sql = await readFile(new URL(name, dir), 'utf8');
    await db.transaction(async (tx) => {
      // Migration SQL has no user-controlled content. Each statement is executed inside one transaction.
      for (const statement of sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    });
  }
}

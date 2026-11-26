import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import lockfile from 'proper-lockfile';
import '../config.ts';
import { postgresSchemaConfig } from './schema.ts';
export interface DB {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function connectDb({ lockWaitMs = 0 }: { lockWaitMs?: number } = {}): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const config = postgresSchemaConfig(
      process.env.DATABASE_URL,
      process.env.DB_SCHEMA || 'public',
    );
    const pool = new pg.Pool({ connectionString: config.connectionString, max: 10 });
    try {
      const { rows } = await pool.query('SELECT current_schema() AS schema');
      if (rows[0]?.schema !== config.schema)
        throw new Error(
          `Schema ${config.schema} belum tersedia atau tidak dapat diakses. Buat schema dan berikan akses sebelum menjalankan aplikasi.`,
        );
    } catch (error) {
      await pool.end();
      throw error;
    }
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
  const persistent = dir !== 'memory://';
  let release: (() => Promise<void>) | undefined;
  if (persistent) {
    await mkdir(resolve(dir), { recursive: true });
    try {
      if (lockWaitMs && (await lockfile.check(resolve(dir), { stale: 30_000 })))
        console.info('Menunggu database lokal dilepas oleh proses API sebelumnya...');
      release = await lockfile.lock(resolve(dir), {
        stale: 30_000,
        update: 10_000,
        retries: lockWaitMs
          ? { retries: Math.ceil(lockWaitMs / 250), factor: 1, minTimeout: 250, maxTimeout: 250 }
          : 0,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ELOCKED')
        throw new Error(
          `Database lokal ${resolve(dir)} sedang digunakan proses lain. Hentikan API sebelum menjalankan setup, seed, migrasi, atau reset akun. Jika proses berhenti paksa, tunggu 30 detik sebelum mencoba lagi.`,
          { cause: error },
        );
      throw error;
    }
  }
  let embedded: PGlite;
  try {
    embedded = new PGlite(persistent ? resolve(dir) : undefined);
    await embedded.waitReady;
  } catch (error) {
    await release?.();
    throw new Error(
      `Database ${persistent ? `lokal ${resolve(dir)}` : 'sementara'} gagal dibuka: ${(error as Error).message}. Pertahankan folder data untuk pemulihan; jangan menghapusnya atau menjalankan seed sebagai perbaikan.`,
      { cause: error },
    );
  }
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      await embedded.close();
      await release?.();
    })());
  const wrapper = (client: any): DB => ({
    query: async (sql, params = []) => (await client.query(sql, params)).rows,
    transaction: (fn) => client.transaction((tx: any) => fn(wrapper(tx))),
    close,
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

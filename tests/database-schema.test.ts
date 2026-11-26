import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { postgresSchemaConfig } from '../server/db/schema.ts';
import { migrate, type DB } from '../server/db/index.ts';

test('pooled PostgreSQL connections use only the selected schema, even with conflicting URL options', () => {
  const config = postgresSchemaConfig(
    'postgresql://user:example@localhost/db_magang?options=-c%20search_path%3Dpresensi&application_name=talenta',
    'management_talenta',
  );
  const client = new pg.Client({ connectionString: config.connectionString });
  const parameters = (
    client as pg.Client & {
      connectionParameters: { options: string; database: string; application_name: string };
    }
  ).connectionParameters;
  assert.equal(parameters.options, '-c search_path=management_talenta');
  assert.equal(parameters.database, 'db_magang');
  assert.equal(parameters.application_name, 'talenta');
  for (const schema of [
    'public, presensi',
    'x; DROP SCHEMA public',
    'pg_catalog',
    '',
    'a'.repeat(64),
  ])
    assert.throws(
      () => postgresSchemaConfig('postgresql://localhost/db_magang', schema),
      /DB_SCHEMA/,
    );
});

test('all migrations stay inside management_talenta with colliding tables in public preserved', async () => {
  const embedded = new PGlite();
  const wrapper = (client: any): DB => ({
    query: async (sql, params = []) => (await client.query(sql, params)).rows,
    transaction: (fn) => client.transaction((tx: any) => fn(wrapper(tx))),
    close: () => embedded.close(),
  });
  const db = wrapper(embedded);
  try {
    await embedded.exec(
      "CREATE TABLE public.users (sentinel text); INSERT INTO public.users VALUES ('preserved'); CREATE TABLE public.schema_migrations (name text); INSERT INTO public.schema_migrations VALUES ('001_initial.sql'); CREATE SCHEMA management_talenta; SET search_path = management_talenta",
    );
    await migrate(db);
    await migrate(db);
    assert.deepEqual(await db.query('SELECT * FROM public.users'), [{ sentinel: 'preserved' }]);
    assert.deepEqual(await db.query('SELECT * FROM public.schema_migrations'), [
      { name: '001_initial.sql' },
    ]);
    assert.deepEqual(await db.query('SELECT count(*)::int AS count FROM users'), [{ count: 0 }]);
    assert.equal(
      (await db.query<{ count: number }>('SELECT count(*)::int AS count FROM schema_migrations'))[0]
        .count,
      11,
    );
    assert.ok(
      (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='management_talenta'"))
        .length > 10,
    );
  } finally {
    await db.close();
  }
});

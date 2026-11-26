// Apply the startup search_path on every pooled connection, including transactions.
export function postgresSchemaConfig(connectionString: string, schema = 'public') {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema) || schema.startsWith('pg_'))
    throw new Error(
      'DB_SCHEMA harus berupa nama schema huruf kecil, angka, dan garis bawah (maksimal 63 karakter).',
    );
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL harus memakai protokol PostgreSQL.');
  // URL options override Pool.options in pg; set the URL value explicitly.
  // Exclude public and other application schemas to prevent table-name collisions.
  url.searchParams.set('options', `-c search_path=${schema}`);
  return { connectionString: url.toString(), schema };
}

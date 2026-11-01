import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  const example = await readFile('.env.example', 'utf8');
  await writeFile(
    '.env',
    example.replace(
      'DATA_ENCRYPTION_KEY=',
      'DATA_ENCRYPTION_KEY=' + randomBytes(32).toString('hex'),
    ),
    { flag: 'wx' },
  );
}
const { connectDb, migrate } = await import('../server/db/index.ts');
const { seed } = await import('../server/db/seed.ts');
const db = await connectDb();
try {
  await migrate(db);
  await seed(db);
  console.log(
    'Development database ready. Run npm run dev. See README.md for development accounts.',
  );
} finally {
  await db.close();
}

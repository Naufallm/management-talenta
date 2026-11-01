import { connectDb, migrate } from './index.ts';
import { seed } from './seed.ts';
const db = await connectDb();
try {
  await migrate(db);
  if (process.argv[2] === 'seed') await seed(db);
  console.log('Database ready.');
} finally {
  await db.close();
}

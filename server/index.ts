import { connectDb, migrate } from './db/index.ts';
import { createApp } from './app.ts';
import { encryptionKey } from './config.ts';
import { prepareTestingAccounts, testingLoginEnabled } from './testing-auth.ts';
encryptionKey();
const db = await connectDb();
await migrate(db);
if (testingLoginEnabled()) await prepareTestingAccounts(db);
const server = createApp(db).listen(Number(process.env.PORT) || 3001, '127.0.0.1', () =>
  console.log(`Talenta API: http://127.0.0.1:${process.env.PORT || 3001}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      void db.close().then(() => process.exit(0));
    }),
  );

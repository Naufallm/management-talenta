import type { Server } from 'node:http';
import { connectDb, migrate, type DB } from './db/index.ts';
import { createApp } from './app.ts';
import { encryptionKey } from './config.ts';
import { prepareTestingAccounts, testingLoginEnabled } from './testing-auth.ts';
import { ensureApiPortAvailable } from './startup.ts';

let db: DB | undefined;
let server: Server | undefined;
let stopping = false;
async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  try {
    await startup.catch(() => undefined);
    if (server?.listening)
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => (error ? reject(error) : resolve())),
      );
    await db?.close();
    process.exitCode = exitCode;
  } catch (error) {
    console.error('Talenta API gagal ditutup:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    if (process.connected) process.disconnect();
  }
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void shutdown());
process.on('message', (message) => {
  if (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === 'talenta:shutdown'
  )
    void shutdown();
});
if (process.send) process.on('disconnect', () => void shutdown());
async function start() {
  encryptionKey();
  const port = Number(process.env.PORT) || 3001;
  await ensureApiPortAvailable(port);
  db = await connectDb({ lockWaitMs: 35_000 });
  if (stopping) return;
  await migrate(db);
  if (testingLoginEnabled()) await prepareTestingAccounts(db);
  if (stopping) return;
  server = createApp(db).listen(port, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server!.once('listening', resolve);
    server!.once('error', reject);
  });
  console.log(`Talenta API: http://127.0.0.1:${port}`);
  if (process.connected) process.send!({ type: 'talenta:ready' });
}
const startup = start();
void startup.catch(async (error) => {
  console.error('Talenta API gagal dimulai:', (error as Error).message);
  await shutdown(1);
});

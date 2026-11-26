import { fork, type ChildProcess } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';

// Windows terminates child.kill(SIGTERM) immediately. Use IPC so PGlite can flush
// and release its lease before the next process opens the same data directory.
const watchers: FSWatcher[] = [];
let api: ChildProcess | undefined;
let closing = false;
let restarting = false;
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let web: ViteDevServer | undefined;
let webStartup: Promise<void> | undefined;

async function ready(child: ChildProcess) {
  if (
    closing ||
    pending ||
    restarting ||
    api !== child ||
    child.exitCode !== null ||
    child.signalCode !== null
  )
    return;
  // Open the website only after its API is ready, including stale-lease recovery.
  webStartup ??= (async () => {
    web = await createServer({
      server: {
        host: '127.0.0.1',
        ...(process.env.TALENTA_DEV_WEB_PORT === undefined
          ? {}
          : { port: Number(process.env.TALENTA_DEV_WEB_PORT) }),
      },
    });
    if (closing) return;
    await web.listen();
    web.printUrls();
  })();
  await webStartup;
  if (
    !closing &&
    !pending &&
    !restarting &&
    api === child &&
    child.exitCode === null &&
    child.signalCode === null &&
    process.connected
  ) {
    const address = web!.httpServer!.address();
    process.send!({
      type: 'talenta:ready',
      pid: child.pid,
      webPort: typeof address === 'object' ? address?.port : undefined,
    });
  }
}

function start() {
  if (closing) return;
  const child = (api = fork(fileURLToPath(new URL('../server/index.ts', import.meta.url)), [], {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    windowsHide: true,
  }));
  child.on('message', (message) => {
    if (
      message &&
      typeof message === 'object' &&
      'type' in message &&
      message.type === 'talenta:ready'
    ) {
      void ready(child).catch(async (error: Error) => {
        console.error('Web development gagal dijalankan:', error.message);
        await shutdown(1);
      });
    }
  });
  api.once('error', (error) => {
    console.error('API development gagal dijalankan:', error.message);
    void shutdown(1);
  });
  api.once('exit', (code) => {
    if (!closing && !restarting) {
      console.error(`API berhenti (kode ${code ?? 'signal'}). Periksa pesan kesalahan di atas.`);
      void shutdown(code || 1);
    }
  });
}
async function stop() {
  const child = api;
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.error(
        'API belum selesai ditutup; menghentikan proses. Startup berikutnya akan menunggu kunci database kedaluwarsa.',
      );
      child.kill();
    }, 50_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    if (child.connected)
      child.send({ type: 'talenta:shutdown' }, (error) => {
        if (error && child.exitCode === null)
          console.error('Gagal meminta penutupan API:', error.message);
      });
  });
}
async function restart() {
  if (closing || restarting) return;
  restarting = true;
  try {
    while (pending && !closing) {
      pending = false;
      console.log('Memuat ulang API setelah database ditutup...');
      await stop();
      start();
    }
  } finally {
    restarting = false;
  }
}
function queueRestart(reason = 'ipc') {
  if (process.env.TALENTA_DEV_DEBUG_WATCH === 'true') console.log('Restart requested:', reason);
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => void restart(), 250);
}
async function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  clearTimeout(timer);
  for (const watcher of watchers) watcher.close();
  await stop();
  await webStartup?.catch(() => undefined);
  await web?.close();
  process.exitCode = code;
  if (process.connected) process.disconnect();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void shutdown());
process.on('message', (message) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  if (message.type === 'talenta:shutdown') void shutdown();
  if (message.type === 'talenta:restart') queueRestart();
});
if (process.send) process.on('disconnect', () => void shutdown());
for (const directory of ['server', 'shared']) {
  watchers.push(
    watch(new URL(`../${directory}/`, import.meta.url), { recursive: true }, (_event, filename) => {
      if (filename && /\.(ts|sql)$/.test(filename.toString()))
        queueRestart(directory + '/' + filename.toString());
    }),
  );
}
watchers.push(
  watch(new URL('../', import.meta.url), (_event, filename) => {
    if (filename?.toString() === '.env') queueRestart('.env');
  }),
);
start();

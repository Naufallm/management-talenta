import { createServer } from 'node:net';

/** Check before opening PGlite: a duplicate API must never become a second database writer. */
export function ensureApiPortAvailable(port: number) {
  return new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(
              `Port API ${port} sudah digunakan. Gunakan API yang sedang berjalan atau hentikan proses tersebut sebelum memulai API baru.`,
              { cause: error },
            )
          : error,
      );
    });
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

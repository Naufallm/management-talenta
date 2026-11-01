import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { DB } from './db/index.ts';
import { authenticate } from './http.ts';
import { HttpError } from './errors.ts';
import { production } from './config.ts';
import { loginRouter, authRouter } from './routes/auth.ts';
import { employeeRouter } from './routes/employees.ts';
import { periodRouter } from './routes/periods.ts';
import { assessmentRouter } from './routes/assessments.ts';
import { evidenceRouter } from './routes/evidence.ts';
import { analyticsRouter } from './routes/analytics.ts';
export function createApp(db: DB) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              fontSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Terlalu banyak permintaan. Coba kembali sebentar lagi.' },
    }),
  );
  app.use(express.json({ limit: '100kb' }), cookieParser());
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.use('/api', loginRouter(db));
  const api = express.Router();
  api.use(authenticate(db));
  api.use(
    authRouter(db),
    employeeRouter(db),
    periodRouter(db),
    assessmentRouter(db),
    evidenceRouter(db),
    analyticsRouter(db),
  );
  app.use('/api', api);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint tidak ditemukan.')));
  if (production) {
    app.use(express.static(resolve('dist')));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
  }
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(422).json({
        message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' '),
        details: err.flatten(),
      });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message, details: err.details });
      return;
    }
    if (err instanceof multer.MulterError) {
      res.status(422).json({
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Ukuran berkas maksimal 2 MB.'
            : 'Berkas unggahan tidak valid.',
      });
      return;
    }
    if (err.code === '23505') {
      res.status(409).json({
        message:
          'Data duplikat. NIP/akun, periode, atau kombinasi pegawai dan bulan sudah digunakan.',
      });
      return;
    }
    if (['23503', '23514', '22P02'].includes(err.code)) {
      res.status(422).json({ message: 'Data tidak valid atau referensi tidak ditemukan.' });
      return;
    }
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'Format JSON tidak valid.' });
      return;
    }
    const reference = randomUUID();
    console.error('Request failed', reference, err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', reference });
  });
  return app;
}

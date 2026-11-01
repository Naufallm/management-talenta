import 'dotenv/config';
export const production = process.env.NODE_ENV === 'production';
export const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
if (production && (!process.env.DATABASE_URL || !origin.startsWith('https://')))
  throw new Error('Production requires DATABASE_URL and an HTTPS APP_ORIGIN.');
export function encryptionKey() {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value || !/^[\da-f]{64}$/i.test(value))
    throw new Error(
      'DATA_ENCRYPTION_KEY must contain 64 hexadecimal characters. Run npm run setup.',
    );
  return Buffer.from(value, 'hex');
}

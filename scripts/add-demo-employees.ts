import 'dotenv/config';
import { testingLoginEnabled, testingPassword } from '../server/testing-policy.ts';
import { addDemoEmployees } from './lib/demo-employees.ts';

if (!testingLoginEnabled())
  throw new Error('Aktifkan TEST_LOGIN_ENABLED di luar produksi untuk membuat data dummy.');
const base = `http://127.0.0.1:${Number(process.env.PORT) || 3001}/api`;
let cookie = '',
  csrf = '';
async function api(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${data.message || response.status}`);
  if (path === '/auth/login') {
    cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    csrf = data.csrfToken;
  }
  return data;
}
try {
  await api('POST', '/auth/login', {
    username: 'admin@bpskotabatu.com',
    password: testingPassword,
  });
  const result = await addDemoEmployees(api);
  console.log(
    `Total ${result.total} pegawai aktif. Ditambahkan ${result.created} pegawai, ${result.accounts} akun, dan ${result.scores} nilai dummy untuk ${result.year}.`,
  );
} finally {
  if (cookie) await api('POST', '/auth/logout');
}

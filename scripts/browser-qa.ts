import { chromium, expect, type Page } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mkdir } from 'node:fs/promises';
process.env.NODE_ENV = 'test';
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL;
process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);
process.env.APP_ORIGIN = 'http://127.0.0.1:5174';
const { connectDb, migrate } = await import('../server/db/index.ts');
const { seed } = await import('../server/db/seed.ts');
const { createApp } = await import('../server/app.ts');
const db = await connectDb();
await migrate(db);
await seed(db);
await db.query("UPDATE periods SET starts_on='2020-01-01',ends_on='2100-12-31'");
const apiServer = createApp(db).listen(0, '127.0.0.1');
await new Promise<void>((resolve) => apiServer.once('listening', resolve));
const apiPort = (apiServer.address() as { port: number }).port;
const vite = await createServer({
  configFile: false,
  plugins: [react(), tailwindcss()],
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
});
await vite.listen();
const base = `http://127.0.0.1:${(vite.httpServer!.address() as { port: number }).port}`;
const errors: string[] = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ready(page: Page) {
  await expect(page.locator('.loading')).toHaveCount(0);
  await expect(page.locator('.error-state')).toHaveCount(0);
  await expect(page.locator('.fatal-error')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
async function noOverflow(page: Page) {
  const ok = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  if (!ok) {
    console.log(
      'Overflow',
      page.url(),
      await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        elements: Array.from(document.querySelectorAll('body *'))
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 12)
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            right: e.getBoundingClientRect().right,
          })),
      })),
    );
    await page.screenshot({ path: 'docs/screenshots/overflow-debug.png', fullPage: true });
  }
  expect(ok).toBe(true);
}
async function login(page: Page, username: string) {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel('NIP atau nama akun').fill(username);
  await page
    .getByLabel('Kata sandi', { exact: true })
    .fill(process.env.SEED_PASSWORD || 'TalentaDev!2026');
  await page.getByRole('button', { name: 'Masuk ke akun' }).click();
  await expect(page.getByRole('heading', { name: 'Buat kata sandi baru' })).toBeVisible();
  await page.getByLabel('Kata sandi saat ini').fill(process.env.SEED_PASSWORD || 'TalentaDev!2026');
  await page.getByLabel('Kata sandi baru', { exact: true }).fill('BrowserQaSecure!2026');
  await page.getByLabel('Konfirmasi kata sandi baru').fill('BrowserQaSecure!2026');
  await page.getByRole('button', { name: 'Perbarui kata sandi' }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  await ready(page);
}
try {
  await mkdir('docs/screenshots', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await context.newPage();
  await login(page, 'superadmin');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
  await expect(page.locator('image[href="/assets/talent-point.svg"]').first()).toHaveAttribute(
    'width',
    '9',
  );
  await page.locator('image[href="/assets/talent-point.svg"]').first().click();
  await expect(page.getByRole('heading', { name: 'Detail Pegawai', exact: true })).toBeVisible();
  await ready(page);
  await page.getByRole('link', { name: 'Pegawai', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('heading', { name: 'Daftar Pegawai' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/pegawai-desktop.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Cari pegawai', exact: true }).fill('Aditya');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Aditya Pratama');
  await page.getByRole('textbox', { name: 'Cari pegawai', exact: true }).fill('');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('link', { name: 'Tambah Pegawai', exact: true }).click();
  await page.getByLabel('NIP', { exact: true }).fill('199901012024011998');
  await page.getByLabel('Nama lengkap').fill('Pegawai QA');
  await page.getByLabel('Jabatan', { exact: true }).fill('Statistisi');
  await page.getByLabel('Unit kerja', { exact: true }).fill('IPDS');
  await page.getByRole('button', { name: 'Tambah pegawai', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Detail Pegawai', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pegawai QA', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit Pegawai', exact: true }).click();
  await ready(page);
  await page.getByLabel('Nama lengkap').fill('Pegawai QA Edit');
  await page.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(page.getByRole('heading', { name: 'Pegawai QA Edit', exact: true })).toBeVisible();
  for (const tab of ['Potensi', 'Kompetensi', 'Kinerja CKP', 'Riwayat Talenta', 'Profil']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await ready(page);
  }
  for (const path of [
    '/penilaian',
    '/peta-talenta',
    '/ckp',
    '/pengaturan',
    '/laporan',
    '/tim',
    '/pengguna',
    '/audit',
    '/psikologi',
  ]) {
    await page.goto(base + path);
    await expect(page.locator('.topbar')).toBeVisible();
    await ready(page);
    await noOverflow(page);
  }
  await page.goto(base + '/pengaturan');
  await ready(page);
  for (const tab of ['Bank Soal Potensi', 'Bank Soal Psikologi', 'Konfigurasi Skor', 'Periode']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await ready(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/pegawai');
  await ready(page);
  await noOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/pegawai-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ready(page);
  await noOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true });
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } }),
    adminPage = await adminContext.newPage();
  await login(adminPage, 'admin');
  await expect(adminPage.getByRole('link', { name: 'Hasil Psikologi', exact: true })).toHaveCount(
    0,
  );
  await expect(adminPage.getByRole('link', { name: 'Pengguna & Peran', exact: true })).toHaveCount(
    0,
  );
  const employeeContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    employeePage = await employeeContext.newPage();
  await login(employeePage, '199001012020011011');
  for (const path of [
    '/profil',
    '/kompetensi',
    '/ckp',
    '/peta-talenta',
    '/asesmen-potensi',
    '/asesmen-psikologi',
  ]) {
    await employeePage.goto(base + path);
    await expect(employeePage.locator('.topbar')).toBeVisible();
    await ready(employeePage);
    await noOverflow(employeePage);
  }
  await employeePage.goto(base + '/asesmen-potensi');
  await ready(employeePage);
  const radio = employeePage.locator('input[type=radio]');
  for (let i = 0; i < 6; i++) await radio.nth(i * 5 + 3).check({ force: true });
  await employeePage.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(
    employeePage.getByRole('status').filter({ hasText: 'Draft jawaban disimpan.' }),
  ).toBeVisible();
  await employeePage.reload();
  await ready(employeePage);
  await expect(employeePage.locator('input[type=radio]:checked')).toHaveCount(6);
  await employeePage.getByRole('button', { name: 'Review & kirim' }).click();
  await employeePage.getByRole('button', { name: 'Kirim jawaban', exact: true }).click();
  await expect(employeePage.getByRole('heading', { name: 'Asesmen telah dikirim' })).toBeVisible();
  await expect(employeePage.locator('input[type=radio]').first()).toBeDisabled();
  await employeePage.screenshot({ path: 'docs/screenshots/asesmen-mobile.png', fullPage: true });
  // Reset only an isolated in-memory fixture to exercise partial leader drafts and review.
  await db.query("DELETE FROM leader_assessments WHERE employee_id='emp-7'");
  const leaderContext = await browser.newContext({ viewport: { width: 1280, height: 900 } }),
    leaderPage = await leaderContext.newPage();
  await login(leaderPage, '199001012020011001');
  await leaderPage.goto(base + '/penilaian-anggota');
  await ready(leaderPage);
  await leaderPage.getByRole('button', { name: 'Nilai anggota', exact: true }).click();
  await leaderPage.getByLabel('Kualitas pekerjaan (0–100)').fill('80');
  await leaderPage.getByRole('button', { name: 'Simpan draft', exact: true }).click();
  await expect(leaderPage.getByRole('dialog')).toHaveCount(0);
  await leaderPage.getByRole('button', { name: 'Nilai anggota', exact: true }).click();
  await expect(leaderPage.getByLabel('Kualitas pekerjaan (0–100)')).toHaveValue('80');
  await expect(leaderPage.getByRole('button', { name: 'Review & kirim penilaian' })).toBeDisabled();
  await leaderPage.getByLabel('Kolaborasi tim (0–100)').fill('85');
  await leaderPage.getByLabel('Tanggung jawab (0–100)').fill('90');
  await leaderPage.getByLabel('Pemecahan masalah (0–100)').fill('75');
  await leaderPage.getByRole('button', { name: 'Review & kirim penilaian' }).click();
  await expect(leaderPage.getByText('Nilai yang akan dikirim', { exact: true })).toBeVisible();
  await leaderPage.getByRole('button', { name: 'Kirim penilaian akhir' }).click();
  await expect(leaderPage.getByRole('dialog')).toHaveCount(0);
  await leaderPage.getByRole('button', { name: 'Lihat', exact: true }).click();
  await expect(leaderPage.getByLabel('Kualitas pekerjaan (0–100)')).toBeDisabled();
  expect(errors).toEqual([]);
  console.log(
    'Browser QA passed: 3 roles plus assigned team leader, real CRUD, chart point navigation, filters, detail tabs, employee and leader draft/review/submit, 1440px desktop and 390px mobile, no page errors or document overflow.',
  );
} finally {
  await browser.close();
  await vite.close();
  await new Promise<void>((resolve) => apiServer.close(() => resolve()));
  await db.close();
}

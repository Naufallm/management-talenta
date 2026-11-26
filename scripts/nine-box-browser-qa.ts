import { chromium, expect, type Page } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mkdir } from 'node:fs/promises';
import { dnaQuestions } from '../server/domain/dna-instrument.ts';
process.env.NODE_ENV = 'test';
process.env.TEST_LOGIN_ENABLED = 'true';
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL;
process.env.DATA_ENCRYPTION_KEY = 'e'.repeat(64);
process.env.APP_ORIGIN = 'http://127.0.0.1:5185';
const { connectDb, migrate } = await import('../server/db/index.ts');
const { seed } = await import('../server/db/seed.ts');
const { createApp } = await import('../server/app.ts');
const db = await connectDb();
await migrate(db);
await seed(db);
await db.query("UPDATE periods SET starts_on='2020-01-01',ends_on='2100-12-31'");
for (let i = 6; i <= 9; i++)
  await db.query(
    "INSERT INTO employees(id,nip,name,position,grade,unit) VALUES($1,$2,$3,'Statistisi','III/b','BPS Kota Batu')",
    ['emp-' + i, '19900101202001100' + i, 'Pegawai Pengujian ' + i],
  );
await db.query('DELETE FROM trainings');
await db.query('DELETE FROM achievements');
await db.query('DELETE FROM leader_assessments');
await db.query('DELETE FROM ckp_scores');
const coords = [
  [2, 2],
  [0, 0],
  [0, 1],
  [1, 0],
  [0, 2],
  [1, 1],
  [2, 0],
  [1, 2],
  [2, 1],
];
for (let i = 1; i <= 9; i++) {
  const [x, y] = coords[i - 1],
    id = 'emp-' + i;
  const answers = Object.fromEntries(dnaQuestions.map((q) => [q.id, [20, 80, 95][x]]));
  await db.query(
    "INSERT INTO potential_dna_assessments(employee_id,period_id,instrument_version,answers,instructions_accepted_at,submitted_at,result) VALUES($1,'period-2026','dna-v1',$2,now(),now(),'{}')",
    [id, JSON.stringify(answers)],
  );
  await db.query(
    "INSERT INTO nine_box_inputs(employee_id,period_id,education_level,field_match,field_match_note,updated_by) VALUES($1,'period-2026',$2,$3,'Riwayat pendidikan dan kegiatan terverifikasi','user-admin')",
    [id, ['SD', 'D4/S1', 'S3'][x], x === 2],
  );
  await db.query(
    "INSERT INTO trainings(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,verified,created_by) VALUES($1,$2,'period-2026','Pelatihan statistik','Teknis','2026-01-01','Pusdiklat',$3,true,'user-admin')",
    ['training-' + i, id, x ? 40 : 0],
  );
  await db.query(
    "INSERT INTO achievements(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,verified,created_by,award_level,award_scope) VALUES($1,$2,'period-2026','Penghargaan prestasi','Prestasi','2026-01-01','Instansi',0,true,'user-admin',$3,$4)",
    ['award-' + i, id, y === 2 ? 'NATIONAL' : 'CITY', y === 0 ? 'INTERNAL' : 'EXTERNAL'],
  );
  await db.query(
    "INSERT INTO leader_assessments(id,period_id,employee_id,leader_id,score,submitted_at) VALUES($1,'period-2026',$2,'emp-1',$3,now())",
    ['leader-' + i, id, [30, 70, 95][y]],
  );
  for (let m = 1; m <= 12; m++)
    await db.query(
      "INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES($1,$2,$3,2026,$4,'user-admin')",
      ['ckp-' + i + '-' + m, id, m, [30, 70, 95][y]],
    );
}
const api = createApp(db).listen(0, '127.0.0.1');
await new Promise<void>((r) => api.once('listening', r));
const vite = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-nine-box-qa',
  plugins: [react(), tailwindcss()],
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 5185,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${(api.address() as { port: number }).port}` },
  },
});
await vite.listen();
console.log('Desktop QA services ready.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors: string[] = [];
await mkdir('test-results/nine-box', { recursive: true });
async function ready(page: Page) {
  await expect(page.locator('.loading')).toHaveCount(0);
  await expect(page.locator('.error-state')).toHaveCount(0);
  await expect(page.locator('.fatal-error')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
async function login(username: string) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const response = await context.request.post(
    `http://127.0.0.1:${(api.address() as { port: number }).port}/api/auth/login`,
    {
      data: { username, password: '123456' },
    },
  );
  expect(response.ok()).toBeTruthy();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5185/dashboard');
  await expect(page.locator('.nine-box-page')).toBeVisible();
  await ready(page);
  return { page, context };
}
try {
  const { page, context } = await login('admin@bpskotabatu.com');
  await expect(page.locator('.nine-cell')).toHaveCount(9);
  await expect(page.getByRole('link', { name: 'Matriks 9 Box', exact: true })).toHaveCount(0);
  await page.goto('http://127.0.0.1:5185/peta-talenta');
  await expect(page).toHaveURL('http://127.0.0.1:5185/dashboard');
  await ready(page);
  await expect(
    page.getByRole('navigation', { name: 'Kinerja', exact: true }).getByRole('link'),
  ).toHaveCount(3);
  await expect(
    page.getByRole('navigation', { name: 'Potensial', exact: true }).getByRole('link'),
  ).toHaveCount(3);
  await expect(page.locator('.nine-cell-count')).toHaveText(Array(9).fill('1 pegawai'));
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('.nine-grid')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.nine-x-caption')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.nine-y-levels')).toHaveCSS('border-right-width', '2px');
  await expect(page.locator('.nine-x-levels')).toHaveCSS('border-top-width', '2px');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/nine-box/admin-desktop.png' });
  await page.getByRole('button', { name: 'Konfigurasi 9 box' }).click();
  const config = page.getByRole('dialog', { name: 'Konfigurasi penilaian 9 box' });
  await expect(
    config.getByRole('region', { name: /Sumbu X/ }).getByText('Kualifikasi'),
  ).toBeVisible();
  const performance = config.getByRole('region', { name: /Sumbu Y/ });
  await expect(performance.getByRole('row', { name: /Nasional/ })).toHaveText('Nasional2025');
  await page.screenshot({ path: 'test-results/nine-box/admin-config.png' });
  await config.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(config).toHaveCount(0);
  await page.locator('.nine-cell-9 .nine-cell-people button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Bintang / suksesi nasional')).toBeVisible();
  await page.keyboard.press('Escape');
  const box9 = page.locator('.nine-cell-9 .nine-cell-heading');
  await box9.hover();
  await expect(page.locator('.nine-cell-9')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await box9.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Filter tabel ke box ini' }).click();
  await expect(page.getByRole('heading', { name: 'Pegawai di box 9' })).toBeVisible();
  await expect(page.locator('.nine-box-page table tbody tr')).toHaveCount(1);
  const csv = await context.request.get(
    await page
      .getByRole('link', { name: 'Ekspor CSV' })
      .getAttribute('href')
      .then((path) => new URL(path!, page.url()).href),
  );
  expect((await csv.text()).trim().split('\r\n')).toHaveLength(2);
  await page.setViewportSize({ width: 320, height: 800 });
  await box9.click();
  await expect(page.getByRole('dialog', { name: /^Box 9/ })).toBeVisible();
  await expect(page.locator('.nine-box-roster button')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/nine-box/admin-mobile.png' });
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1600, height: 1000 });
  const paths = [
    '/kinerja',
    '/potensial',
    '/pelatihan',
    '/penghargaan',
    '/pendidikan',
    '/pengalaman-jabatan',
    '/profil-dna',
    '/penilaian-ketua',
    '/kesesuaian-ilmu',
    '/ckp',
    '/laporan',
    '/profil',
    '/pengaturan',
  ];
  for (const path of paths) {
    await page.goto('http://127.0.0.1:5185' + path);
    await expect(page.locator('.page-heading, .page-header').first()).toBeVisible();
    await ready(page);
  }
  await page.goto('http://127.0.0.1:5185/ckp');
  await ready(page);
  await expect(page.locator('.ckp-cell-edit')).toHaveCount(0);
  await expect(page.locator('.ckp-matrix td svg')).toHaveCount(0);
  await page.getByLabel('Bulan rincian bulanan').selectOption('2');
  await ready(page);
  await page.locator('.ckp-row-action button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('input[type="number"]')).toHaveCount(12);
  await page.getByRole('dialog').getByLabel('Jan', { exact: true }).fill('83.75');
  await page.getByRole('dialog').getByLabel('Des', { exact: true }).fill('94.25');
  await page.getByRole('button', { name: 'Simpan nilai tahunan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ready(page);
  await page.getByLabel('Bulan rincian bulanan').selectOption('0');
  await ready(page);
  await expect(page.locator('.ckp-matrix tbody tr').first().locator('td').nth(1)).toHaveText(
    '83,75',
  );
  await page.screenshot({ path: 'test-results/nine-box/ckp-row-edit-desktop.png', fullPage: true });
  await page.goto('http://127.0.0.1:5185/pengaturan');
  await ready(page);
  await page.getByRole('tab', { name: 'Bank Soal Potensi', exact: true }).click();
  await ready(page);
  await expect(
    page.getByText('Bank soal instrumen manajerial & teknis sebelumnya', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit bank soal', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('tab', {
      name: { DRIVE: 'Drive', NETWORK: 'Network', ACTION: 'Action' }[dnaQuestions[0].cluster],
      exact: true,
    })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Pernyataan 1', { exact: true })
    .fill('Saya menyusun prioritas kerja berdasarkan tujuan yang terukur.');
  await page.getByRole('dialog').getByRole('tab', { name: 'Network', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan bank soal', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await ready(page);
  const bank = await (
    await context.request.get('http://127.0.0.1:5185/api/potential-dna/instrument/period-2026')
  ).json();
  expect(bank.questions[0].text).toBe(
    'Saya menyusun prioritas kerja berdasarkan tujuan yang terukur.',
  );
  const old = await (
    await context.request.get('http://127.0.0.1:5185/api/potential-dna/period-2026/emp-1')
  ).json();
  expect(old.questions[0].text).toBe(dnaQuestions[0].text);
  await page.screenshot({ path: 'test-results/nine-box/dna-bank-desktop.png', fullPage: true });
  await page.goto('http://127.0.0.1:5185/kompetensi');
  await ready(page);
  await page.getByRole('tab', { name: /Pengalaman Jabatan/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Pengalaman Jabatan', exact: true }),
  ).toBeVisible();
  await page.locator('select[aria-label="Pegawai data pendukung"]').selectOption({ index: 1 });
  await expect(page.getByRole('tab', { name: /Pengalaman Jabatan/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('heading', { name: 'Pengalaman Jabatan', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/nine-box/competency-desktop.png', fullPage: true });
  await page.goto('http://127.0.0.1:5185/kualifikasi');
  await ready(page);
  await page.getByRole('tab', { name: /Kesesuaian Bidang Ilmu/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Kesesuaian Bidang Ilmu', exact: true }),
  ).toBeVisible();
  await db.query("INSERT INTO documents(id,employee_id,name,mime,contents) VALUES('qa-proof','emp-1','bukti.pdf','application/pdf','x')");
  await db.query("UPDATE trainings SET document_id='qa-proof' WHERE id='training-1'");
  await page.goto('http://127.0.0.1:5185/kualifikasi?bagian=kesesuaian&pegawai=emp-1');
  await page.getByRole('button', {name:'Batalkan verifikasi Pelatihan statistik'}).click();
  await page.getByLabel('Kesesuaian pekerjaan untuk Pelatihan statistik').selectOption('true');
  await expect(page.getByLabel('Kesesuaian pekerjaan untuk Pelatihan statistik')).toHaveValue('true');
  await page.getByRole('button', {name:'Verifikasi semua (1)'}).click();
  await expect(page.getByRole('button', {name:'Batalkan verifikasi Pelatihan statistik'})).toBeVisible();
  await expect(page.getByRole('button', {name:/Verifikasi semua/})).toHaveCount(0);
  await page.goto('http://127.0.0.1:5185/potensial');
  await ready(page);
  await page.getByRole('button', { name: 'Nilai kualifikasi' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Jenjang pendidikan yang dinilai').selectOption('S2');
  await expect(
    page.getByText('Kesesuaian dinilai per pelatihan di menu Kualifikasi.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.route('**/api/nine-box/period-2026?team=', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: {
        ...data,
        rows: data.rows.map((row: { box: number }) => ({ ...row, box: 9 })),
      },
    });
  });
  await page.goto('http://127.0.0.1:5185/dashboard');
  const busyBox = page.locator('.nine-cell-9');
  await expect(busyBox.locator('.nine-cell-people button')).toHaveCount(3);
  await expect(busyBox.locator('.nine-cell-people')).toHaveCSS('overflow-y', 'visible');
  await busyBox.getByRole('button', { name: 'Lihat semua 9 pegawai di box 9' }).click();
  const boxRoster = page.getByRole('dialog', { name: /^Box 9/ });
  await expect(boxRoster.locator('li > button')).toHaveCount(9);
  await page.screenshot({ path: 'test-results/nine-box/admin-roster.png' });
  await boxRoster.locator('li > button').last().click();
  await expect(boxRoster).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await context.close();
  const sup = await login('supervisor@bpskotabatu.com');
  await expect(sup.page.locator('.nine-cell')).toHaveCount(9);
  await expect(sup.page.getByRole('button', { name: 'Konfigurasi 9 box' })).toHaveCount(0);
  await expect(sup.page.getByRole('button', { name: /Lengkapi nilai/ })).toHaveCount(0);
  await sup.page.screenshot({
    path: 'test-results/nine-box/supervisor-desktop.png',
    fullPage: true,
  });
  await sup.context.close();
  const emp = await login('199001012020011001');
  await expect(emp.page.locator('.nine-cell')).toHaveCount(0);
  await expect(emp.page.getByRole('link', { name: 'Posisi Box Saya', exact: true })).toHaveCount(0);
  await expect(
    emp.page.getByRole('navigation', { name: 'Kinerja', exact: true }).getByRole('link'),
  ).toHaveCount(3);
  await expect(
    emp.page.getByRole('navigation', { name: 'Potensial', exact: true }).getByRole('link'),
  ).toHaveCount(3);
  await emp.page.goto('http://127.0.0.1:5185/peta-talenta');
  await expect(emp.page).toHaveURL('http://127.0.0.1:5185/dashboard');
  await ready(emp.page);
  await expect(emp.page.locator('.box-position-number strong')).toHaveText('9');
  await expect(emp.page.getByText('Aditya Pratama', { exact: true })).toHaveCount(0);
  await emp.page.screenshot({ path: 'test-results/nine-box/employee-desktop.png', fullPage: true });
  await emp.page.goto('http://127.0.0.1:5185/profil');
  await ready(emp.page);
  await expect(emp.page.locator('.box-position-number strong')).toHaveText('9');
  await emp.page.goto('http://127.0.0.1:5185/asesmen-potensi');
  await ready(emp.page);
  await expect(emp.page.locator('.dna-result-intro')).toBeVisible();
  await emp.context.close();
  const publicPage = await browser.newPage();
  for (const width of [1366, 390]) {
    await publicPage.setViewportSize({ width, height: 800 });
    await publicPage.goto('http://127.0.0.1:5185/');
    await expect(publicPage.getByRole('heading', { name: 'Talenta BPS', exact: true })).toBeVisible();
    await publicPage.getByRole('button', { name: /^Box 5,/ }).click();
    await expect(publicPage.getByRole('heading', { name: /Box 5/ })).toBeVisible();
    await publicPage.getByRole('link', { name: 'Kenali sistemnya' }).click();
    await expect(publicPage.locator('#tentang-kami')).toBeInViewport();
    expect(
      await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
    await publicPage.screenshot({ path: 'test-results/nine-box/beranda-scroll-' + width + '.png' });
  }
  await publicPage.emulateMedia({ reducedMotion: 'reduce' });
  await expect(publicPage.locator('.public-map-explanation')).toHaveCSS('animation-name', 'none');
  await publicPage.close();
  expect(errors).toEqual([]);
  console.log(
    '9-box desktop QA passed: all boxes, filters, forms, source pages, Admin/Supervisor/employee permissions.',
  );
} finally {
  await browser.close();
  await vite.close();
  await new Promise<void>((r) => api.close(() => r()));
  await db.close();
}

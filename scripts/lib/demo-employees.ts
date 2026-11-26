import type { Employee, Period } from '../../shared/contracts.ts';

export type DemoApi = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<any>;
const names = [
  'Ayu Lestari',
  'Bima Prasetyo',
  'Citra Maharani',
  'Dimas Saputra',
  'Eka Wulandari',
  'Farhan Ramadhan',
  'Gita Permatasari',
  'Hendra Kurniawan',
  'Intan Puspita',
  'Joko Santoso',
  'Kartika Sari',
  'Lukman Hakim',
  'Maya Anggraeni',
  'Naufal Akbar',
  'Putri Amelia',
  'Raka Wijaya',
  'Sinta Rahmawati',
  'Yoga Pratama',
  'Vina Utami',
];

/** Add testing fixtures through the running API without opening its database twice. */
export async function addDemoEmployees(api: DemoApi) {
  const options = await api('GET', '/auth/options');
  if (!options.testingLogin)
    throw new Error('Data dummy hanya dapat dibuat saat login testing aktif.');
  const roster: { rows: Employee[]; total: number } = await api(
    'GET',
    '/employees?status=all&limit=100',
  );
  if (roster.total > 100) throw new Error('Jumlah pegawai melebihi batas data testing.');
  const periods: Period[] = await api('GET', '/periods');
  const period = periods.find((item) => item.status === 'OPEN') || periods[0];
  if (!period) throw new Error('Siapkan periode penilaian terlebih dahulu.');
  const users: { employee_id: string | null }[] = await api('GET', '/users');
  let active = roster.rows.filter((employee) => employee.active).length;
  let created = 0,
    scores = 0,
    accounts = 0;
  const units = [
    'IPDS',
    'Statistik Sosial',
    'Statistik Produksi',
    'Statistik Distribusi',
    'Neraca Wilayah',
    'Umum',
  ];
  for (const [index, name] of names.entries()) {
    const nip = `199101012020011${String(index + 6).padStart(3, '0')}`;
    const email = `dummy${index + 6}@example.invalid`;
    let employee = roster.rows.find((item) => item.nip === nip);
    if (!employee && active < 24) {
      const data = {
        nip,
        name,
        email,
        position: index % 3 === 0 ? 'Pranata Komputer Ahli Pertama' : 'Statistisi Ahli Pertama',
        grade: 'III/b',
        unit: units[index % units.length],
        phone: '',
        active: true,
      };
      const result = await api('POST', '/employees', data);
      employee = { ...data, id: result.id };
      roster.rows.push(employee);
      active++;
      created++;
    }
    // Never modify a record merely because its NIP matches our reserved fixture.
    if (!employee?.active || employee.email !== email) continue;
    if (!users.some((user) => user.employee_id === employee.id)) {
      await api('POST', `/employees/${employee.id}/account`);
      accounts++;
    }
    const existing = await api(
      'GET',
      `/ckp?year=${period.year}&employee_id=${employee.id}&limit=100`,
    );
    for (let month = 1; month <= 9; month++) {
      if (existing.rows.some((row: { month: number }) => row.month === month)) continue;
      const score =
        Math.round(
          (70 + (index % 7) * 2.3 + Math.sin((month + index) * 0.8) * 4 + month * 0.55) * 100,
        ) / 100;
      await api('POST', '/ckp', { employee_id: employee.id, year: period.year, month, score });
      scores++;
    }
  }
  if (active < 23)
    throw new Error(`Baru tersedia ${active} pegawai aktif; periksa benturan NIP dummy.`);
  return { total: active, created, scores, accounts, year: period.year };
}

import ExcelJS from 'exceljs';
import { assert } from '../errors.ts';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && ch === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
    assert(rows.length <= 5000, 422, 'Maksimum 5.000 baris per impor.');
  }
  assert(!quoted, 422, 'CSV memiliki tanda kutip yang tidak ditutup.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
function checkZip(buffer: Buffer) {
  let inflated = 0,
    entries = 0;
  for (let i = 0; i + 46 < buffer.length; i++)
    if (buffer.readUInt32LE(i) === 0x02014b50) {
      inflated += buffer.readUInt32LE(i + 24);
      entries++;
      assert(
        inflated <= 20 * 1024 * 1024 && entries <= 1000,
        422,
        'Ukuran isi Excel terlalu besar.',
      );
      i +=
        45 +
        buffer.readUInt16LE(i + 28) +
        buffer.readUInt16LE(i + 30) +
        buffer.readUInt16LE(i + 32);
    }
  assert(entries > 0, 422, 'Berkas Excel tidak valid.');
}
export async function importRows(buffer: Buffer, name: string) {
  if (name.toLowerCase().endsWith('.csv')) return parseCsv(buffer.toString('utf8'));
  assert(name.toLowerCase().endsWith('.xlsx'), 422, 'Gunakan berkas .csv atau .xlsx.');
  checkZip(buffer);
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(buffer as any);
  } catch {
    assert(false, 422, 'Berkas Excel rusak atau tidak dapat dibaca.');
  }
  const sheet = book.worksheets[0];
  assert(sheet, 422, 'Lembar Excel kosong.');
  assert(sheet.rowCount <= 5001, 422, 'Maksimum 5.000 baris per impor.');
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const cell = row.getCell(i);
      values.push(
        typeof cell.value === 'object' && cell.value !== null
          ? '[nilai nonteks]'
          : cell.text.trim(),
      );
    }
    rows.push(values);
  });
  return rows;
}
export async function validateImport(db: DB, rows: string[][]) {
  assert(rows.length > 1, 422, 'Berkas tidak memiliki data.');
  assert(
    rows[0].map((v) => v.toLowerCase()).join(',') === 'nip,bulan,tahun,skor',
    422,
    'Header harus nip,bulan,tahun,skor. Simpan NIP sebagai teks.',
  );
  const employees = await db.query('SELECT id,nip,name FROM employees WHERE active'),
    lookup = new Map(employees.map((e) => [e.nip, e])),
    seen = new Set<string>();
  const existing = await db.query('SELECT employee_id,month,year FROM ckp_scores'),
    duplicates = new Set(existing.map((e) => `${e.employee_id}/${e.month}/${e.year}`));
  const schema = z.object({
    nip: z.string().regex(/^\d{18}$/),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2020).max(2100),
    score: z.coerce.number().min(0).max(100),
  });
  return rows.slice(1).map((row, i) => {
    const data = { nip: row[0], month: row[1], year: row[2], score: row[3] },
      parsed = schema.safeParse(data),
      e = lookup.get(row[0]);
    let error = '';
    if (row.length !== 4 || row.some((v) => v === '') || !parsed.success)
      error = 'NIP/bulan/tahun/skor tidak valid. NIP wajib teks 18 angka; skor 0–100.';
    else if (!e) error = 'NIP tidak ditemukan atau pegawai nonaktif.';
    else {
      const key = `${e.id}/${parsed.data.month}/${parsed.data.year}`;
      if (seen.has(key) || duplicates.has(key))
        error = 'Data pegawai, bulan, dan tahun sudah ada atau berulang.';
      seen.add(key);
    }
    return { line: i + 2, ...data, employee_id: e?.id, name: e?.name, error };
  });
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

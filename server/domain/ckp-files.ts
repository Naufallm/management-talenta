import ExcelJS from 'exceljs';
import { months } from '../../shared/constants.ts';

export async function ckpTemplate(
  employees: { nip: string; name: string }[],
  month: number,
  year: number,
) {
  const book = new ExcelJS.Workbook();
  book.creator = 'BPS Kota Batu';
  book.title = `Template Capaian Kinerja Pegawai ${months[month - 1]} ${year}`;
  const sheet = book.addWorksheet('Capaian Kinerja Pegawai', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1, showGridLines: false }],
    properties: { defaultRowHeight: 26, tabColor: { argb: 'FF2C3CDD' } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ width: 25 }, { width: 34 }, { width: 12 }, { width: 14 }, { width: 19 }];
  sheet.addTable({
    name: 'CapaianKinerjaPegawai',
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['NIP', 'Nama', 'Bulan', 'Tahun', 'Skor'].map((name) => ({
      name,
      filterButton: true,
    })),
    rows: employees.map((employee) => [employee.nip, employee.name, month, year, null]),
  });
  sheet.eachRow((row, index) => {
    row.height = index === 1 ? 32 : 26;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { name: 'Arial', size: 11, color: { argb: 'FF28335A' } };
      cell.alignment = { vertical: 'middle', horizontal: column <= 2 ? 'left' : 'right' };
      if (index === 1) {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3CDD' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (column === 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5D6' } };
        cell.numFmt = '0.00';
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index % 2 === 0 ? 'FFF1F3FB' : 'FFFFFFFF' },
        };
        cell.numFmt = column === 1 ? '@' : column >= 3 ? '0' : 'General';
      }
    });
    if (index === 1) return;
    for (const column of [3, 4, 5]) {
      row.getCell(column).dataValidation = {
        type: column === 5 ? 'decimal' : 'whole',
        operator: 'between',
        allowBlank: column === 5,
        formulae: column === 3 ? [1, 12] : column === 4 ? [2020, 2100] : [0, 100],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Nilai tidak valid',
        error:
          column === 5
            ? 'Isi skor berupa angka 0 sampai 100.'
            : 'Gunakan bulan 1–12 dan tahun 2020–2100.',
        showInputMessage: true,
        promptTitle: column === 5 ? 'Isi nilai kinerja' : 'Periode penilaian',
        prompt:
          column === 5
            ? 'Kosongkan jika belum ada nilai. Nilai 0 tetap diimpor.'
            : 'Bulan dan tahun sudah diisi sesuai pilihan unduhan.',
      };
    }
  });
  sheet.pageSetup.printTitlesRow = '1:1';
  sheet.headerFooter.oddFooter = 'BPS Kota Batu&C&P / &N';
  const guide = book.addWorksheet('Petunjuk', { views: [{ showGridLines: false }] });
  guide.columns = [{ width: 5 }, { width: 105 }];
  const notes = [
    'Template Capaian Kinerja Pegawai',
    `BPS Kota Batu · ${months[month - 1]} ${year}`,
    'Isi kolom Skor berwarna kuning pada lembar Capaian Kinerja Pegawai dengan angka 0–100.',
    'NIP dan nama sudah diisi dari daftar pegawai aktif. Pertahankan NIP sebagai teks dan jangan ubah header.',
    'Baris tanpa skor dilewati saat impor. Nilai 0 dianggap sebagai nilai yang diisi.',
    'Bulan berupa angka 1–12. Tahun dan bulan sudah diisi sesuai pilihan sebelum mengunduh.',
    'Simpan sebagai Excel (.xlsx), unggah kembali, lalu pilih Validasi berkas sebelum Simpan seluruh data.',
    'Nilai untuk pegawai, bulan, dan tahun yang sudah tercatat akan ditolak sebagai duplikat. Ubah melalui aplikasi.',
    'Template berisi kolom skor kosong. Unduh hasil yang sudah tercatat melalui tombol Unduh hasil CSV pada rincian bulanan.',
  ];
  notes.forEach((note, index) => {
    const cell = guide.getCell(index + 2, 2);
    cell.value = note;
    cell.font = {
      name: 'Arial',
      size: index === 0 ? 16 : 11,
      bold: index === 0,
      color: { argb: index === 0 ? 'FF2C3CDD' : 'FF28335A' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
    guide.getRow(index + 2).height = index === 0 ? 32 : 40;
  });
  return Buffer.from(await book.xlsx.writeBuffer());
}

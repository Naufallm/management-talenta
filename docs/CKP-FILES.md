# Template dan hasil Capaian Kinerja Pegawai

## Mengisi melalui Excel

1. Buka **Capaian Kinerja Pegawai → Impor Capaian Kinerja Pegawai**.
2. Pilih **Bulan template** dan **Tahun template**, lalu klik **Unduh template Excel**.
3. Pada lembar **Capaian Kinerja Pegawai**, isi kolom **Skor** berwarna kuning dengan angka 0–100. Nama, NIP, bulan, dan tahun sudah terisi untuk seluruh pegawai aktif saat unduhan dibuat. Pertahankan NIP sebagai teks dan header tabel.
4. Simpan sebagai `.xlsx`, unggah kembali, lalu pilih **Validasi berkas**. Periksa nama, periode, nilai, dan status setiap baris sebelum **Simpan seluruh data**.

Kolom template: `NIP, Nama, Bulan, Tahun, Skor`. NIP disimpan sebagai teks 18 digit, bulan/tahun berupa angka, dan skor kosong sampai diisi. Nilai boleh desimal. Tabel menggunakan header indigo, baris berselang warna, filter kolom, pembekuan header dan dua kolom identitas, serta validasi bulan/tahun/skor. Lembar **Petunjuk** menjelaskan pengisian.

Pada format dengan kolom Nama, baris tanpa skor dilewati. Nilai **0** tetap dianggap sebagai isian. Berkas tanpa satu pun skor ditolak dengan pesan pengisian. Data untuk kombinasi pegawai/bulan/tahun yang sudah ada ditolak sebagai duplikat; gunakan edit di aplikasi untuk memperbaruinya. Jika ada kesalahan pada baris yang diisi, seluruh impor dibatalkan tanpa menyimpan sebagian.

Impor CSV dan Excel format lama `nip,bulan,tahun,skor` tetap didukung. Batas berkas tetap 2 MB dan 5.000 baris. Nama pada template membantu pengisian; pencocokan pegawai saat impor tetap menggunakan NIP dan nama pada preview dibaca dari database.

## Mengunduh hasil CSV

Klik **Unduh hasil CSV** di panel **Rincian nilai bulanan**. Unduhan mengikuti filter pegawai, bulan, dan tahun pada tabel tersebut, terpisah dari pilihan grafik. Semua baris hasil filter diekspor, termasuk yang tidak terlihat pada halaman tabel saat ini. Jika belum ada data, CSV hanya berisi header.

Sejak 12 November 2026, tabel rincian dan unduhan hasil memakai **satu baris per pegawai**. Bulan menjadi kolom; tahun berasal dari filter dan tercantum pada nama file. CSV seluruh bulan memakai header `nip,nama,bulan_1,...,bulan_12`; pilihan satu bulan hanya mengekspor kolom bulan tersebut. Nilai yang belum tercatat tetap kosong dan nilai nol tetap ditulis `0`. Susunan ini merupakan hasil rekap; gunakan template Excel untuk impor.

CSV memakai UTF-8 dengan BOM, pengutipan karakter khusus, dan perlindungan formula injection. Akun Pegawai hanya memperoleh nilainya sendiri, termasuk ketika parameter pegawai pada URL diubah. Admin/Supervisor mengikuti akses baca yang sudah berlaku. Ekspor dicatat sebagai `CKP_EXPORT` dalam audit. Endpoint lama `/api/ckp/export` tetap mendukung format panjang untuk kompatibilitas; tombol pada aplikasi memakai `/api/ckp/matrix?format=csv`.

CSV tidak menyimpan format sel Excel. Jika CSV dibuka melalui Excel, impor kolom NIP sebagai teks agar Excel mempertahankan seluruh digit. Template `.xlsx` sudah menyimpan format tersebut.

## Verifikasi

- Seluruh **61 tes unit/API** lulus, termasuk template 24 pegawai, NIP string 18 digit, skor kosong dibanding nol, impor sebagian baris, duplikat, filter ekspor, pagination per pegawai, pengutipan, dan hak akses.
- QA browser lengkap lulus: unduh `.xlsx`, isi dua skor (0 dan 95,5), validasi dan simpan, unduh CSV yang isinya sesuai, serta dialog desktop/390/320 px tanpa overflow halaman. Seluruh data QA berada di database terisolasi.
- Workbook dibuka kembali untuk memeriksa tabel, nilai, format, dan validasi. Kedua lembar dirender untuk menilai tata letak. Renderer menampilkan NIP numerik panjang dengan notasi ilmiah meski nilai impor tetap string; XML asli sudah diverifikasi memakai shared string dengan seluruh 18 digit dan format teks Excel `49` (`@`). Pemeriksaan melalui aplikasi Excel native tidak tersedia pada sesi ini karena COM menolak sesi logon.
- Lint dan build lulus.

Pratinjau aplikasi: [dialog desktop](screenshots/ckp-import-template-desktop.png), [dialog ponsel](screenshots/ckp-import-template-mobile.png), dan [hasil CSV pada rincian bulanan](screenshots/ckp-export-results-desktop.png).

# Talenta — BPS Kota Batu

Aplikasi manajemen talenta pegawai dengan React, TypeScript, Vite, Tailwind CSS, Express REST API, dan PostgreSQL. Implementasi mengikuti [Figma](https://www.figma.com/design/TKaLH3n51GEdV4jLpNM04z/Untitled): sidebar 242 px, header 70 px, biru `#174c79`, latar `#f7f9fb`, tabel dan panel yang konsisten untuk Admin dan Super Admin.

Repository awal kosong dan **PRD PDF tidak tersedia**. Spesifikasi implementasi berasal dari brief pengguna dan frame Figma. Keputusan sementara serta batas implementasi dicatat di [docs/STATUS.md](docs/STATUS.md).

## Menjalankan lokal

Prasyarat: Node.js 22 atau lebih baru dan npm. Tidak memerlukan PostgreSQL/Docker untuk development.

```sh
npm ci
npm run setup
npm run dev
```

Buka **http://127.0.0.1:5173**. API berjalan di `http://127.0.0.1:3001`. Gunakan alamat `127.0.0.1` sesuai `APP_ORIGIN`, karena mutasi memeriksa Origin dan CSRF.

`setup` membuat `.env` dengan kunci enkripsi acak, menjalankan migration, dan memasukkan seed **hanya jika database belum memiliki akun**. Pengulangan setup tidak menghapus atau menimpa data. Database development adalah PostgreSQL embedded PGlite yang disimpan pada `data/postgres`, bukan mock atau localStorage. Satu proses API menggunakan direktori tersebut pada satu waktu.

| Peran                                        | Akun pengembangan    |
| -------------------------------------------- | -------------------- |
| Super Admin                                  | `superadmin`         |
| Admin                                        | `admin`              |
| Pegawai / Ketua Tim IPDS                     | `199001012020011001` |
| Pegawai anggota IPDS                         | `199001012020011007` |
| Pegawai dengan asesmen potensi belum dikirim | `199001012020011011` |

Kata sandi awal: `TalentaDev!2026`, atau nilai `SEED_PASSWORD` saat seed pertama dibuat. **Setiap akun wajib mengganti kata sandi saat login pertama.** Sesudah diganti, gunakan kata sandi baru Anda. Semua nama, NIP, nilai, dan kegiatan seed adalah data fiktif pengembangan. Seed dinonaktifkan pada `NODE_ENV=production`.

## Fitur yang tersedia

- Login, logout, sesi server 8 jam, penggantian kata sandi awal dan reset kata sandi oleh Super Admin. Akun Pegawai baru dibuat dari detail pegawai; kata sandi sementara ditampilkan satu kali.
- Daftar pegawai dengan pencarian, filter unit/status, pagination server, tambah/edit, penonaktifan dengan riwayat tersimpan. Detail memiliki tab Profil, Potensi, Kompetensi, CKP, dan Riwayat Talenta.
- Struktur tim per tahun dan penugasan Ketua Tim. Ketua Tim tetap berperan `PEGAWAI`, dengan endpoint penilaian anggota yang memeriksa penugasan.
- Periode tahunan, bank soal potensi/psikologi, urutan dan penonaktifan soal. Bank soal terkunci sejak ada draft/jawaban agar instrumen tidak berubah di tengah pengisian.
- Draft, review, submit dan penguncian asesmen potensi. Pembukaan kembali oleh Admin/Super Admin wajib beralasan dan diaudit; skor lama serta posisi kuadran dicabut sampai dikirim ulang.
- Pelatihan/penghargaan, unggah PDF/PNG/JPEG privat, verifikasi Admin, penilaian Ketua Tim, dan perhitungan kompetensi. Unggah sendiri oleh pegawai default nonaktif dan dapat diaktifkan per periode.
- CKP bulanan, edit nilai, tren 12 bulan, perbandingan bulan, serta impor CSV/XLSX dengan preview, validasi seluruh baris, pemeriksaan duplikasi, dan transaksi atomik.
- Scatterplot 0–100 dengan tooltip, tautan detail, filter tahun/tim/kuadran, ambang configurable, dan riwayat individual. **CKP tidak digunakan dalam penentuan kuadran.**
- Rekap laporan dan ekspor CSV yang tidak menyertakan psikologi; perlindungan formula injection pada ekspor.
- Modul psikologi terpisah: jawaban/hasil terenkripsi AES-256-GCM, hanya Super Admin dan pegawai bersangkutan yang boleh membaca. Akses berhasil maupun ditolak diaudit. **Tidak ada diagnosis atau skoring klinis.**
- Manajemen peran/aktivasi akun dan audit log khusus Super Admin. Navigasi mobile, dialog keyboard, label form, loading/error/empty state, dan notifikasi hasil aksi.

## Database dan konfigurasi

Lihat [.env.example](.env.example). `DATABASE_URL` kosong memilih PGlite untuk lokal. Dengan URL PostgreSQL, aplikasi menggunakan connection pool `pg` dan migration SQL yang sama.

```sh
npm run db:migrate
npm run db:seed
```

Migration [001_initial.sql](server/db/migrations/001_initial.sql) berisi semua entitas bisnis, foreign key, batas skor, indeks, dan unique constraint. Migration dijalankan dalam transaksi dan dicatat di `schema_migrations`. Skor memiliki `config_version` dan waktu perhitungan. Perubahan konfigurasi menghitung ulang semua hasil periode secara atomik. Jawaban, perubahan konfigurasi, dan penugasan mengunci baris periode untuk mencegah konflik pengiriman bersamaan.

## Produksi

1. Siapkan PostgreSQL kosong dan cadangannya. Tetapkan `DATABASE_URL` melalui secret environment; konfigurasi TLS PostgreSQL mengikuti layanan yang digunakan.
2. Isi `NODE_ENV=production`, `APP_ORIGIN=https://domain-anda`, `DATA_ENCRYPTION_KEY` berupa 64 karakter heksadesimal acak. Simpan kunci di secret manager dan cadangkan terpisah; kunci yang berubah akan membuat data psikologi lama tidak dapat dibaca. Jangan gunakan kunci pengujian.
3. Jalankan `npm ci`, `npm run db:migrate`, dan `npm run build`.
4. Untuk database baru tanpa Super Admin, tetapkan `BOOTSTRAP_USERNAME` dan `BOOTSTRAP_PASSWORD` (minimal 16 karakter) sebagai environment sementara, lalu jalankan `npm run admin:create`. Skrip menolak jika Super Admin sudah ada dan tidak mencetak kata sandi. Hapus kedua variabel setelah bootstrap. Akun wajib mengganti kata sandi awal.
5. Jalankan `npm start` di belakang reverse proxy HTTPS menuju `127.0.0.1:3001`. Server menyajikan `dist` dan `/api` dari origin yang sama. Aktifkan `TRUST_PROXY=true` hanya jika ada tepat satu reverse proxy tepercaya; batasi akses langsung ke API.
6. Kelola akun nyata melalui aplikasi. Jangan menjalankan seed development pada data produksi.

Password di-hash dengan scrypt dan salt acak; cookie sesi HttpOnly/SameSite dan Secure di produksi. Token sesi di database disimpan sebagai SHA-256. Endpoint memakai validasi Zod, RBAC server, CSRF, pemeriksaan Origin, rate limit dan Helmet/CSP. Berkas bukti disimpan privat dalam database, dibatasi 2 MB, diperiksa signature file, dan hanya dapat diunduh oleh pengelola atau pemilik terkait. Tidak ada password, token sesi, jawaban psikologi, atau isi dokumen di audit log.

Deployment, konfigurasi reverse proxy/HTTPS, layanan email/SSO, backup terjadwal, rotasi kunci, dan uji PostgreSQL eksternal belum dijalankan di environment ini. Reset akun saat ini menggunakan pemulihan langsung oleh Super Admin karena layanan email belum tersedia.

## Pengujian

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
npm run format:check
```

- Unit/API menggunakan database PostgreSQL PGlite terisolasi dalam memori dan HTTP Supertest, termasuk pengiriman asesmen bersamaan. Tidak menyentuh database development.
- Browser QA memakai Playwright dengan **Google Chrome yang sudah terpasang** (`channel: chrome`), API/database terisolasi, dan Vite port 5174. Tutup proses lain yang memakai port tersebut. Browser QA meliputi tiga peran, CRUD, pencarian, tab detail, draft/submit, penguncian, navigasi mobile, dan pemeriksaan overflow pada 1440 px dan 390 px.
- Screenshot hasil QA tersedia di [docs/screenshots](docs/screenshots). Snapshot menampilkan data fiktif QA dan tidak menyertakan jawaban psikologi pengguna nyata.
- Hasil pemeriksaan terakhir dan batas verifikasi ada di [docs/STATUS.md](docs/STATUS.md).

## Struktur kode

```text
src/components/     Komponen UI, shell navigasi, grafik, pemilih pegawai
src/pages/          Halaman berdasarkan modul
src/lib/            API client, konteks sesi/periode, pemuatan data
shared/             Kontrak, validator, tipe dan konstanta bersama
server/routes/      REST API per modul dan pemeriksaan akses
server/domain/      Perhitungan skor dan validasi impor
server/db/          Adapter PostgreSQL/PGlite, migration dan seed
scripts/            Setup lokal, bootstrap Super Admin, browser QA
tests/              Pengujian unit dan integrasi API
docs/               Status implementasi, keputusan, dan screenshot QA
```

# Talenta — BPS Kota Batu

Aplikasi manajemen talenta pegawai dengan React, TypeScript, Vite, Tailwind CSS, Express REST API, dan PostgreSQL. Implementasi mengikuti [Figma](https://www.figma.com/design/TKaLH3n51GEdV4jLpNM04z/Untitled): sidebar 242 px, header 70 px, biru `#174c79`, latar `#f7f9fb`, tabel dan panel yang konsisten untuk Admin, Supervisor, dan Pegawai.

Repository awal kosong dan **PRD PDF tidak tersedia**. Spesifikasi implementasi berasal dari brief pengguna dan frame Figma. Keputusan sementara serta batas implementasi dicatat di [docs/STATUS.md](docs/STATUS.md).

## Menjalankan lokal

Prasyarat: Node.js 22 atau lebih baru dan npm. Tidak memerlukan PostgreSQL/Docker untuk development.

```sh
npm ci
npm run setup
npm run dev
```

Buka **http://127.0.0.1:5173**. API berjalan di `http://127.0.0.1:3001`. Gunakan alamat `127.0.0.1` sesuai `APP_ORIGIN`, karena mutasi memeriksa Origin dan CSRF.

`npm run dev` menunggu API siap sebelum membuka Vite. Perubahan kode server/shared atau `.env` memuat ulang API dengan menutup database terlebih dahulu, termasuk pada Windows. Jika terminal sebelumnya dihentikan paksa, startup menunggu kunci database kedaluwarsa secara otomatis (maksimum sekitar 35 detik); tunggu sampai alamat website muncul.

Alamat awal menampilkan beranda publik dengan menu **Beranda** dan **Tentang Kami**, logo BPS, serta ilustrasi empat kuadran potensi/kompetensi yang dapat dipilih. Tekan **Masuk** untuk membuka `/login`; setelah autentikasi pengguna masuk ke `/dashboard`. Tautan langsung ke modul yang memerlukan login kembali ke modul tersebut setelah autentikasi. Capaian Kinerja Pegawai tetap terpisah dari kuadran. Rincian tampilan dan navigasi ada di [docs/HOMEPAGE-DESIGN.md](docs/HOMEPAGE-DESIGN.md).

Halaman login memakai form di kiri dan ilustrasi talenta isometrik pada panel biru–sian di kanan, mengikuti referensi desain pengguna. Pada ponsel, tampilan berfokus pada form. Login cepat testing tetap tersedia. Aset, prompt ilustrasi, dan pratinjau dicatat di [docs/LOGIN-DESIGN.md](docs/LOGIN-DESIGN.md).

`setup` membuat `.env` dengan kunci enkripsi acak, menjalankan migration, dan memasukkan seed **hanya jika database belum memiliki akun**. Pada branch `work`, mode testing memperbarui ID login Admin/Supervisor dan mereset seluruh password ke `123456` satu kali saat setup atau API pertama dijalankan. Data pegawai, hasil penilaian, dan ID internal database tetap tersimpan. Database development adalah PostgreSQL embedded PGlite yang disimpan sesuai `PGLITE_DIR` (default `data/postgres`), bukan mock atau localStorage. Satu proses API menggunakan direktori tersebut pada satu waktu.

Pada workspace ini, database testing di `data/postgres-testing-20261102` telah ditambah menjadi **23 pegawai fiktif aktif** pada 9 November 2026. Penambahan mencakup 18 akun pegawai dan 162 nilai kinerja dummy Januari–September 2026, dengan pola bervariasi untuk pengujian perbandingan garis. Data yang sudah ada tetap tersimpan. Database lama dan cadangannya dipertahankan; data lama belum dipulihkan ke database testing. Rincian ada di [docs/STATUS.md](docs/STATUS.md).

| Peran                                | Akun pengembangan            |
| ------------------------------------ | ---------------------------- |
| Admin                                | `admin@bpskotabatu.com`      |
| Supervisor                           | `supervisor@bpskotabatu.com` |
| Pegawai / Ketua Tim IPDS             | `199001012020011001`         |
| Pegawai anggota IPDS                 | `199001012020011003`         |
| Pegawai dengan asesmen belum dikirim | `199001012020011005`         |

Seed baru berisi **5 pegawai fiktif**. Setup tidak menghapus database lama. Migrasi mengubah akun berperan `SUPER_ADMIN` menjadi `ADMIN`; Supervisor dapat ditetapkan melalui Pengguna & Peran. Daftar pegawai menggunakan kartu responsif, dengan pencarian dan filter.

Pada 12 November 2026, database testing workspace sudah memiliki **24 pegawai aktif**. Satu pegawai dummy tambahan, Vina Utami, dibuat beserta akun dan sembilan nilai kinerja contoh 2026; data 23 pegawai sebelumnya dipertahankan. Daftar pegawai menampilkan delapan kartu per halaman, empat kolom pada desktop, sehingga totalnya tiga halaman.

Untuk menambah data testing sampai 24 pegawai pada instalasi baru, jalankan `npm run demo:employees` di terminal kedua saat `npm run dev` aktif. Skrip memakai API Admin dan hanya tersedia dalam mode testing. Pengulangan melengkapi data dummy yang belum ada, tanpa menggandakan pegawai atau menimpa nilai lama. Akun dummy memakai NIP masing-masing dan password testing yang sama.

| Kemampuan                                                    | Admin                                              | Supervisor                 | Pegawai                   |
| ------------------------------------------------------------ | -------------------------------------------------- | -------------------------- | ------------------------- |
| Data pegawai, Capaian Kinerja Pegawai, laporan, peta talenta | Kelola                                             | Lihat                      | Data sendiri              |
| Akun, periode, bank soal, audit                              | Kelola                                             | Tanpa pengelolaan          | Tanpa pengelolaan         |
| Data psikologi                                               | Buat, lihat, ubah, hapus (terenkripsi dan diaudit) | Tidak                      | Asesmen dan hasil sendiri |
| Feedback pegawai                                             | Lihat dan tulis                                    | Lihat dan tulis kapan saja | Lihat milik sendiri       |
| Sertifikat pelatihan/penghargaan                             | Kelola dan verifikasi                              | Lihat                      | Unggah milik sendiri      |

Feedback tidak bergantung pada periode, tidak wajib bulanan, dan tidak memengaruhi skor. Sertifikat pegawai menunggu verifikasi Admin; ketentuan tahun/periode tetap berlaku.

Password sementara untuk **seluruh akun testing: `123456`**. Tidak ada kewajiban membuat kata sandi baru pada login pertama. NIP tetap menjadi ID login pegawai. Halaman login menyediakan tombol **Masuk sebagai Admin**, **Masuk sebagai Supervisor**, serta pilihan **Login cepat pegawai**; tombol tersebut menggunakan alur login API yang sama dengan form manual.

Mode testing aktif secara default pada branch `work` di luar produksi. `TEST_LOGIN_ENABLED=false` menyembunyikan login cepat dan mengaktifkan kembali kebijakan normal untuk akun baru/reset password. `NODE_ENV=production` selalu menonaktifkan mode testing. Saat mode testing dimatikan, seed development memakai `SEED_PASSWORD`. Semua data seed tetap fiktif.

Reset massal dijalankan satu kali dan tidak diulang pada setiap restart API. Untuk mereset semua password testing kembali ke `123456`, hentikan API terlebih dahulu jika memakai PGlite, lalu jalankan:

```sh
npm run auth:reset-testing
```

Reset menghentikan sesi login lama dan mempertahankan data pegawai maupun penilaian. Akun testing baru dan reset password dari menu Pengguna juga memakai `123456` tanpa wajib mengganti sandi.

## Fitur yang tersedia

- Asesmen potensi tahunan Drive/Network/Action memakai 30 pernyataan dari dokumen pemetaan: panduan dengan persetujuan, slider 0–100 mulai 50, scroll otomatis setelah dijawab, draft otomatis, tinjauan, dan penguncian satu kali per tahun. Hasil memuat tiga skor, penjelasan kecenderungan, serta persentase kemiripan empat formasi beserta rumus dan rincian aspek. Admin dapat membaca jawaban per pegawai. Profil ini terpisah dari skor kuadran sebelumnya; rincian ada di [docs/POTENTIAL-DNA.md](docs/POTENTIAL-DNA.md).
- Tema area setelah login mengikuti nuansa UKO: latar abu kebiruan, kartu putih, aksen biru elektrik/pastel, navigasi aktif berwarna biru, serta tampilan filter, tabel, form, dan dialog yang seragam. Dashboard memiliki empat kartu ringkasan berikon, grafik Peta Talenta/Tren Capaian Kinerja Pegawai, progres setengah lingkaran, panel akses cepat terpisah, serta tabel ringkasan pegawai dengan pagination. Akun Pegawai menampilkan data dan riwayat Capaian Kinerja Pegawai sendiri. Logo BPS dipertahankan; rincian ada di [docs/DASHBOARD-DESIGN.md](docs/DASHBOARD-DESIGN.md).
- Aksi melihat profil/detail, laporan, peta, dan riwayat memakai ikon mata dengan label teks atau nama aksesibel. Tombol masuk memakai ikon login, sedangkan edit memakai ikon pensil.
- Sidebar pengelola memiliki dua bagian: Menu Utama dan Administrasi. Menu Utama berisi Dashboard, induk Manajemen Talenta (tiga submenu selalu terbuka dan menjorok ke kanan: Penilaian, Peta Talenta, Capaian Kinerja Pegawai), serta Hasil Psikologi yang sejajar dengan induk Manajemen Talenta. Administrasi berisi Pegawai, Periode & Bank Soal, Laporan, Pengguna & Peran, dan Audit Log. Menu tetap mengikuti hak akses tiap peran.
- Penilaian Admin memiliki tab Potensi dan Kompetensi dengan daftar pegawai yang dapat dicari. Potensi menampilkan hasil D/N/A, kecenderungan formasi, jawaban per soal, dan status draft/terkirim. Kompetensi menampilkan bukti pelatihan/penghargaan beserta dokumen dan status verifikasi, indikator/catatan setiap Ketua Tim, serta rincian skor. Isian dapat dibaca langsung tanpa berpindah ke profil pegawai, sesuai tahun yang dipilih. Pilihan tab/pegawai tersimpan pada URL.
- Riwayat potensi menampilkan tahun yang memiliki jawaban tersimpan, termasuk periode lama yang sudah ditutup. Admin membukanya melalui **Penilaian → Potensi** atau **profil pegawai → Potensi**; Pegawai melalui **Asesmen Potensi** atau **profil sendiri → Potensi**. Pilih **Tahun riwayat potensi** untuk membaca hasil dan **Lihat isian tahun …** untuk membuka jawaban. Pemilih riwayat terpisah dari periode aktif; riwayat hanya dapat dibaca dan draft belum mempunyai hasil. Rincian ada di [docs/POTENTIAL-DNA.md](docs/POTENTIAL-DNA.md).
- Tab kategori menggunakan jarak, sudut, serta hover/fokus yang seragam tanpa menggeser tulisan. Pada layar kecil, tab membungkus ke dua kolom; pilihan juga dapat dipindahkan menggunakan tombol panah, Home, dan End.
- Beranda publik responsif, penjelasan sumber penilaian dan alur pengembangan, diagram empat kuadran interaktif dengan dukungan keyboard, serta logo BPS pada beranda, login, sidebar, dan favicon.
- Login putih dengan panel doodle sesuai referensi UKO, login manual/cepat, logout, sesi server 8 jam, dan reset kata sandi oleh Admin. Pada mode testing, akun langsung masuk tanpa mengganti sandi; kebijakan kata sandi normal tetap tersedia saat mode testing dimatikan. Akun Pegawai baru dibuat dari detail pegawai. Halaman 404 dan fallback error aplikasi memakai ilustrasi monitor serta tindakan pemulihan. Detail ada di [docs/LOGIN-DESIGN.md](docs/LOGIN-DESIGN.md).
- Daftar pegawai dengan pencarian, filter unit/status, pagination server, tambah/edit, penonaktifan dengan riwayat tersimpan. Avatar menggunakan ikon orang dalam kotak bersudut membulat yang sama pada kartu, profil, identitas Penilaian, dashboard, dan akun. Detail memiliki tab Profil, Potensi, Kompetensi, Capaian Kinerja Pegawai, dan Riwayat Talenta.
- Struktur tim tersedia melalui **Administrasi → Pegawai → Struktur Tim**. Admin dapat menambah tim, mengedit nama, menghapus tim kosong dengan konfirmasi, serta mengatur anggota/Ketua Tim per tahun. Tim yang masih memiliki penugasan pada tahun mana pun tidak dapat dihapus. Peran melekat pada tim: pegawai dapat memimpin satu tim dan menjadi anggota pada tim lain. Ketua Tim tetap berperan `PEGAWAI`, dengan endpoint penilaian anggota yang memeriksa penugasan.
- Periode tahunan, bank soal potensi/psikologi, urutan dan penonaktifan soal. Bank soal terkunci sejak ada draft/jawaban agar instrumen tidak berubah di tengah pengisian.
- Draft, review, submit dan penguncian asesmen potensi. Pembukaan kembali oleh Admin wajib beralasan dan diaudit; skor lama serta posisi kuadran dicabut sampai dikirim ulang.
- Pelatihan/penghargaan, unggah PDF/PNG/JPEG privat, verifikasi Admin, penilaian Ketua Tim, dan perhitungan kompetensi. Pegawai dapat mengunggah sertifikat sendiri tanpa perlu diaktifkan oleh Admin; verifikasi tetap dilakukan Admin.
- Capaian Kinerja Pegawai bulanan dapat diinput, diedit, dan diimpor melalui template Excel berisi nama/NIP. Grafik garis membandingkan pegawai yang dicentang, dengan rata-rata pilihan dan legenda sorotan ketika banyak pegawai dipilih. Rincian bulanan menampilkan satu baris per pegawai dengan kolom bulan, filter pegawai/bulan/tahun yang terpisah dari grafik, serta ekspor CSV seluruh hasil filter. Nilai yang belum tercatat tetap kosong. Impor CSV/XLSX menyediakan preview, validasi seluruh baris, pemeriksaan duplikasi, dan transaksi atomik.
- Pergantian filter memperbarui grafik dengan animasi singkat dan transisi pada tabel/kartu. Data sebelumnya tetap terlihat selama pembaruan, disertai penanda kecil; halaman tidak dikosongkan pada setiap permintaan. Pilihan terakhir tetap berlaku ketika respons datang tidak berurutan. Animasi mengikuti pengaturan pengurangan gerakan pengguna.
- Filter perbandingan berada di samping grafik garis pada desktop agar pilihan dan animasi dapat dilihat bersamaan. Pada layar kecil, grafik berada di atas kontrol, sehingga membuka daftar pegawai tidak menggeser atau menutupi grafik garis.
- Template impor Capaian Kinerja Pegawai diunduh sebagai **Excel (.xlsx)** dari dialog **Impor Capaian Kinerja Pegawai → pilih bulan/tahun → Unduh template Excel**. NIP dan nama seluruh pegawai aktif sudah terisi; kolom Skor berwarna kuning dibiarkan kosong untuk diisi. Tabel memiliki filter, header beku, validasi angka, dan lembar Petunjuk. Baris tanpa skor dilewati, sedangkan nilai 0 tetap diimpor. **Unduh hasil CSV** pada Rincian nilai bulanan mengekspor seluruh data sesuai filter tabel, termasuk baris pada halaman berikutnya. Akun Pegawai hanya mengekspor data sendiri. Rincian ada di [docs/CKP-FILES.md](docs/CKP-FILES.md).
- Scatterplot 0–100 dengan tooltip, tautan detail, filter tahun/tim/kuadran, ambang configurable, dan riwayat individual. **Capaian Kinerja Pegawai tidak digunakan dalam penentuan kuadran.**
- Rekap laporan dan ekspor CSV yang tidak menyertakan psikologi; perlindungan formula injection pada ekspor.
- Modul psikologi terpisah: jawaban/hasil terenkripsi AES-256-GCM, hanya Admin dan pegawai bersangkutan yang boleh membaca. Akses berhasil maupun ditolak diaudit. **Tidak ada diagnosis atau skoring klinis.**
- Manajemen peran/aktivasi akun dan audit log khusus Admin. Navigasi mobile, dialog keyboard, label form, loading/error/empty state, dan notifikasi hasil aksi.

Pembaruan 12 November 2026: grafik batang di halaman Capaian Kinerja Pegawai dihapus. Saat banyak pegawai dibandingkan, grafik garis memakai garis tipis tanpa titik, rata-rata pilihan yang lebih tegas, serta legenda yang dapat diklik untuk menyorot satu pegawai. Rincian hover memiliki scrollbar dan tetap terbuka ketika digulir. Rincian bulanan menampilkan satu baris per pegawai dengan Jan–Des sebagai kolom; tahun mengikuti filter. CSV dari panel ini mengikuti susunan kolom tersebut.

Hasil potensi menampilkan komposisi Drive + Network + Action tepat **100%**, dengan pembulatan dua desimal. Acuan formasi memakai Rendah 20, Moderat 40, Tinggi 60, Sangat tinggi 80, dan Moderat tinggi 100 sesuai keputusan pengguna. Hasil terkini dan riwayat ditampilkan menggunakan perhitungan versi baru dari jawaban yang tersimpan. Status periode kini hanya Terbuka/Ditutup; migration mengubah periode Draft lama menjadi Ditutup.

## Database dan konfigurasi

Lihat [.env.example](.env.example). `DATABASE_URL` kosong memilih PGlite untuk lokal. Dengan URL PostgreSQL, aplikasi menggunakan connection pool `pg` dan migration SQL yang sama.

```sh
npm run db:migrate
npm run db:seed
```

Migration [001_initial.sql](server/db/migrations/001_initial.sql) berisi semua entitas bisnis, foreign key, batas skor, indeks, dan unique constraint. Migration dijalankan dalam transaksi dan dicatat di `schema_migrations`. Skor memiliki `config_version` dan waktu perhitungan. Perubahan konfigurasi menghitung ulang semua hasil periode secara atomik. Jawaban, perubahan konfigurasi, dan penugasan mengunci baris periode untuk mencegah konflik pengiriman bersamaan.

### Jika Vite menampilkan `ECONNREFUSED 127.0.0.1:3001`

Pesan proxy pada `/api/auth/options` berarti Vite tidak dapat menghubungi API. Periksa pesan `Talenta API gagal dimulai` di terminal untuk menemukan penyebabnya. API yang aktif merespons `http://127.0.0.1:3001/api/health`; melalui Vite, alamatnya `http://127.0.0.1:5173/api/health`. Jika `PORT` di `.env` diganti, proxy Vite mengikuti port tersebut.

Startup memeriksa port API sebelum membuka database dan menampilkan pesan singkat jika port terpakai atau database gagal dibuka. Direktori PGlite dikunci untuk mencegah dua proses mengakses database yang sama. Hentikan development dengan `Ctrl+C` sebelum menjalankan `setup`, migrasi, seed, atau reset akun pada database tersebut. API menunggu pelepasan kunci dari proses sebelumnya hingga 35 detik. Skrip pengelolaan database tetap menolak akses jika API masih aktif. Jika terminal masih menjalankan watcher versi lama, hentikan sekali lalu jalankan kembali `npm run dev`.

Jika database gagal membaca checkpoint, pertahankan dan cadangkan folder data beserta `.env` untuk pemulihan. Jangan menghapus database atau menjalankan seed sebagai perbaikan. Database testing baru memerlukan direktori `PGLITE_DIR` terpisah dan tidak memulihkan catatan dari database lama.

## Produksi

Konfigurasi khusus `talenta.bpskotabatu.com` dengan port aplikasi **5015**, database **db_magang**, dan schema **management_talenta** tersedia di [panduan deployment](deploy/README.md). Tetapkan `DB_SCHEMA=management_talenta` agar koneksi pool dan migrasi memakai schema tersebut.

1. Siapkan PostgreSQL kosong dan cadangannya. Tetapkan `DATABASE_URL` melalui secret environment; konfigurasi TLS PostgreSQL mengikuti layanan yang digunakan.
2. Isi `NODE_ENV=production`, `APP_ORIGIN=https://domain-anda`, `DATA_ENCRYPTION_KEY` berupa 64 karakter heksadesimal acak. Simpan kunci di secret manager dan cadangkan terpisah; kunci yang berubah akan membuat data psikologi lama tidak dapat dibaca. Jangan gunakan kunci pengujian.
3. Jalankan `npm ci`, `npm run db:migrate`, dan `npm run build`.
4. Untuk database baru tanpa Admin, tetapkan `BOOTSTRAP_USERNAME` dan `BOOTSTRAP_PASSWORD` (minimal 16 karakter) sebagai environment sementara, lalu jalankan `npm run admin:create`. Skrip menolak jika Admin sudah ada dan tidak mencetak kata sandi. Hapus kedua variabel setelah bootstrap. Akun wajib mengganti kata sandi awal.
5. Jalankan `npm start` di belakang reverse proxy HTTPS menuju `127.0.0.1:3001`. Server menyajikan `dist` dan `/api` dari origin yang sama. Aktifkan `TRUST_PROXY=true` hanya jika ada tepat satu reverse proxy tepercaya; batasi akses langsung ke API.
6. Kelola akun nyata melalui aplikasi. Jangan menjalankan seed development pada data produksi.

Password di-hash dengan scrypt dan salt acak; cookie sesi HttpOnly/SameSite dan Secure di produksi. Token sesi di database disimpan sebagai SHA-256. Endpoint memakai validasi Zod, RBAC server, CSRF, pemeriksaan Origin, rate limit dan Helmet/CSP. Berkas bukti disimpan privat dalam database, dibatasi 2 MB, diperiksa signature file, dan hanya dapat diunduh oleh pengelola atau pemilik terkait. Tidak ada password, token sesi, jawaban psikologi, atau isi dokumen di audit log.

Deployment, konfigurasi reverse proxy/HTTPS, layanan email/SSO, backup terjadwal, rotasi kunci, dan uji PostgreSQL eksternal belum dijalankan di environment ini. Reset akun saat ini menggunakan pemulihan langsung oleh Admin karena layanan email belum tersedia.

## Pengujian

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
npm run format:check
```

- Unit/API menggunakan database PostgreSQL PGlite terisolasi dalam memori dan HTTP Supertest, termasuk pengiriman asesmen bersamaan. Pengujian lifecycle memakai direktori sementara untuk memeriksa kunci antarproses, buka ulang data, kegagalan inisialisasi, dan penolakan port yang terpakai sebelum database dibuka. Tidak menyentuh database development.
- Browser QA memakai Playwright dengan **Google Chrome** (`channel: chrome`) secara default, atau `BROWSER_EXECUTABLE_PATH=/usr/bin/chromium` untuk Chromium yang terpasang, API/database terisolasi, dan Vite port 5174. Tutup proses lain yang memakai port tersebut. Browser QA meliputi beranda publik pada 1440/768/390 px, diagram dan keyboard, navigasi Tentang Kami, pemisahan data publik, reduced motion, redirect login, tiga peran, CRUD, pencarian, tab detail, draft/submit, penguncian, dan navigasi mobile.
- Gunakan `BROWSER_QA_OUTPUT_DIR=/tmp/talenta-browser-qa` untuk menyimpan screenshot pengujian di luar file repository.
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
scripts/            Setup lokal, bootstrap Admin, browser QA
tests/              Pengujian unit dan integrasi API
docs/               Status implementasi, keputusan, dan screenshot QA
```

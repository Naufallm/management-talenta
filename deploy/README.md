# Deployment Talenta BPS Kota Batu

Target: `https://talenta.bpskotabatu.com`, Nginx menuju `127.0.0.1:5015`.
PostgreSQL yang sudah ada pada server `192.168.100.10`: database **db_magang**, schema **management_talenta**.

Deployment selesai dan diverifikasi pada 12 November 2026. Aplikasi berada di `/var/www/talenta.bpskotabatu.com`, systemd `talenta` aktif dan enabled, dengan Nginx menuju `127.0.0.1:5015`. Kelima migrasi termasuk `005_employee_photos.sql` telah diterapkan pada `db_magang.management_talenta`; role `talenta_app` bukan superuser dan tidak memiliki hak membuat database/role. Health, login Admin, cookie Secure/HttpOnly, logout, pembatasan API anonim, dan aset halaman lulus baik pada localhost maupun domain HTTPS publik. Beranda/login juga diperiksa melalui browser desktop dan ponsel tanpa error JavaScript atau horizontal overflow. HTTP biasa mengarah ke HTTPS dengan status 308.

Pembaruan arsip/profil/foto sudah aktif melalui `update-profile-server.sh`. Cadangan kode dan schema berada di `/var/backups/talenta/profile-20261112T042657Z`. Status terkini: 24 pegawai di daftar utama, 1 pegawai di arsip (Adam Mahmud, sesuai konfirmasi pensiun); riwayat dipertahankan dan login arsip ditolak. Browser produksi memverifikasi daftar/arsip/pemulihan serta form profil/foto pemilik pada desktop dan ponsel tanpa mengubah profil nyata untuk pengujian. Rincian: [arsip dan profil](../docs/EMPLOYEE-PROFILES.md).

Data produksi diperbarui pada 12 November 2026 dengan 25 pegawai dari sheet Data Pegawai pada `Nama Pegawai.xlsx`. NIP dipertahankan 18 digit; ID Gmail sementara dibuat dari nama tanpa gelar. Unit yang tidak tersedia pada sumber memakai BPS Kota Batu; satu golongan kosong tetap kosong. Riwayat pegawai sebelumnya dibersihkan dalam transaksi; periode, bank soal, konfigurasi, dan audit dipertahankan. Cadangan sebelum perubahan ada pada `/home/bps/talenta-deploy-20261112/app/deploy/state/backups/before-real-employees-1794455244959.dump` (mode 600).

Atas instruksi pengguna, Admin dan semua pegawai kini memakai password default yang ditentukan pengguna, tanpa kewajiban mengganti password saat login. File daftar akun lokal berada di `deploy/state/Akun Talenta Admin dan Pegawai.txt`, tidak masuk Git maupun aset publik. ID Gmail tersebut hanya ID aplikasi, bukan pembuatan akun Gmail. Kredensial Admin pada file privat server `admin-first-login.env` juga sudah diselaraskan. Login cepat testing tetap dinonaktifkan di produksi. Seluruh 25 hash password diverifikasi, login Admin/pegawai dan daftar 25 pegawai diuji melalui browser publik. Tidak ada perubahan kode aplikasi yang memerlukan restart; perubahan data langsung aktif pada layanan produksi.

## Instalasi pada server yang sudah diperiksa

Server aktual: Ubuntu 24.04, Node 22.23.2, PostgreSQL 16. Virtual host domain sudah tersedia dengan sertifikat pada `/etc/ssl/certs/talenta.crt` serta Cloudflare Tunnel aktif. Konfigurasi ini memakai [nginx-existing-server.conf](nginx-existing-server.conf), bukan template Let's Encrypt di bawah.

Skrip [install-server.sh](install-server.sh) telah diperiksa dengan `bash -n` dan sudah dijalankan melalui sudo oleh pengguna. Perintah instalasi pertama berikut disimpan sebagai dokumentasi; jangan dijalankan ulang untuk memperbarui aplikasi:

```sh
sudo bash /home/bps/talenta-deploy-20261112/app/deploy/install-server.sh
```

Skrip mencadangkan schema dan virtual host, memprovisi role aplikasi, memasang kode ke `/var/www/talenta.bpskotabatu.com` sesuai lokasi mayoritas project web di server, menjalankan migrasi, membuat Admin produksi, serta memasang systemd dan Nginx. Konfigurasi lama dipulihkan jika `nginx -t` gagal. Skrip menolak instalasi Talenta yang sudah ada dan port 5015 yang terpakai. Perilaku bootstrap instalasi baru mewajibkan ganti password; konfigurasi akun deployment saat ini mengikuti revisi pengguna di atas.

Konfigurasi HTTP origin menerima HTTPS yang diteruskan Cloudflare melalui header `X-Forwarded-Proto`; HTTP biasa diarahkan ke HTTPS. IP klien dari `CF-Connecting-IP` hanya dipercaya dari loopback tempat tunnel lokal berjalan. API tetap mengikat `127.0.0.1:5015`.

## Koneksi

Di VPS, PostgreSQL diakses langsung melalui `127.0.0.1:5432`; port `15432` hanya untuk tunnel DBeaver di komputer lokal. Jangan memasang PostgreSQL baru atau mengubah database/schema aplikasi lain.

```dotenv
NODE_ENV=production
PORT=5015
APP_ORIGIN=https://talenta.bpskotabatu.com
DATABASE_URL=postgresql://talenta_app:PASSWORD_YANG_DIENCODE@127.0.0.1:5432/db_magang
DB_SCHEMA=management_talenta
TEST_LOGIN_ENABLED=false
TRUST_PROXY=true
```

Gunakan `DATA_ENCRYPTION_KEY` acak 64 karakter heksadesimal dan simpan bersama cadangan. Jika memindahkan data psikologi dari instalasi lama, pertahankan kunci lama. Berkas `.env` development tetap memakai database testing lokal.

`DB_SCHEMA` mengatur startup `search_path` pada setiap koneksi pool dan transaksi, tanpa fallback ke `public`. Aplikasi menolak schema yang tidak ada/tidak dapat diakses sebelum migrasi. Ini mengatur lokasi tabel, bukan pengganti pembatasan hak akses PostgreSQL.

## Persiapan di VPS

Letakkan kode aplikasi di `/var/www/talenta.bpskotabatu.com`. Gunakan Node.js 22 atau lebih baru. Jalankan `npm ci` (termasuk devDependencies karena runtime memakai `tsx`), lalu `npm run build`.

Untuk instalasi produksi baru, generator berikut membuat `app.env` serta `provision.sql` dengan password acak yang cocok. Jalankan di VPS; kedua file berisi rahasia dan tidak boleh dimasukkan ke Git atau dibagikan lewat chat. Generator menolak menimpa konfigurasi yang sudah ada.

```sh
node scripts/prepare-production.mjs
```

Administrator PostgreSQL menjalankan `deploy/state/provision.sql` pada **db_magang** memakai `psql -X -v ON_ERROR_STOP=1`. Skrip membuat role `talenta_app`, memberikan CONNECT ke db_magang, dan mengalihkan kepemilikan schema kosong `management_talenta` kepada role aplikasi. Seluruh langkah dalam satu transaksi; skrip menolak role yang sudah ada atau schema yang sudah berisi objek untuk mencegah reset/penimpaan tak sengaja. Tidak ada perubahan pada hak akses schema aplikasi lain. Untuk autentikasi peer lokal, administrator dapat memakai:

```sh
sudo install -o postgres -g postgres -m 600 deploy/state/provision.sql /var/lib/postgresql/talenta-provision.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d db_magang -f /var/lib/postgresql/talenta-provision.sql
sudo rm /var/lib/postgresql/talenta-provision.sql
```

Contoh ini memerlukan akun OS `postgres` dan direktori standar PostgreSQL. Sesuaikan dengan instalasi server yang sebenarnya. Tidak mengubah autentikasi PostgreSQL atau mengekspos port database ke internet.

Buat akun sistem `talenta` tanpa login jika belum ada. Pasang `app.env` sebagai `/etc/talenta/talenta.env`, owner root, group talenta, mode 640, dan direktori mode 750. Jangan menimpa konfigurasi produksi yang sudah ada. Pastikan akun `talenta` dapat membaca `/var/www/talenta.bpskotabatu.com` dan menjalankan Node pada `/usr/bin/node`, sesuai `talenta.service`.

Saat migrasi dan bootstrap, muat environment produksi secara eksplisit (jangan memakai `.env` development):

```sh
set -a
. ./deploy/state/app.env
set +a
npm run db:migrate
```

Untuk Admin pertama, isi `BOOTSTRAP_USERNAME` dan `BOOTSTRAP_PASSWORD` melalui environment sesi terminal, lalu `npm run admin:create`. Password minimal 16 karakter; jangan ditulis di riwayat shell atau dikirim ke chat. Hapus variabel bootstrap setelah selesai. Jangan menjalankan seed/reset testing di produksi.

Pasang `deploy/talenta.service` ke `/etc/systemd/system/talenta.service`, kemudian `sudo systemctl daemon-reload` dan `sudo systemctl enable --now talenta`. Verifikasi `curl -f http://127.0.0.1:5015/api/health`.

## Nginx dan HTTPS

DNS `talenta.bpskotabatu.com` harus menuju server yang dapat diakses pengguna. Alamat `192.168.100.10` adalah alamat LAN; akses internet membutuhkan pemetaan pada jaringan yang menghadap publik jika belum tersedia.

Tinjau virtual host Nginx yang sudah ada. Gunakan `nginx-bootstrap.conf` untuk challenge ACME sebelum sertifikat tersedia; direktori `/var/www/letsencrypt` perlu dibuat. Setelah sertifikat domain terbit pada path Let's Encrypt standar, pasang `nginx.conf`. Jangan mengaktifkan dua server block dengan nama domain sama. Jalankan `sudo nginx -t` sebelum reload. Jangan menggunakan konfigurasi HTTPS sebelum sertifikat tersedia.

Konfigurasi akhir melayani HTTPS di 443 dan meneruskan request ke aplikasi di port 5015. Verifikasi halaman login, `/api/health`, cookie Secure, akses Admin, impor/ekspor, serta pembatasan akses pegawai. Cadangkan schema dengan `pg_dump -d db_magang --schema=management_talenta` dan simpan kunci enkripsi terpisah; role PostgreSQL juga perlu dicatat untuk pemulihan.

Referensi: [PostgreSQL schemas/search_path](https://www.postgresql.org/docs/current/ddl-schemas.html), [node-postgres connection options](https://node-postgres.com/apis/client), [Nginx proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).


## Pembaruan review 16 November 2026

`update-review-server.sh` telah dijalankan pengguna dan diverifikasi melalui database, API, dan browser publik. Tujuh migrasi tersedia; asesmen potensi/DNA seluruh pegawai dikosongkan, hasil kuadran lama dihapus, pelatihan/penghargaan menjadi 192/96, dan CKP lengkap 288 nilai. Roster, arsip Adam, akun, tim dan penilaian ketua tetap tersedia. Skrip menyimpan backup schema dan kode, menerapkan perubahan data dalam satu transaksi dengan audit sekali jalan, dan menolak mengulang reset setelah aktivasi. Jangan menjalankan skrip seed atau pengganti roster untuk pembaruan ini.


## Pembaruan potensi 17 November 2026

`update-potential-server.sh` telah diaktifkan pengguna. Verifikasi database/API/browser desktop lulus: 22 profil DNA dummy baru, dua isian sebelumnya dipertahankan, 24 koordinat unik seluruhnya Talenta Unggul, Herlina 100/100 dan Nurlaila 93,75/96. Nomor empat kuadran tersedia pada legenda/tooltip/tabel. Skor kuadran tetap simulasi instrumen lama, bukan rumus DNA resmi. Pemeriksaan health, login, cookie, serta hover titik dan CKP produksi lulus. Paket staging berada di `/home/bps/talenta-potential-update-20261117/app`; cadangan dibuat skrip di `/var/backups/talenta/potential-*`.

# Simulasi pengembangan pegawai

Data dummy sementara dibuat atas permintaan pengguna untuk 24 pegawai aktif pada periode Talenta 2026. Pegawai arsip, identitas, foto, akun, password, psikologi, CKP, serta riwayat periode lain tetap dipertahankan.

Isi simulasi:

- Satu pelatihan dan satu penghargaan per pegawai, dengan dokumen teks yang terang-terangan menyatakan dummy; tidak membuat sertifikat atau tanda tangan palsu.
- Empat tim sementara. Tiap pegawai memiliki tim utama. Empat ketua juga menjadi anggota tim lain sehingga seluruh pegawai memperoleh penilaian dari ketua yang ditugaskan, tanpa menilai diri sendiri.
- Empat indikator penilaian ketua terisi dan dikirim sebagai simulasi, dengan catatan dummy.
- Isian potensi manajerial/teknis sementara untuk sumbu kuadran serta 30 jawaban DNA sementara untuk menampilkan profil asesmen. Keduanya memakai aturan hitung aplikasi yang sudah ada; tidak mengubah ambang, bobot, rumus atau mengarang skor psikologi.
- Nilai potensi 81,25–93,75; kompetensi sekitar 84–95. Semua berada di Talenta Unggul dan setiap koordinat berbeda. Seluruh nilai merupakan ilustrasi, bukan perbandingan kemampuan nyata antarpegawai.

`007_demo_data.sql` menambah penanda periode dan tabel manifest batch. Banner dummy tampil di semua halaman aplikasi ketika periode ini dipilih. Nama kegiatan, kelompok tim, dan catatan penilaian juga memakai label `[DUMMY SEMENTARA]`.

`scripts/create-development-demo.ts --apply --period <id> --expect-active 24` hanya menerima database `db_magang`, schema `management_talenta`, host PostgreSQL lokal. Skrip mencadangkan schema memakai pg_dump sebelum menulis, lalu mengisi dan memvalidasi seluruh cakupan dalam satu transaksi. Proses menolak periode yang sudah memiliki data sumber, penugasan tim atau bank soal aktif. Rerun batch yang sama tidak membuat duplikat. Daftar baris/pegawai yang dibuat disimpan di `demo_data_batches.manifest` agar pembersihan sementara dapat ditargetkan kemudian. Jangan memakai penggantian roster atau seed umum untuk membersihkan dummy.

Paket aktivasi: `/home/bps/talenta-dummy-update-20261116/app`. Lokasi aplikasi tetap `/var/www/talenta.bpskotabatu.com`, port 5015. `deploy/update-dummy-server.sh` mencadangkan schema/kode, memasang kode dan migrasi, memastikan aplikasi baru sehat, lalu menjalankan transaksi dummy sebagai langkah terakhir. Kredensial dan konfigurasi dipertahankan. Aktivasi memerlukan sudo di terminal server; akun bps meminta password.

Validasi lokal: 69 tes unit/API lulus, termasuk kepemilikan data, keutuhan akun/arsip, backup gagal, penolakan penimpaan, idempotensi, penugasan silang dan 24 koordinat unik. Lint dan build lulus. Browser memverifikasi 24 titik unik dan 24 baris pada desktop/ponsel, label dummy, tabel kegiatan, akses ketua, serta pembatasan peta pegawai menjadi data sendiri. Staging Linux lolos npm ci, TypeScript, pemeriksaan sintaks skrip aktivasi dan 6 tes utama migrasi, dummy, profil/pendidikan serta role.

Deployment telah diaktifkan pengguna dan diverifikasi pada 16 November 2026. Paket server dan checksum telah diperiksa. Perintah berikut merupakan catatan aktivasi yang sudah dijalankan, bukan untuk diulang:

```sh
sudo bash /home/bps/talenta-dummy-update-20261116/app/deploy/update-dummy-server.sh
```

Verifikasi produksi lulus melalui localhost dan `https://talenta.bpskotabatu.com`: 24 pegawai aktif, semua sumber dummy terisi, 28 penugasan tim, 24 koordinat unik dengan nilai baik, serta Pak Adam tetap di arsip. Tujuh migrasi tersedia hanya di schema management_talenta; role database tetap terbatas. Health, login Admin yang sudah ada, cookie aman, pembatasan API, aset, dan logout lulus. Systemd aktif dengan NRestarts=0.

Browser produksi membuktikan 24 titik dan 24 baris tampil pada desktop/ponsel dengan label dummy, tanpa overflow halaman atau error JavaScript. Akun ditutup melalui logout sesudah verifikasi. Screenshot privat ada di `deploy/state/dummy-qa/production-quadrants-desktop.png` dan `production-quadrants-mobile.png`. Tidak ada profil, foto, atau nilai pegawai nyata yang diedit untuk QA browser.

Pemeriksaan ulang baca-saja dapat dijalankan sebagai bps dari staging dengan `node --import tsx deploy/verify-dummy-server.mjs`; tidak mencetak kredensial dan tidak mengisi ulang dummy.

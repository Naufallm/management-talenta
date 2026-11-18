# Pengujian lokal 16 November 2026

Revisi ini hanya diterapkan ke aplikasi lokal `http://127.0.0.1:5173`. Produksi tidak diubah atau di-deploy. Data dan konfigurasi lokal sebelumnya dipertahankan; konfigurasi lama dicadangkan privat di `deploy/state/backups`.

Database aktif adalah PGlite `data/postgres-local-review-20261116-v4`, dipilih melalui `.env`. Daftar nama, NIP, jabatan, golongan dan akun pegawai mengikuti roster privat `deploy/state/real-employees.json` dari workbook pengguna. Terdapat 24 pegawai aktif dan Pak Adam tetap diarsipkan. Database review versi sebelumnya merupakan snapshot terpisah dan tidak digunakan aplikasi aktif.

Isi data review:

- Capaian kinerja Januari sampai Desember 2026 untuk setiap pegawai aktif: 288 nilai.
- Seluruh 24 posisi berada di Talenta Unggul, tersebar pada koordinat berbeda di area tersebut. Ambang dan rumus skor tidak diubah; posisi dihasilkan dari isian sumber dan perhitungan aplikasi.
- Herlina Prasetyowati Sambodo pertama dan Nurlaila Oktarahmayanti kedua pada potensi, kompetensi, dan rata-rata capaian kinerja tahunan, sesuai pengaturan dataset lokal yang diminta.
- Tiap profil DNA memiliki satu klaster tertinggi; total komposisi D/N/A tetap tepat 100%. Perhitungan umum untuk jawaban lain tidak diberi pemutus seri sembarang.
- Empat tim, penugasan silang ketua, pelatihan, penghargaan dan penilaian ketua tersedia. Banner serta label dummy/simulasi di tampilan lokal dihilangkan; jejak pembuatan fixture tetap tersimpan secara internal.

`TEST_LOGIN_ENABLED=true` mengaktifkan login cepat Admin, Supervisor dan Pegawai di lokal. Mekanisme testing yang sudah ada menyiapkan kata sandi lokal 123456. Kebijakan login testing pada produksi tetap dinonaktifkan oleh kode.

Grafik kuadran menggunakan sumbu tetap 0-100 tanpa dropdown rentang. Pada dashboard grafik mengisi lebar penuh, dengan panel progres dan ringkasan di bawahnya; halaman peta juga memakai seluruh lebar workspace. Label kategori berada di luar plot dan area target pointer titik diperluas. Nilai posisi tidak digeser secara visual.

Admin dapat membuka Detail Pegawai > Kelola peran untuk menentukan akses Pegawai, Supervisor, dan Admin serta peran awal login. Dialog yang sama digunakan pada Pengguna & Peran, dengan larangan mengubah akses akun sendiri tetap berlaku.

Pembuatan fixture dijalankan melalui `scripts/prepare-local-review.ts`; hanya menerima konfigurasi PGlite lokal dan database baru yang kosong. Skrip menolak konfigurasi produksi/DATABASE_URL dan tidak menimpa database yang sudah berisi pegawai atau akun. Jangan menjalankan ulang pada folder aktif.

Validasi: tes fixture lulus untuk 288 nilai, cakupan pegawai, posisi unik, seluruh Talenta Unggul, urutan dua nilai tertinggi, dominasi DNA tunggal dan larangan target produksi. Lint dan build lulus. QA browser lulus untuk data API lokal, 24 titik yang berjauhan, hover nama Herlina pada titik tertinggi di desktop/ponsel, skala tetap tanpa dropdown, tampilan tanpa label dummy, serta login cepat Admin, Supervisor dan Pegawai. Screenshot privat tersimpan di `deploy/state/local-review-qa`. Browser QA diakhiri dengan logout dan tidak menulis nilai/profil baru.

Revisi interaksi: rincian CKP yang dapat digulir ditempatkan di bawah plot agar tidak menutupi titik atau mengunci hover. QA browser menguji Maret, scroll 24 pegawai, lalu pindah September dan Januari tanpa menutup rincian. QA juga menyimpan hak Supervisor/Admin melalui detail pegawai, memeriksa API, lalu mengembalikan hak akun awal. Tes integrasi peran/profil/pendidikan lulus (2 tes).


Pembaruan berikutnya (16 November): database aktif dipindahkan ke v5; snapshot v4 dipertahankan. Seluruh isian DNA dan potensi lama beserta hasil kuadran dikosongkan. Masing-masing 24 pegawai aktif memiliki minimal 8 pelatihan dan 4 penghargaan (192/96), CKP tetap 288 nilai. Pengujian browser reset lulus. Paket deployment review disiapkan dengan backup schema, perubahan atomik, dan audit sekali jalan agar menjalankan skrip ulang tidak menghapus jawaban baru. Aktivasi produksi membutuhkan sudo pengguna.


Aktivasi produksi telah dikonfirmasi pengguna dan diverifikasi pada 16 November 2026. Aplikasi `/var/www/talenta.bpskotabatu.com`, service talenta dan health localhost/domain publik aktif. Pemeriksaan database dan browser produksi lulus: potensi lama/DNA/skor/kuadran kosong, 24 pegawai aktif, Adam tetap arsip, 192 pelatihan, 96 penghargaan, 24 penilaian ketua, 28 penugasan tim, serta 288 CKP untuk 12 bulan. Opsi peran Pegawai/Supervisor/Admin tampil di detail pegawai. Login Admin dan Pegawai, cookie aman, akses API, tampilan desktop/ponsel lulus tanpa mengubah data. Produksi tidak menyediakan login cepat. Cadangan sebelum aktivasi dibuat oleh skrip di `/var/backups/talenta/review-*`.


## Simulasi potensi 17 November 2026

Atas instruksi pengguna, potensi dummy diisi lagi. Profil DNA baru memiliki satu kecenderungan D/N/A dan satu kecocokan formasi teratas. Isian DNA yang sudah ada di produksi dipertahankan (dua isian saat pra-deploy). Nilai sumbu potensi menggunakan simulasi pada instrumen lama, terpisah dari DNA; rumus pemetaan DNA ke potensi belum ditetapkan dan tidak diperkenalkan pada revisi ini. Penilaian ketua yang tercatat sebagai dummy pada manifest disesuaikan agar posisi tersebar, tetap seluruhnya Talenta Unggul, dengan Herlina pertama dan Nurlaila kedua. Data nyata dan akun tidak ditimpa. Nomor kuadran pada legenda/tooltip/tabel: I Perlu Pengembangan, II Profesional Andal, III Talenta Berkembang, IV Talenta Unggul.

Database lokal aktif v8; snapshot v5-v7 dipertahankan. QA browser lokal lulus untuk 24 koordinat unik, urutan dua teratas, dominasi DNA tunggal, hover skor 100, CKP dan role. Paket final staging `/home/bps/talenta-potential-update-20261117/app` memakai skrip `deploy/update-potential-server.sh`, dengan backup dan transaksi sekali jalan. Aktivasi produksi menunggu eksekusi sudo pengguna. Prioritas revisi berikutnya desktop sesuai arahan terbaru.


Aktivasi potensi 17 November 2026 telah dijalankan pengguna dan diverifikasi produksi. Audit mencatat 22 profil DNA dummy baru dan dua isian sebelumnya dipertahankan; timestamp kedua isian terkonfirmasi tidak berubah. Produksi memiliki 24 titik unik di Talenta Unggul: Herlina 100/100, Nurlaila 93,75/96, rentang potensi 56,25-100 dan kompetensi 57,05-100. Pelatihan/penghargaan tetap 192/96 dan penugasan tetap 28. QA browser desktop publik lulus untuk nomor Kuadran IV, profil DNA, hover titik Herlina pada skor 100, serta hover CKP Maret-September-Januari sesudah scroll 24 pegawai. Service, health localhost/domain, login dan cookie produksi lulus. Pengujian ponsel lanjutan ditunda sesuai arahan pengguna.

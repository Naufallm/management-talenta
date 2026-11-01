# Status implementasi

Tanggal awal implementasi: 27 Oktober 2026, Asia/Jakarta.

## Pembaruan branch work — 1 November 2026

- Akun testing Admin memakai `admin@bpskotabatu.com`; Supervisor memakai `supervisor@bpskotabatu.com`, dengan pembatasan peran branch `work` tetap berlaku.
- Password semua akun testing direset ke `123456`. ID internal pengguna, NIP pegawai, hubungan database, dan hasil penilaian dipertahankan. Sesi lama dihentikan saat reset.
- Mode testing melewati kewajiban mengganti kata sandi awal. Akun baru dan reset password juga mengikuti password testing yang sama.
- Halaman login menyediakan tombol Admin/Supervisor dan pilihan pegawai, menggunakan autentikasi API biasa.
- Reset otomatis hanya satu kali per database; restart berikutnya mempertahankan sesi serta perubahan password. Reset ulang tersedia melalui `npm run auth:reset-testing`.
- Mode testing aktif di luar produksi pada branch ini, dapat dimatikan melalui `TEST_LOGIN_ENABLED=false`, dan selalu nonaktif saat `NODE_ENV=production`.
- Bagian di bawah mencatat implementasi awal; pembaruan ini menggantikan ketentuan wajib mengganti password untuk mode testing.
- Verifikasi pembaruan: 30/30 pengujian unit/API, TypeScript, lint, build, dan QA browser desktop/mobile lulus. Login manual maupun login cepat Admin, Supervisor, dan Pegawai diuji tanpa prompt penggantian password; pembatasan akses Supervisor tetap berlaku.

## Sumber dan audit awal

- Folder kerja awal kosong, tanpa package, kode aplikasi, database, Git, atau PRD PDF. Tidak ada fungsi lama yang ditimpa.
- Referensi Figma berhasil dibaca melalui MCP: ketiga page teridentifikasi. Konteks desain dan screenshot Daftar Pegawai (`7:70`), Dashboard (`7:2`), Detail Pegawai (`7:139`), dan Asesmen Potensi (`7:858`) digunakan untuk implementasi.
- Token layout/warna diadaptasi ke komponen responsif, menggunakan Geist sesuai brief. Ikon navigasi, filter, form, dialog, dan state dikembangkan untuk interaksi yang belum dirinci dalam frame.
- Aset titik grafik dari Figma diunduh ke `public/assets/talent-point.svg`; dimensi asli 9×9 dipertahankan dan dipakai pada titik scatter. Tidak ada URL aset Figma sementara pada kode runtime.

## Implementasi yang dapat digunakan

Foundation, autentikasi, tiga peran, CRUD/detail pegawai, penugasan tim, periode, bank soal, draft/review/submit potensi, pembukaan kembali dengan audit, bukti kompetensi dan verifikasi, penilaian Ketua Tim, konfigurasi dan perhitungan ulang, CKP bulanan dan impor CSV/XLSX, kuadran dan riwayat, rekap CSV, asesmen psikologi privat tanpa skoring klinis, pengguna/peran, dan audit log sudah terhubung ke database dan API.

Admin dan Super Admin berbagi shell dan komponen halaman. Pegawai hanya memperoleh data individual. Endpoint Ketua Tim mengembalikan identitas kerja dan draft penilaian yang diperlukan, tanpa membuka profil pribadi anggota. Endpoint detail umum, dashboard, CKP, dan laporan tidak menggabungkan tabel psikologi.

## Keputusan bisnis yang perlu dikonfirmasi terhadap PRD

1. **Instrumen potensi dan skala:** development menggunakan jawaban 1–5, dengan normalisasi `(jawaban−1)×25`, lalu rata-rata per kategori dan pembobotan manajerial/teknis. Rubrik/instrumen final belum diberikan. Bobot default 50/50 dapat diubah. Bank soal yang telah dijawab dibekukan; instrumen baru dibuat pada periode baru.
2. **Kompetensi:** default bobot bukti/Ketua Tim 50/50. Bukti dihitung dari `jam pelatihan terverifikasi / target jam × 100 + jumlah penghargaan terverifikasi × poin penghargaan`, dibatasi 100. Target awal 40 jam dan 10 poin/penghargaan adalah **asumsi development**, dapat diubah per periode; belum merupakan ketetapan resmi BPS. Indikator Ketua Tim awal: kualitas pekerjaan, kolaborasi, tanggung jawab, dan pemecahan masalah; skor akhirnya rata-rata indikator. Indikator dan rubrik final perlu persetujuan pemilik PRD.
3. **Kelangkaan penilaian:** jika bobot Ketua Tim > 0 dan belum ada penilaian terkirim, kompetensi belum memiliki skor akhir dan pegawai belum ditempatkan di kuadran. Tidak mengubah ketiadaan penilaian menjadi nilai nol. Jika ada lebih dari satu Ketua Tim yang ditugaskan, nilai ketua dirata-ratakan.
4. **Ambang kuadran:** awal 50/50, dapat diubah. Skor yang tepat pada ambang termasuk kelompok tinggi. CKP selalu terpisah.
5. **Unggah bukti pegawai:** default nonaktif. Jika diaktifkan, bukti pegawai belum terverifikasi dan hanya Admin/Super Admin yang memverifikasi. Dokumen diperlukan untuk memverifikasi kegiatan melalui API. Beberapa kegiatan seed fiktif memiliki nilai contoh tanpa lampiran untuk ilustrasi development.
6. **Tim:** satu Ketua Tim per tim/tahun, anggota dapat berada pada lebih dari satu tim. Setelah ada penilaian Ketua Tim terkirim, perubahan struktur tahun tersebut dibekukan secara konservatif untuk menjaga sumber penilaian.
7. **Asesmen psikologi:** seed berisi dua pertanyaan refleksi fiktif untuk menguji alur teknis. Tidak ada instrumen psikologi tervalidasi, skor klinis, kategori kondisi mental, diagnosis, atau rekomendasi klinis yang dihasilkan. Status hasil tetap “Belum dapat dihitung”. Modul ini memerlukan validasi psikolog sebelum dipakai sebagai instrumen sungguhan.
8. **Pemulihan akun:** Super Admin mereset password, memberikan password sementara melalui saluran internal yang sesuai, dan pegawai wajib menggantinya. Pengiriman email otomatis/SSO menunggu infrastruktur.
9. **Retensi:** pegawai dinonaktifkan melalui soft delete. Lama retensi dokumen, jawaban psikologi, audit, mekanisme penghapusan resmi, dan kebijakan akses operasional perlu ditetapkan BPS.

## Belum diimplementasikan / belum diverifikasi

- Validasi psikolog dan perhitungan berdasarkan instrumen tervalidasi sengaja belum tersedia.
- Impor massal pegawai, unggah foto profil, ekspor PDF/XLSX laporan, email reset mandiri, serta SSO belum tersedia. Impor CKP CSV/XLSX dan ekspor laporan CSV tersedia.
- Form perubahan indikator/rubrik Ketua Tim, jenis pertanyaan selain skala 1–5, dan versioning instrumen lintas tahun otomatis belum tersedia; implementasi awal dan asumsi skoring di atas perlu diselaraskan dengan PRD final.
- Pengujian menggunakan engine PostgreSQL PGlite dan database terisolasi. Koneksi ke server PostgreSQL eksternal/managed, reverse proxy HTTPS, multi-instance sessions/rate-limit storage, backup/restore dan beban produksi belum diverifikasi. Rate limiter saat ini berada di memori proses; deployment awal satu instance.
- Tidak ada deployment atau publikasi eksternal yang dilakukan. Aplikasi dan source berada di workspace lokal sesuai permintaan.

## Verifikasi

- `npm test`: **22/22 lulus**, mencakup login, pergantian password, CSRF/Origin, CRUD pegawai, RBAC/IDOR, psikologi terenkripsi, audit akses, asesmen terkunci, submit bersamaan, perubahan konfigurasi, otorisasi Ketua Tim, CKP independen dari kuadran, pagination dengan agregat utuh, ekspor CSV lengkap, impor atomik, Excel, dokumen privat, dan logout.
- `npm run test:browser`: **lulus** dengan Chrome, tiga peran dan penugasan Ketua Tim; alur tambah/edit pegawai, klik titik grafik menuju detail, pencarian, tab detail, pengaturan, draft/review/submit asesmen pegawai maupun Ketua Tim dan penguncian, navigasi mobile. Tidak ada JavaScript page error atau overflow dokumen pada 1440×1000 dan 390×844.
- `npm run lint`, `npm run typecheck`, `npm run build`: lulus pada implementasi yang diuji. Halaman dimuat melalui lazy import, grafik dipisahkan dalam chunk sendiri, dan font disimpan lokal.
- Masalah yang ditemukan dan diperbaiki: Origin QA berbeda dari aplikasi; nama aksesibel field tertambahi teks bantuan; font subset yang tidak tersedia; overflow mobile akibat posisi label tersembunyi dalam tabel; kunci transaksi struktur tim terhadap submit penilaian.
- Screenshot desktop dan mobile tersimpan di `docs/screenshots/`.

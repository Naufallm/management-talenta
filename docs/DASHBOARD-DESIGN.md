# Dashboard Talenta

Pembaruan 9 November 2026 mengganti tema area aplikasi setelah login mengikuti nuansa [UKO Minimal Web App & Admin Dashboard oleh UI Lib](https://dribbble.com/shots/17060112-UKO-Minimal-Web-App-Admin-Dashboard). Contoh visual tambahan dari [rangkaian UKO yang sama](https://dribbble.com/shots/17028456-UKO-Minimal-Web-App-Admin-Dashboard) digunakan untuk melihat komposisi kartu, grafik, gauge, dan warna pastel. Konektor Figma tidak dapat membaca node `1039:6477` pada file yang diberikan karena memerlukan akses editor; implementasi ini merupakan adaptasi tema Dribbble, bukan salinan persis layer Figma. Gambar referensi tidak dimasukkan sebagai aset aplikasi.

Tema bersama di `src/components/AppTheme.css` berlaku pada sidebar, header, kartu, tabel, filter, tombol, form, tab, profil, hasil potensi, serta dialog pada seluruh modul setelah login. Pembaruan berdasarkan `Frame 3427.png` memakai latar `#f4f5f9`, kartu putih, teks utama `#28335a`, dan aksen `#2c3cdd`, dipadukan dengan coral, teal, serta lavender. Panel/kartu utama bersudut 9 px dengan bayangan tipis; avatar kotak tetap konsisten. Header menjadi putih dengan garis pembatas. Sidebar menampilkan label lengkap secara default dan bisa diringkas menjadi kolom ikon 82 px lewat tombol header; nama aksesibel dan tooltip tetap tersedia pada setiap tautan. Logo BPS dan font Geist tetap digunakan. Beranda publik tetap menggunakan desainnya sendiri; login diperbarui sesuai [LOGIN-DESIGN.md](LOGIN-DESIGN.md).

Bagian sambutan dashboard menjadi kartu putih dengan avatar dan aksi laporan/profil. Kartu ringkasan, tinggi grafik, dan gauge dirapikan agar lebih ringkas. Grafik batang kinerja memakai lavender dengan sorotan indigo saat hover; grid dan label memakai warna lembut. Data bulanan, jeda nilai kosong, warna kuadran, serta pemisahan grafik batang khusus pengelola tetap berlaku.

## Tata letak dan data

- Kartu Admin/Supervisor: jumlah pegawai aktif, rata-rata kompetensi, rata-rata Capaian Kinerja Pegawai, serta jumlah Talenta Unggul. Ikon dengan latar pastel berada di kiri label, nilai utama lebih tegas, dan persentase Talenta Unggul tampil sebagai badge. Persentase dihitung dari jumlah pegawai aktif pada periode terpilih.
- Grafik utama membuka Peta Talenta secara default. Tombol Peta Talenta/Tren Capaian Kinerja Pegawai berstatus `aria-pressed` dan dapat dioperasikan dengan keyboard. Tren Capaian Kinerja Pegawai memakai grafik area biru pada skala 0–100; interpolasi tetap linear, dan bulan tanpa data menjadi jeda. Warna kuadran tetap mengikuti makna talenta yang sudah ada.
- Panel progres menampilkan persentase serta jumlah asesmen potensi terkirim, jumlah belum terkirim, status periode, dan tanggal akhir. Gauge SVG berbentuk setengah lingkaran dengan warna coral memiliki nama dan nilai aksesibel. Akses cepat sesuai peran berada pada panel tersendiri di bawah progres; tiap aksi diberi ikon dan penanda warna pastel.
- Pada beranda Pegawai, progres tersebut mengikuti status pengiriman D/N/A pada tahun terpilih agar konsisten dengan kartu Potensi saya. Saat hasil gagal dimuat, progres menampilkan status kesalahan dan pilihan muat ulang.
- Tabel pengelola menampilkan potensi, kompetensi, Capaian Kinerja Pegawai, serta kuadran pegawai aktif. Lima baris per halaman, urutan nama mengikuti laporan, dan tautan nama/ikon mata menuju profil yang sesuai. Data yang belum lengkap ditampilkan dengan tanda `—` dan status yang menjelaskan ketiadaannya.
- Akun Pegawai menampilkan profil potensi D/N/A, kompetensi, Capaian Kinerja Pegawai, serta posisi talenta sendiri. Sejak 9 November 2026, kartu **Potensi saya** langsung menampilkan semua kategori dominan (termasuk seri), formasi dengan kemiripan tertinggi beserta persentasenya, dan tautan Lihat hasil. Sumbernya hasil asesmen D/N/A terkirim pada tahun terpilih; tidak memakai skor manajerial/teknis sebelumnya. Draft menampilkan jumlah jawaban tersimpan; data yang belum ada dan kegagalan memuat memiliki status tersendiri. Panel bawah menampilkan hingga lima nilai Capaian Kinerja Pegawai bulanan terakhir pada tahun terpilih, dengan tautan menuju riwayat lengkap.

## Responsif dan akses

Desktop menampilkan empat kartu dan grafik utama di kiri, dengan progres serta akses cepat di kanan. Layar sampai 1100 px memakai dua kolom kartu dan menempatkan progres/akses cepat di bawah grafik; pada ponsel seluruh panel tersusun vertikal. Tabel pengelola dapat digeser mendatar di dalam panel dengan petunjuk pada layar kecil. Tabel Capaian Kinerja Pegawai pribadi memakai lebar yang lebih ringkas. Preferensi reduced motion menonaktifkan transisi gauge dan tab; animasi filter/grafik yang sudah ada tetap menghormati pengaturan tersebut.

Data mengikuti tahun pada header aplikasi. Sumbernya adalah endpoint dashboard, peta talenta, konfigurasi, Capaian Kinerja Pegawai, laporan, dan profil sendiri yang sudah ada. Respons laporan JSON menambahkan `employee_id` agar tautan profil tepat; kolom ekspor CSV tetap mengikuti format sebelumnya. Hak akses Admin/Supervisor/Pegawai tetap diperiksa server. Capaian Kinerja Pegawai dicatat terpisah dari penentuan kuadran.

## Pratinjau

- [Peta talenta desktop](screenshots/dashboard-desktop.png)
- [Tren Capaian Kinerja Pegawai desktop](screenshots/dashboard-ckp-desktop.png)
- [Tablet](screenshots/dashboard-tablet.png)
- [Ponsel](screenshots/dashboard-mobile.png)
- [Tren Capaian Kinerja Pegawai ponsel](screenshots/dashboard-ckp-mobile.png)
- [Dashboard Pegawai](screenshots/dashboard-pegawai-mobile.png)
- Profil D/N/A pada beranda Pegawai: [desktop](screenshots/dashboard-pegawai-dna-desktop.png) dan [ponsel](screenshots/dashboard-pegawai-dna-mobile.png).

Seluruh pratinjau memakai data testing fiktif. Hasil pemeriksaan dicatat di [STATUS.md](STATUS.md).

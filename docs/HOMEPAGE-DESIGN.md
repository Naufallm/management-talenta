# Beranda publik BPS Kota Batu

Beranda mengikuti referensi pengguna: navigasi Beranda/Tentang Kami, pengantar di kiri, diagram di kanan, lalu penjelasan manajemen talenta. Logo memakai PNG BPS yang diberikan, disalin tanpa mengubah gambar.

## Tema indigo — 9 November 2026

Beranda disamakan dengan login dan dashboard: indigo #2c3cdd, teks navy #151927, kanvas abu muda #f4f5f9, kartu putih, border #e5e9f4, dan aksen coral/lavender. Hero memakai judul tebal dengan kata Talenta berwarna indigo, aksen garis seperti login, dan panel kuadran putih. Informasi potensi/kompetensi/kinerja serta tiga tahap proses ditata sebagai kartu bersudut 9 px. Header putih memiliki garis pembatas dan penanda tautan aktif; CTA bawah menggunakan indigo yang sama.

Diagram tetap interaktif melalui pointer/keyboard dan tidak memuat data pegawai. Warna pastel tiap kuadran mengikuti gaya aplikasi tanpa mengubah nama kategori, sumbu, penjelasan, atau ambang konfigurasi. Pengurangan gerakan tetap berlaku.

Login memakai [doodle SVG baru](../public/assets/uko-login-doodles-hd.svg) yang tetap tajam pada layar besar. Konsep imagegen, file final, dan referensi alternatif dicatat di [UKO-ASSETS.md](UKO-ASSETS.md).

Lint, TypeScript/build, format terarah, dan QA browser lengkap lulus. Beranda diperiksa pada 1440/768/390/320 px, termasuk diagram, keyboard, tautan bagian, reduced motion, redirect login, dan tidak adanya permintaan data privat. Alur ketiga peran serta filter/grafik yang sudah ada tetap lulus. Pratinjau: [desktop](screenshots/beranda-1440.png), [ponsel](screenshots/beranda-390.png), dan [login](screenshots/login-standard-desktop.png).

## Isi dan batas diagram

- Sasaran: pengunjung yang ingin mengenal sistem dan pegawai yang akan masuk.
- Nama instansi: BPS Kota Batu; nama produk: Manajemen Talenta.
- Potensi berasal dari asesmen manajerial dan teknis.
- Kompetensi memadukan bukti terverifikasi dengan penilaian Ketua Tim.
- Diagram mengikuti empat kategori aplikasi: Profesional Andal, Talenta Unggul, Perlu Pengembangan, dan Talenta Berkembang.
- Potensi berada pada sumbu horizontal, kompetensi pada sumbu vertikal.
- Ambang kuadran dapat diatur per periode; beranda tidak menetapkan angka ambang baru.
- Capaian Kinerja Pegawai bulanan terpisah dari penentuan kuadran.
- Pengunjung publik tidak memuat data pegawai, skor, atau hasil psikologi.
- Panduan pengembangan pada ilustrasi adalah penjelasan umum, bukan keputusan penilaian pegawai.

## Arah visual

Panduan: [design-taste-frontend](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md). Pilihan `product-performs`, seed `65904133`, mempertahankan Geist dan biru identitas aplikasi. Diagram menjadi demonstrasi yang bisa dipilih, dengan penjelasan yang berubah sesuai kuadran.

Komposisi acak dari panduan disesuaikan dengan brief: hero dua kolom mengikuti screenshot; bagian tentang menjelaskan sumber penilaian; proses memakai urutan asesmen/pemetaan/pengembangan; penutup mengarah ke login. Foto suasana, surat pendiri, formulir pemasaran, dan reel gulir tidak sesuai isi portal ini sehingga tidak dipakai. Animasi masuk singkat dilengkapi dukungan reduced motion.

Argumen per bagian: sistem memetakan pengembangan (diagram interaktif), pemetaan memiliki sumber yang jelas (potensi/kompetensi/Capaian Kinerja Pegawai), prosesnya saling terhubung (tiga tahap), dan pegawai dapat mengakses akunnya (tautan masuk).

## Navigasi

- `/`: halaman publik, termasuk `#beranda` dan `#tentang-kami`.
- `/login`: autentikasi manual dan login cepat testing yang sudah tersedia.
- `/dashboard`: beranda aplikasi setelah login, sesuai peran.
- URL modul aplikasi tetap berlaku. Pengunjung diarahkan ke login dan dikembalikan ke URL yang diminta setelah masuk.
- Logo BPS juga digunakan pada halaman login, sidebar aplikasi, dan favicon.

## Pemeriksaan visual

`lint.mjs` dari taste-skill: 0 FAIL dan 0 WARN untuk sumber beranda. Transport CDP bawaan `inspect.mjs` mengalami timeout `Page.enable` pada Chrome dan Edge di environment ini. Pemeriksaan produksi menggunakan fungsi `probe`, `frame`, `layout`, `judge`, dan `judgeLayout` dari skill yang sama melalui Playwright/Chrome pada 1440, 768, dan 390 px. Tidak mengklaim bahwa CLI inspector bawaan berhasil.

Kuota foto/video panduan dikecualikan secara terbuka: materi portal ini adalah penjelasan kuadran dan logo BPS yang diberikan. Tidak ada foto temuan, klip, statistik pegawai, atau testimoni contoh yang ditambahkan. Diagram HTML interaktif menjadi visual utama. Seluruh isi tersedia saat reduced motion aktif.

```text
ROUND 1
Seen in one second: Manajemen Talenta dan diagram empat kuadran.
Idea (one sentence): Pemetaan potensi dan kompetensi BPS Kota Batu menjadi demonstrasi arah pengembangan yang bisa dipilih.
Live thing: Empat tombol kuadran memperbarui penjelasan, termasuk melalui keyboard.
Layout words by section: hero=split / about=definition / process=sequence / invitation=field / footer=row
Scores: design 6.5 · usability 7.5 · creativity 7 · content 8 → overall 6.0
Caps applied: Temuan FAIL pada tautan gulir yang terbaca sebagai label di atas heading; batas desain karena tidak memakai empat foto.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 390-full: penjelasan diagram terlalu kecil; naikkan teks hingga 13px.
2. 1440-full: teks isi terlalu pucat; tingkatkan kontras warna teks.
3. 390-full: tautan gulir mengulang navigasi Tentang Kami; hapus tautan duplikat.

ROUND 2
Seen in one second: Nama sistem, diagram talenta, dan tindakan masuk.
Idea (one sentence): Pemetaan potensi dan kompetensi BPS Kota Batu menjadi demonstrasi arah pengembangan yang bisa dipilih.
Live thing: Pilihan kuadran dengan status terpilih dan penjelasan aria-live.
Layout words by section: hero=split / about=definition / process=sequence / invitation=field / footer=row
Scores: design 6.5 · usability 8 · creativity 7 · content 8 → overall 7.2
Caps applied: Batas desain panduan untuk halaman tanpa empat foto; materi diagram diprioritaskan sesuai brief.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 390-full: terlalu banyak ukuran teks berdekatan; samakan heading tahap pada 20px.
2. 1440-fold: meter melihat margin kanan teks 19px lebih dalam; bingkai sebenarnya simetris 96px, perbedaan berasal dari padding tombol kanan.
3. 768-full: diagram menambah panjang halaman pada tablet; dipertahankan agar semua kategori terbaca tanpa gulir horizontal.
```

Snapshot hasil akhir: [desktop](screenshots/beranda-desktop.png), [tablet](screenshots/beranda-tablet.png), dan [ponsel](screenshots/beranda-mobile.png).

Hasil akhir pemeriksaan produksi: 0 FAIL pada ketiga lebar setelah pengecualian kuota foto/video di atas; satu WARN margin teks desktop telah dijelaskan pada ROUND 2. Tidak ada teks tertutup/terpotong pada bingkai gulir yang diperiksa; 25 elemen mendapat animasi masuk dan seluruh konten terlihat tanpa animasi saat reduced motion aktif.

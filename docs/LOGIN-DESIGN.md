# Halaman login

## Versi UKO — 9 November 2026

Pembaruan berikutnya memakai `uko-login-doodles-hd.svg` dengan komposisi doodle yang lebih lega. Aset SVG tetap tajam saat panel diperbesar dan menggunakan indigo/navy/coral/pink yang sama dengan beranda serta dashboard. Konsep PNG imagegen dan prompt disimpan dalam [UKO-ASSETS.md](UKO-ASSETS.md); ilustrasi versi sebelumnya tetap tersedia sebagai riwayat.

Login mengikuti lampiran `Sign In V-1.png`: halaman putih penuh, logo BPS, judul tebal, aksen garis indigo, dua field sejajar pada desktop, tombol utama lebar, dan panel doodle di kanan dengan batas melengkung. Pada layar sampai 900 px, ilustrasi disembunyikan; field disusun vertikal pada ponsel. Tidak ada tombol sosial, pendaftaran, atau Remember me yang tidak didukung alur autentikasi aplikasi. Petunjuk pemulihan akun tetap mengarahkan ke Admin.

Login manual/cepat, tampilkan sandi, pesan gagal, CSRF, sesi, redirect modul, dan mode testing tetap berfungsi. Aset baru dibuat dengan imagegen bawaan; file final serta prompt lengkap ada di [UKO-ASSETS.md](UKO-ASSETS.md). Ilustrasi lama tetap disimpan sebagai riwayat, tetapi tidak lagi digunakan pada halaman login.

Halaman `/404` memakai ilustrasi monitor, judul indigo, dan tautan kembali ke beranda/dashboard sesuai sesi. URL yang tidak ditemukan setelah login memakai halaman 404 yang sama, tanpa shell navigasi. ErrorBoundary aplikasi menggunakan ilustrasi yang sama dengan pesan kendala dan tombol Muat ulang; pesan kesalahan permintaan API biasa tetap tampil dekat konten/form terkait.

Lint, TypeScript/build, format terarah, dan QA browser lengkap lulus. Pemeriksaan meliputi login manual/cepat pada 1440/1024/768/390/320 px, gambar berhasil dimuat, layout form/ilustrasi, keyboard sandi, redirect, halaman 404 publik dan akun Admin beserta tautan pemulihan, serta seluruh alur peran sebelumnya.

Pratinjau: [login desktop](screenshots/login-standard-desktop.png), [login testing](screenshots/login-desktop.png), [ponsel](screenshots/login-mobile.png), [404 desktop](screenshots/error-404-admin-desktop.png), dan [404 ponsel](screenshots/error-404-public-mobile.png).

## Riwayat desain — 2 November 2026

Desain 2 November 2026 mengikuti gambar referensi pengguna: bingkai putih di atas latar abu-abu kebiruan, form di kiri, dan ilustrasi isometrik besar pada panel biru–sian di kanan. Logo BPS dan font Geist mengikuti identitas proyek.

Form tetap menggunakan API autentikasi yang sama, termasuk sesi, CSRF, redirect kembali ke modul, pesan kesalahan, dan tombol tampilkan/sembunyikan sandi. Login cepat Admin/Supervisor serta pilihan Pegawai tetap tersedia saat mode testing aktif. Saat testing nonaktif, form utama berada di tengah panel kiri.

Pada lebar 900 px ke bawah, panel ilustrasi disembunyikan agar ruang dipakai untuk form. Semua field, login cepat, dan tautan kembali ke beranda tetap tersedia. CSS login dipisahkan ke `src/pages/Auth.css`; aturan login lama dibersihkan dari stylesheet global.

## Aset ilustrasi

- File final: [`public/assets/login-talenta-illustration.png`](../public/assets/login-talenta-illustration.png), PNG transparan 1363 × 1154 px.
- Dibuat dengan tool bawaan `image_gen` menggunakan skill [imagegen](C:/Users/kaitourae/.codex/skills/.system/imagegen/SKILL.md), bukan CLI.
- Ilustrasi menampilkan pegawai dengan peta empat kuadran untuk menghubungkan halaman login dengan isi sistem. Gambar merupakan ilustrasi dekoratif; label dan angka penilaian tetap berada pada diagram aplikasi.
- Tidak ada data pegawai nyata, gambar pihak ketiga, atau logo buatan pada ilustrasi. Logo BPS memakai aset terpisah yang diberikan pengguna.

Prompt final:

```text
Use case: stylized-concept. Asset type: a finished illustration for the right-hand visual panel of a BPS Kota Batu employee talent management login webpage. Generate only the illustration, not a webpage or a login form. Primary request: polished isometric 3D editorial illustration of Indonesian public-sector colleagues reviewing talent development data. Scene: one large upright translucent analytics display at the center, clearly showing a simple FOUR-QUADRANT 2-by-2 grid with four dots as the main graphic; a modest small bar chart and two smaller floating document panels support it. One woman in a light headscarf and one man in smart simple office attire stand naturally on either side of the display, reviewing it with a tablet and a document, respectively. A short, cohesive geometric isometric platform supports them. Composition: balanced square landscape-friendly arrangement, the entire scene fully visible with comfortable transparent padding all around, especially above the display. Style: refined professional isometric illustration, dimensional but crisp, simplified character details, clean edges, no cartoon faces close-up. Palette: BPS azure blue, cyan and deep navy, with restrained green and orange details, off-white clothing and documents. Lighting: soft bright studio light. Background: genuinely transparent alpha; no enclosing rectangle, no colored backdrop, no surrounding website. Constraints: no words, no letters, no numbers, no logos, no watermark, no interface border or browser/device frame around the composition. The scene should be legible as a strong single website illustration at 600px wide, not a cluttered collage. The four-quadrant grid is the focal point and must have exactly two columns and two rows.
```

## Verifikasi

QA browser mencakup 1440, 1024, 768, 390, dan 320 px: posisi form/ilustrasi, gambar berhasil dimuat, tidak ada overflow horizontal, keyboard pada tombol tampilkan sandi, pesan gagal login, form tanpa login cepat, login manual/cepat, serta redirect dan akses setiap peran.

Pratinjau: [desktop](screenshots/login-v2-desktop.png), [tablet](screenshots/login-v2-tablet.png), [ponsel](screenshots/login-v2-mobile.png), dan [form tanpa login cepat](screenshots/login-v2-standard.png).

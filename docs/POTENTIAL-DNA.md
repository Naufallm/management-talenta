# Asesmen potensi Drive / Network / Action

Implementasi 8 November 2026 memakai **221026 bahan pemetaan pegawai.docx** dari workspace. Teks dan urutan seluruh 30 pernyataan telah dibandingkan langsung dengan XML Word: **30/30 sesuai**. Nomor 1–10 adalah Action, 11–20 Drive, dan 21–30 Network. Penomoran dokumen dipertahankan karena tabel formasi merujuk nomor tersebut.

## Pengisian tahunan

Pembaruan 9 November 2026 menyembunyikan angka skala/nilai serta kategori Drive/Network/Action dari panduan, soal, dan tinjauan sebelum pengiriman. Slider menampilkan label persetujuan di kedua ujungnya; tinjauan memakai penanda posisi tanpa angka. Nilai aksesibel slider menggunakan deskripsi persetujuan. Nomor dan urutan 30 pernyataan tetap mengikuti Word. Hasil agregat D/N/A tetap tersedia setelah pengiriman, tetapi tinjauan jawaban pegawai tetap berurutan tanpa kategori; kutipan soal per klaster dan nomor soal pada rincian formasi hanya tersedia untuk pengelola. Respons API pegawai juga menghilangkan pemetaan tersebut. Konstanta instrumen berada di server; bank soal berkelompok dibaca melalui endpoint khusus pengelola.

Pegawai membuka **Asesmen Potensi**, membaca panduan, mencentang pemahaman, lalu menekan Mulai asesmen. Slider mulai di 50 pada skala bilangan bulat 0–100. Ujung kiri bertuliskan “Sangat tidak setuju” dan kanan “Sangat setuju”. Posisi awal tidak dianggap terjawab; setelah pernah digeser, angka akhir 50 diperbolehkan sesuai keputusan pengguna.

Hanya pernyataan yang sudah dijawab beserta satu pernyataan berikutnya yang ditampilkan. Soal berikutnya tidak dapat dilewati dengan scroll sebelum slider aktif digeser. Setelah slider dilepas, soal berikutnya terbuka dan container bergeser otomatis. Jawaban terdahulu tetap dapat dicapai dengan scroll ke atas dan diubah. Tombol panah keyboard juga berfungsi; animasi menghormati pengaturan reduced motion.

Draft disimpan otomatis sesudah perubahan, melalui antrean request agar penyimpanan tidak saling menimpa karena urutan jaringan. Tombol Simpan draft tetap tersedia. Muat ulang membuka panduan dengan pilihan Lanjutkan pengisian; jawaban tersimpan, termasuk 0 dan 50, dipulihkan. Nilai hasil belum tersedia saat draft.

Sesudah 30 jawaban lengkap, pegawai meninjau seluruh jawaban dan mengonfirmasi pengiriman. Server memeriksa peran, kepemilikan, CSRF, versi instrumen, persetujuan panduan, rentang nilai, kelengkapan, urutan soal, dan jadwal periode. Pengiriman terkunci satu kali per pegawai/periode. Tahun periode sudah unik pada database; penilaian tahun berikutnya dimulai kosong. Pengiriman bersamaan diserialisasi melalui kunci periode, sehingga satu pengiriman saja yang berhasil. Tidak ada tombol buka ulang untuk instrumen D/N/A ini.

## Riwayat hasil dan isian lintas tahun

Pembaruan 9 November 2026 menambahkan **Riwayat potensi** untuk seluruh tahun yang mempunyai jawaban D/N/A tersimpan, termasuk periode yang sudah ditutup. Tahun ditampilkan dari yang terbaru; persetujuan panduan tanpa jawaban tidak dianggap sebagai riwayat isian.

- **Admin:** buka **Penilaian → Potensi → pilih pegawai**, atau **Pegawai → profil pegawai → Potensi**.
- **Pegawai:** buka **Asesmen Potensi**, atau **profil sendiri → Potensi**.
- Pada **Tahun riwayat potensi**, pilih tahun untuk membaca hasil D/N/A, penjelasan, dan kecenderungan formasi yang tersimpan. Buka **Lihat isian tahun …** untuk membaca jawaban tahun tersebut. Draft menampilkan isian yang sempat disimpan tanpa mengarang hasil akhir.

Pilihan riwayat tidak mengubah pemilih tahun di header atau pengisian tahun aktif. Riwayat hanya dapat dibaca; periode tertutup tetap menolak perubahan. Pegawai hanya bisa membaca riwayatnya sendiri dan tetap tidak menerima pemetaan kategori soal. Admin/Supervisor mengikuti hak akses pengelola yang sudah berlaku. Sejak revisi 12 November 2026, hasil terkini maupun riwayat dihitung untuk tampilan memakai versi acuan terbaru dari jawaban tersimpan. Jawaban dan snapshot hasil asli di database tidak ditimpa; jabatan dan skor kuadran tidak diubah. Data riwayat manajerial/teknis yang sebelumnya disembunyikan tidak dimunculkan kembali.

Endpoint daftar `GET /api/potential-dna/history/:employeeId` hanya mengembalikan tahun/periode, jumlah jawaban, dan waktu/status penyimpanan. Hasil serta isian dipanggil melalui endpoint detail yang sudah ada dengan pemeriksaan kepemilikan yang sama.

Pratinjau: [Admin](screenshots/potensi-history-admin-desktop.png), [Pegawai](screenshots/potensi-history-pegawai-desktop.png), dan [ponsel](screenshots/potensi-history-pegawai-mobile.png). Pratinjau memakai data fiktif pada database QA terisolasi; tidak menambahkan riwayat contoh ke database aplikasi.

## Skor dan penjelasan

Versi instrumen: `bps-dna-30-v1`. Versi perhitungan terbaru: `bps-dna-30-v2`. Setiap pernyataan berbobot sama.

`Skor klaster = jumlah nilai 10 pernyataan klaster / 10`

Rata-rata asli Drive, Network, dan Action masing-masing berskala 0–100 dan dipakai sebagai dasar perhitungan. Kartu hasil menampilkan **komposisi**: `rata-rata klaster ÷ jumlah ketiga rata-rata × 100%`. Pembulatan memakai alokasi sisa terbesar pada satuan 0,01% sehingga angka yang ditampilkan berjumlah tepat 100%. API menyediakan rata-rata pada `scores` dan persentase pada `composition`.

Semua klaster dengan rata-rata asli tertinggi ditampilkan sebagai kecenderungan utama, termasuk saat seri; perbedaan pembulatan tidak menentukan dominasi. Bila seluruh rata-rata nol, komposisi ditampilkan seimbang (33,34%/33,33%/33,33%) dengan keterangan bahwa tidak ada dominasi tunggal. Hasil memuat penjelasan klaster. Dua pernyataan dengan persetujuan tertinggi pada masing-masing klaster hanya ditampilkan untuk pengelola.

Dokumen tidak memberikan aturan pembalikan skor. Karena itu jawaban dipakai apa adanya; jangan menganggap skor ini sebagai skala psikometrik tervalidasi atau ukuran kualitas pegawai. Khusus pernyataan 26, kecenderungan bekerja mandiri tetap mengikuti letaknya pada klaster Network dalam dokumen.

## Kemiripan empat formasi

Formasi yang dibandingkan: Statistisi, Pranata Komputer, Pengelola Keuangan, dan Pengelola Kepegawaian. Pengguna memilih hasil persentase dengan rumus yang dijelaskan. Karena tabel Word menggunakan kategori kualitatif, aplikasi menerapkan konversi awal berikut secara terbuka:

| Kategori acuan aplikasi | Nilai acuan aplikasi |
| ----------------------- | -------------------: |
| Moderat tinggi          |                  100 |
| Sangat tinggi           |                   80 |
| Tinggi                  |                   60 |
| Moderat                 |                   40 |
| Rendah (TS)             |                   20 |

| Aspek                   | Nomor soal | Statistisi | Pranata Komputer | Keuangan | Kepegawaian |
| ----------------------- | ---------- | ---------: | ---------------: | -------: | ----------: |
| Rencana & ketelitian    | 1, 5       |         80 |               60 |      100 |          40 |
| Patuh aturan & keadilan | 6, 24      |         60 |               40 |      100 |          60 |
| Pemecahan masalah       | 3, 9       |         60 |               80 |       40 |          60 |
| Logika & fakta          | 11, 15     |         80 |               80 |       80 |          40 |
| Ide baru                | 12, 16     |         40 |               80 |       20 |          60 |
| Kolaborasi & empati     | 23, 25     |         40 |               20 |       40 |          80 |
| Mediasi & komunikasi    | 27, 30     |         40 |               20 |       40 |          80 |

Urutan 20/40/60/80/100 dengan Moderat tinggi sebagai kategori tertinggi dikonfirmasi pengguna pada 11 November 2026. Dua label MUTLAK TINGGI pada kolom Pengelola Keuangan di dokumen dipisahkan dari SANGAT TINGGI dan memakai kategori tertinggi tersebut. Klasifikasi nilai aktual memakai batas tanpa tumpang tindih: 0–20 Rendah, >20–40 Moderat, >40–60 Tinggi, >60–80 Sangat tinggi, dan >80–100 Moderat tinggi. Ini merupakan aturan aplikasi sesuai revisi pengguna, bukan konversi angka yang sudah ditentukan dokumen Word.

Nilai tiap aspek adalah rata-rata dua jawaban pada pasangan soal tersebut. Ketujuh aspek berbobot sama:

`Kemiripan formasi = 100 − rata-rata(|nilai aspek − nilai acuan formasi|)`

Rumus memakai 14 pernyataan yang dirujuk tabel empat formasi; seluruh 30 pernyataan tetap digunakan untuk skor D/N/A. Tabel tambahan Statistisi vs Pranata Komputer menjadi penjelasan, tanpa dihitung ulang sebagai bobot tambahan. Konversi dan rumus ini merupakan aturan aplikasi versi awal, bukan rumus numerik yang sudah tersedia dalam Word.

Hasil diurutkan berdasarkan kemiripan. Nilai sama mendapat urutan yang sama. Rincian memuat jawaban, acuan, selisih tiap aspek, aspek yang dekat dengan acuan (selisih paling banyak 25), serta aspek dengan selisih lebih besar. Angka ini menunjukkan kemiripan terhadap acuan, **bukan peluang keberhasilan atau keputusan penempatan**. Sistem tidak mengubah jabatan pegawai.

## Integrasi dan data lama

- Beranda Pegawai: kartu **Potensi saya** menampilkan kategori dominan serta kecenderungan formasi dengan persentase kemiripan tertinggi dari hasil terkirim tahun terpilih. Hasil seri ditampilkan bersama. Jika belum dikirim, kartu menunjukkan status belum diisi/draft dan akses menuju pengisian, tanpa mengarang kategori atau memakai skor instrumen lama.
- Admin: **Penilaian → Potensi → pilih pegawai**, menampilkan jawaban D/N/A, status draft/terkirim, hasil, dan formasi. Daftar pegawai mengikuti status instrumen D/N/A.
- **Periode & Bank Soal → Bank Soal Potensi** menampilkan 30 pernyataan dalam tiga kelompok. Instrumen sumber ini konsisten untuk seluruh pegawai. Bank soal manajerial/teknis sebelumnya tetap tersedia pada bagian riwayat.
- Tab Potensi pada profil pegawai menampilkan hasil/jawaban tahun terpilih. Bagian riwayat instrumen manajerial/teknis tidak lagi ditampilkan pada profil maupun Penilaian Admin; data skor sebelumnya tetap tersimpan.
- Migration `003_potential_dna.sql` menambah tabel khusus tanpa menimpa jawaban atau skor lama. Hasil final dan versi perhitungannya disimpan bersama asesmen.
- D/N/A menggambarkan profil kecenderungan. **Tidak ada pengubahan otomatis skor kuadran atau perhitungan kompetensi.** Peta yang ada tetap memakai skor manajerial/teknis sebelumnya. Menghubungkan profil ini ke sumbu potensi memerlukan keputusan metode penilaian tersendiri.

## Verifikasi dan pratinjau

Pengujian mencakup rata-rata berbobot sama, nol, nilai akhir 50, skor seri, pasangan aspek, persentase ideal, penolakan jawaban melompat/tidak lengkap, consent, hak akses, CSRF, draft, submit bersamaan, penguncian tahunan, periode tertutup/kedaluwarsa, tahun berikutnya, serta tidak berubahnya data/jabatan/skor kuadran lama. Riwayat diuji untuk pengurutan tahun, periode tertutup, draft sebagian, privasi antarpegawai, respons detail sesuai peran, dan penolakan perubahan arsip. Seluruh 61 tes unit/API lulus.

QA browser memakai database terisolasi dengan data fiktif: panduan/checkbox, slider pointer dan keyboard, scroll yang terkunci, perpindahan otomatis, draft/resume, review, submit, hasil terkunci, akses Admin, dan responsif. Riwayat hasil 2025 dan draft 2024 juga lulus pada Admin/Pegawai, termasuk membaca isian tanpa pemetaan kategori pada akun Pegawai, pemilih periode aktif tetap 2026, dan tidak ada overflow halaman pada 390/320 px.

- Panduan: [desktop](screenshots/potensi-panduan-desktop.png), [ponsel](screenshots/potensi-panduan-mobile.png).
- Pengisian: [desktop](screenshots/potensi-soal-desktop.png), [ponsel](screenshots/potensi-soal-mobile.png).
- Hasil: [desktop](screenshots/potensi-hasil-desktop.png), [ponsel](screenshots/potensi-hasil-mobile.png).

Tautan TalentDNA tidak dapat dibaca oleh alat web pada sesi ini. Interaksi dibuat berdasarkan rincian permintaan dan gambar instruksi pengguna, dengan 30 pernyataan dari Word; tidak ada aset website eksternal yang disalin.

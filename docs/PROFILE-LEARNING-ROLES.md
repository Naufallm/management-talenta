# Revisi navigasi, riwayat dan pengembangan pegawai - 16 November 2026

Navigasi pegawai memakai grup Manajemen Talenta: Asesmen Potensi, Kompetensi Saya, Peta Talenta Saya dan Capaian Kinerja Pegawai. Beranda dan psikologi tetap terpisah. Profil Saya dan panel akun kiri bawah dihapus dari sidebar. Menu avatar kanan atas berisi Lihat profil, ganti kata sandi, pergantian role yang diizinkan, dan keluar.

Admin mengatur peran awal dan daftar peran tambahan melalui Pengguna & Peran / Edit akses. Peran awal selalu disertakan. Akun Pegawai memerlukan profil pegawai. Hanya Admin dapat memberi/mencabut peran; peran/status akun sendiri tidak dapat diubah. Pergantian peran mengganti sesi dan CSRF, dicatat di audit; perubahan izin oleh Admin mencabut semua sesi akun tersebut. Akun tanpa profil pegawai membuka pengaturan akun dari menu avatar. Supervisor tetap tidak dapat mengubah data pengelolaan; ia dapat mengubah profil, foto dan pendidikan miliknya sendiri jika terhubung ke profil pegawai.

Riwayat potensi berada di atas hasil. Pilihan periode terhubung dengan filter periode global dan mengganti satu hasil utama. Tidak ada hasil riwayat tambahan di bawah. Membaca periode tidak membuat jawaban baru. Isian tersimpan pada periode ditutup hanya dapat dilihat, termasuk draft. Pegawai tidak melihat bagian metodologi dan catatan formasi. Deskripsi Drive, Network, Action diperluas. Selisih aspek = acuan - jawaban, termasuk angka negatif; kemiripan, kekuatan dan aspek pengembangan tetap memakai jarak absolut sehingga skor dan urutan tidak berubah.

Pada Kompetensi Saya, tab profil/potensi/kompetensi/CKP/riwayat dihapus. Detail Admin tetap memiliki tab. Tabel pelatihan terpisah dari penghargaan:

- Pelatihan: No, NIP, nama diklat, tanggal mulai, tempat, jam pelatihan (jam), tanggal update, status data, bukti/aksi. Penyelenggara dan kategori tetap disimpan.
- Penghargaan: No, NIP, nama penghargaan, tahun, instansi, tanggal update, status data, bukti/aksi. Jam penghargaan disimpan nol. Tahun sesuai periode; kolom tanggal lama disimpan pada 1 Januari sebagai representasi tahun, bukan tanggal penerimaan yang diketahui.
- Pendidikan formal: No, NIP, jenjang, program studi, tanggal ijazah, tanggal update dan status data. Tambah/edit/hapus melalui Edit profil & foto; pemilik dan Admin berhak mengubah, pengelola lain hanya membaca. NIP mengikuti profil. Tanggal update otomatis. Status pendidikan adalah Tersimpan (bukan verifikasi Admin).

Migration `006_profile_learning_roles.sql` menambah role sesi, role tambahan, metadata kegiatan dan tabel formal_education. Metadata update kegiatan lama dibiarkan kosong karena tanggal sebenarnya tidak diketahui. Tidak mengubah data identitas, password, jawaban, skor, ataupun status arsip Pak Adam. Tidak menjalankan seed atau penggantian roster.

Validasi lokal: 67 tes unit/API lulus; lint dan build lulus. Browser dengan database sementara memeriksa arsip/pemulihan, edit profil/foto, pemberian role, pergantian role, pendidikan, tabel/form pelatihan dan penghargaan, pergantian periode tanpa hasil ganda, penyembunyian metodologi pegawai, serta selisih minus pada desktop/ponsel. Tidak mengubah data pegawai nyata untuk QA.

Paket pembaruan ditujukan ke `/home/bps/talenta-learning-update-20261116/app`. Aktivasi memerlukan sudo dan mencadangkan schema/kode. Lokasi aplikasi tetap `/var/www/talenta.bpskotabatu.com`, port 5015; konfigurasi `/etc/talenta/talenta.env` dipertahankan. Status aktivasi dicatat setelah verifikasi produksi.

Koneksi ke server 192.168.100.10:22 pada saat persiapan 16 November mengalami timeout. Paket lokal telah disiapkan; unggah, pemeriksaan Linux dan aktivasi produksi belum dilakukan untuk revisi ini. Perlu jaringan kantor/VPN kembali tersedia.

Revisi lanjutan: menu Lihat profil membuka halaman profil tanpa memunculkan editor otomatis. Edit profil & foto dilakukan melalui tombol pada halaman tersebut. Pemisah dropdown periode memakai Unicode escape agar tidak berubah menjadi tanda tanya. Deployment tetap ditunda sampai akses jaringan kantor tersedia.

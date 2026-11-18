# Arsip dan profil pegawai

Admin dapat menambah/mengedit pegawai, membuat akun bila belum ada, mengarsipkan, dan memulihkan pegawai dari **Pegawai → Daftar pegawai → Arsip pegawai**. Arsip menyimpan baris pegawai, foto, penugasan tim, dokumen, dan seluruh riwayat penilaian. Pegawai yang diarsipkan tidak muncul di daftar utama maupun pilihan pegawai aktif; sesi login dicabut dan login berikutnya ditolak. Pemulihan tidak menghapus riwayat atau mengganti password.

Badge Aktif/Nonaktif di kartu dan identitas dihapus. **Ketua Tim** muncul jika pegawai terdaftar sebagai ketua pada tahun yang dipilih; peran anggota pada tim lain tetap dimungkinkan. Status aktif tetap disimpan di database untuk kontrol akses dan arsip.

Pegawai dapat membuka **Profil Saya → Edit profil & foto** untuk mengubah nama, email kontak, telepon, dan foto sendiri. Perubahan kontak tidak mengubah ID login. NIP, jabatan, golongan, unit kerja, dan akses akun dikelola Admin. Admin juga dapat mengedit profil/foto dari detail pegawai. API menolak penyisipan field kepegawaian ke endpoint profil dan menolak akses ubah/foto pegawai lain.

Foto JPEG/PNG maksimal 2 MB dan 16 megapiksel diproses ulang menjadi JPEG maksimal 512×512 dengan sharp, lalu disimpan privat di tabel `employee_photos`. Foto hanya tersedia untuk pemilik atau pengelola yang berhak; endpoint memerlukan sesi, tanpa cache publik. Audit mencatat aksi perubahan, bukan isi foto atau kontak. Migration `005_employee_photos.sql` hanya menambah tabel, tanpa mengubah jawaban atau password.

Referensi implementasi foto: [sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), [resize](https://sharp.pixelplumbing.com/api-resize/).

Pengujian: 65 tes unit/API lulus, termasuk larangan edit lintas pegawai, nama/login tetap konsisten, validasi foto palsu/terlalu besar, penyesuaian foto, pemulihan arsip, dan pelestarian riwayat. QA browser pada database sementara lulus untuk arsip/pemulihan, badge ketua, unggah foto, perubahan profil, dan desktop/ponsel. TypeScript serta tes profil/foto juga lulus pada staging Linux.

Pada produksi, Adam Mahmud sudah diarsipkan atas konfirmasi pengguna: 24 pegawai di daftar utama dan 1 di arsip, riwayat dipertahankan. Cadangan sebelum pengarsipan: `/home/bps/talenta-deploy-20261112/app/deploy/state/backups/before-archive-1794457119680.dump`. File TXT daftar akun lokal diberi keterangan bahwa akun beliau tidak dapat login.

Paket kode tersedia di `/home/bps/talenta-profile-update-20261112/app`. Pengguna sudah menjalankan pembaruan melalui sudo; kode dan migration kelima telah aktif dan diverifikasi di produksi. Perintah berikut disimpan sebagai catatan pembaruan yang telah dijalankan, bukan untuk diulang:

```sh
sudo bash /home/bps/talenta-profile-update-20261112/app/deploy/update-profile-server.sh
```

Skrip mencadangkan schema dan kode pada `/var/backups/talenta/profile-20261112T042657Z`, menjaga `/etc/talenta/talenta.env`, menerapkan migrasi, lalu me-restart layanan. Lokasi akhir tetap `/var/www/talenta.bpskotabatu.com`. Systemd aktif dengan NRestarts=0. Health, login, cookie aman, logout, pembatasan API, dan aset lulus melalui localhost serta HTTPS publik. Browser produksi memverifikasi daftar 24 pegawai, 1 arsip, tombol pemulihan, login Pak Adam ditolak, serta form profil/foto pada desktop/ponsel. Data profil dan foto pegawai nyata tidak diubah untuk pengujian. Jangan menjalankan ulang skrip penggantian roster untuk update fitur.

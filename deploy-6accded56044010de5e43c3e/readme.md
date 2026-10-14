# LSFD Public Information Office

Postingan dan pengaturan situs disimpan di Netlify Database. Foto unggahan disimpan di Netlify Blobs. Semua pengunjung membaca data server yang sama; perubahan tidak lagi hanya tersimpan di browser admin.

## Login admin

Setelah deploy selesai, klik **Admin Login** di website dan masukkan username serta password yang telah ditentukan oleh pemilik situs. Login ini tidak memerlukan email, undangan akun, atau pengaturan role melalui dashboard Netlify.

Pemeriksaan login dilakukan di server, bukan sekadar membuka dashboard di browser. Sesi disimpan di Netlify Database selama maksimal 12 jam, dengan cookie HttpOnly dan Secure pada HTTPS. Memuat ulang halaman mempertahankan login selama sesi masih berlaku; **Logout** mencabut sesi di server. Percobaan login dibatasi per alamat IP selama 15 menit.

Password tidak disimpan sebagai teks biasa atau disertakan dalam kode browser. Penyimpanan konten dan unggahan foto tetap memerlukan sesi admin yang valid di server. Password sederhana yang dipilih pemilik situs mudah ditebak dan tidak cocok untuk melindungi data sensitif. Akun Netlify Identity lama dengan role admin tetap dikenali oleh API.

## Mengelola website tanpa coding

- **Tambah Postingan Baru / Publish** menyimpan postingan untuk semua pengunjung.
- **Edit / Simpan** memperbarui postingan di server.
- **Hapus** menghapus postingan dari website untuk semua pengunjung.
- Perubahan **Menu & Kategori**, divisi, header, dispatch, disclaimer, dan footer otomatis disimpan sekitar satu detik setelah berhenti mengetik.
- Status penyimpanan dan kesalahan ditampilkan. Jika gagal, isi formulir tetap tersedia dan situs tidak mengaku sudah menyimpan.
- Jika dua perangkat menyimpan data bersamaan, perangkat dengan versi lama diminta memuat data server terbaru agar tidak menimpa perubahan perangkat lain.
- Pengunjung dengan halaman aktif menerima pembaruan sekitar setiap lima detik tanpa perlu reload. Tab yang kembali aktif langsung mengecek data terbaru. Sinkronisasi ditunda selama admin mengedit artikel atau memiliki perubahan pengaturan yang belum disimpan.

## Memindahkan data dari versi lama

Buka dashboard menggunakan browser dan domain yang sama dengan saat mengedit versi lama. Jika data lama masih ada, tombol **Pindahkan postingan & pengaturan lama dari browser ini** muncul. Tinjau data sebelum mengonfirmasi karena tindakan ini mengganti data website yang sekarang. Foto lama ikut diunggah ke server; data browser lama baru dihapus setelah penyimpanan berhasil.

Data yang hanya ada di browser/perangkat lain tidak dapat dipulihkan otomatis oleh server. Buka perangkat asal jika tombol pemindahan tidak muncul.

## Penyimpanan dan deployment

Netlify Identity tetap diaktifkan untuk kompatibilitas akun lama, tetapi login username tidak bergantung pada layanan email Identity. Netlify Database menggunakan `@netlify/database` dan Drizzle ORM, termasuk untuk sesi admin dan pembatasan percobaan login. Skema ada di `db/schema.ts`; migrasi awal ada di `netlify/database/migrations/` dan menyertakan konten awal website. Migrasi berikutnya menambahkan tabel login tanpa mengubah konten yang sudah disimpan. Migrasi diterapkan saat deploy. Postingan yang telah dihapus tidak dimunculkan kembali oleh pembacaan data atau deploy berikutnya.

Foto JPG, PNG, dan WebP dapat disimpan hingga 3,5 MB setelah pemrosesan. Database menerima maksimal 500 postingan dan payload penyimpanan hingga 4 MB. Foto yang sudah disimpan menggunakan alamat tetap dan tidak dikirim berulang kali bersama seluruh data postingan.

Untuk memeriksa TypeScript, jalankan `npm run typecheck`. Setelah mengubah skema, jalankan `npm run db:generate -- --name nama_perubahan` dan sertakan migrasi yang dihasilkan.

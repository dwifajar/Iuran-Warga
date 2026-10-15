# Aplikasi Petugas Iuran — Deployment terpisah

Folder ini dirancang untuk di-deploy sebagai project Vercel terpisah dengan **Root Directory = `iuran-app`** dari repo yang sama, atau sebagai project baru berisi isi folder ini. Domain contoh: `iuran.dawungrt04.vercel.app` (alamat belum dibuat).

## Urutan sebelum digunakan
1. Di Supabase RT, jalankan `supabase/05-iuran-petugas-role.sql` dan pastikan sukses.
2. Setelah selesai/commit, jalankan `supabase/06-iuran-wilayah.sql` dan pastikan query verifikasi mengembalikan empat tabel.
3. Deploy aplikasi ini sebagai Vercel project terpisah. Jangan mengubah project utama menjadi root `iuran-app`.
4. Buat akun petugas melalui Supabase Authentication, lalu pastikan profil ada di `public.profiles` dan ubah role menjadi `petugas_iuran` melalui menu Pengguna & Admin (akun perlu tersedia di dropdown setelah role ditambahkan).
5. Di admin Website RT, buka **Wilayah Iuran**, buat wilayah, tetapkan warga, lalu tetapkan akun petugas.
6. Uji dengan akun petugas percobaan: pastikan hanya warga wilayahnya yang muncul dan transaksi berhasil terlihat di tabel `iuran_transaksi`.

## Catatan
- `config.js` hanya berisi URL Supabase dan publishable/anon key. Jangan pernah menaruh service-role key di frontend.
- Aplikasi ini memerlukan internet saat menyimpan transaksi. Tidak ada transaksi yang dianggap tersimpan jika pesan sukses tidak muncul.
- Untuk menjaga keamanan, jalankan kedua migration SQL sebelum mengaktifkan aplikasi.

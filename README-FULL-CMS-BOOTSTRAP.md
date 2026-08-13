# CocoFiber — FULL FRONTEND CMS BOOTSTRAP

Versi ini memperbaiki masalah Dashboard kosong.

## Apa yang dilakukan
Saat admin sudah login, dashboard membaca `bootstrap-data.js`, yang berisi data yang diekstrak dari:
- index.html
- produk.html
- semua-artikel.html
- tentang.html
- kontak.html
- artikel.html
- seluruh artikel HTML statis yang ada di project

Dashboard kemudian memasukkan **hanya data yang belum ada** ke Supabase:
- 375 konten frontend (teks/label/attribute)
- 3 produk lengkap
- 9 artikel lengkap

Data yang sudah ada di Supabase TIDAK ditimpa. Jadi edit admin tetap aman.

## Penting
Database harus sudah mempunyai tabel:
`produk`, `artikel`, `site_content`

Jika tabel sudah ada, JANGAN jalankan `supabase-schema.sql` lagi.
Gunakan `supabase-update-existing.sql` bila kolom/RLS belum lengkap.

## Setelah deploy
1. Buka `admin-login.html`.
2. Login.
3. Buka Dashboard.
4. Tunggu proses sinkronisasi selesai.
5. Menu Produk, Artikel, dan Konten Situs akan langsung terisi.
6. Setelah itu semua perubahan dilakukan lewat UI dashboard tanpa JSON.

## Perbaikan frontend
`cms-frontend.js` sekarang tidak lagi menyembunyikan teks statis ketika CMS Supabase kosong/error. Jadi frontend tetap menampilkan konten asli HTML sampai CMS tersedia.

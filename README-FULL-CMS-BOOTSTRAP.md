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

## FAQ Artikel (baru)
Setiap artikel sekarang punya bagian **FAQ dropdown** di halaman detail (`artikel.html`), dirender otomatis dari kolom `faq` (jsonb) di tabel `artikel`. FAQ ini sepenuhnya bisa dikelola dari Dashboard Admin, tanpa perlu menyentuh HTML:

1. Jika tabel `artikel` sudah pernah dibuat sebelumnya (sebelum fitur ini), jalankan `supabase-add-faq-column.sql` sekali di Supabase SQL Editor untuk menambahkan kolom `faq`.
2. Buka Dashboard → Kelola Artikel → Ubah/Tulis Artikel. Di bawah editor "Isi Artikel (English)" ada bagian **FAQ (Pertanyaan yang Sering Diajukan)** dengan tombol "+ Tambah FAQ" untuk menambah pasangan tanya-jawab (Indonesia & English), dan tombol "Hapus" di tiap baris untuk menghapusnya.
3. 9 artikel bawaan sudah memiliki 3 FAQ masing-masing (diekstrak dari konten lama). Saat dashboard pertama kali dibuka setelah kolom `faq` dibuat, FAQ ini otomatis diisikan ke artikel yang sudah ada di Supabase tapi kolom `faq`-nya masih kosong — artikel yang FAQ-nya sudah diedit manual tidak akan ditimpa.
4. Bagian "Tertarik dengan produk ini?" + tombol WhatsApp di akhir tiap artikel juga sekarang dirender otomatis oleh template (tidak lagi ikut disimpan di isi artikel), jadi selalu konsisten di semua artikel tanpa perlu diedit satu per satu.

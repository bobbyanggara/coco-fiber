# CocoFiber — Admin CMS Up-to-Date

## Yang sudah diubah
- Dashboard Admin memiliki menu **Konten Situs**.
- Seluruh teks konten statis yang terhubung dari frontend (Beranda, Produk, Artikel, Tentang, Kontak, dan Detail Artikel) diimpor ke tabel `site_content`.
- Admin bisa **Ubah / Hapus / Tayang / Draft** konten langsung dari UI, tanpa JSON.
- Produk tetap CRUD dari Supabase.
- Field array Produk (Fitur, Quick Specs, Lead Time, Spesifikasi) sekarang memakai form baris + tombol Tambah/Hapus, bukan input JSON.
- Artikel memakai editor visual sederhana (bold, italic, heading, list), bukan mengetik HTML.
- Frontend membaca `site_content` secara langsung. Jika konten dihapus/dijadikan draft, elemen terkait tidak ditampilkan.
- Produk dan artikel published tetap dirender langsung dari Supabase.

## Setup Supabase
Jalankan SQL berikut di Supabase SQL Editor:

1. `supabase-schema.sql`
2. `supabase-dynamic-content.sql`
3. `supabase-cms.sql`

Jika schema dan data produk/artikel sudah pernah dijalankan, cukup jalankan `supabase-cms.sql` untuk fitur CMS.

## Setelah setup
1. Login ke Admin Dashboard.
2. Buka **Konten Situs** untuk melihat seluruh konten frontend yang sudah diimpor.
3. Buka **Produk** untuk CRUD produk tanpa JSON.
4. Buka **Artikel** untuk CRUD artikel dengan editor visual.
5. Setelah menyimpan sebagai **Tayang**, refresh frontend untuk melihat perubahan.

# UPDATE DATABASE YANG SUDAH ADA

Jika Supabase sudah pernah dibuat dan muncul:
`ERROR: 42P07: relation "produk" already exists`

JANGAN jalankan `supabase-schema.sql` lagi.

Jalankan:
`supabase-update-existing.sql`

File ini aman untuk database yang tabel `produk` dan `artikel`-nya sudah ada:
- tidak DROP tabel
- tidak menghapus data
- menambahkan kolom yang belum ada
- memperbaiki RLS policy
- memperbaiki trigger updated_at
- menambahkan index yang diperlukan

Setelah SQL berhasil, login kembali ke Dashboard Admin dan coba tambah/ubah produk.

-- ==========================================================================
-- CocoFiber. — Storage bucket untuk upload gambar produk & artikel
-- ==========================================================================
-- Jalankan file ini SEKALI di Supabase SQL Editor (Project kamu > SQL Editor
-- > New query > paste semua isi file ini > Run).
--
-- Ini akan membuat bucket publik bernama "konten" yang dipakai dashboard
-- untuk upload gambar lewat tombol "Pilih Gambar" (tidak perlu isi link
-- manual lagi). File yang sudah diupload otomatis bisa diakses publik
-- lewat URL, sama seperti link gambar biasa.
-- ==========================================================================

-- 1) Bikin bucket publik "konten" (kalau belum ada)
insert into storage.buckets (id, name, public)
values ('konten', 'konten', true)
on conflict (id) do update set public = true;

-- 2) Izinkan siapa saja MELIHAT/READ file di bucket ini (perlu, biar gambar
--    bisa tampil di halaman situs untuk pengunjung publik)
drop policy if exists "Publik bisa lihat gambar konten" on storage.objects;
create policy "Publik bisa lihat gambar konten"
on storage.objects for select
to public
using (bucket_id = 'konten');

-- 3) Izinkan HANYA user yang sudah login (admin) untuk upload gambar baru
drop policy if exists "Admin bisa upload gambar konten" on storage.objects;
create policy "Admin bisa upload gambar konten"
on storage.objects for insert
to authenticated
with check (bucket_id = 'konten');

-- 4) Izinkan admin login untuk mengganti/menimpa file yang sudah ada
drop policy if exists "Admin bisa update gambar konten" on storage.objects;
create policy "Admin bisa update gambar konten"
on storage.objects for update
to authenticated
using (bucket_id = 'konten');

-- 5) Izinkan admin login untuk menghapus gambar
drop policy if exists "Admin bisa hapus gambar konten" on storage.objects;
create policy "Admin bisa hapus gambar konten"
on storage.objects for delete
to authenticated
using (bucket_id = 'konten');

-- Selesai. Setelah ini jalan, refresh dashboard dan coba klik "Pilih Gambar"
-- di form Tambah Produk / Tulis Artikel.

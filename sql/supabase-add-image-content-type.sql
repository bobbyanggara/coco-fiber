-- Menambahkan dukungan content_type 'image' pada tabel site_content,
-- supaya gambar-gambar statis di frontend (foto fasilitas, foto testimoni, dst)
-- bisa diubah lewat Dashboard Admin > Konten Situs, bukan cuma teks.
--
-- WAJIB dijalankan sekali di Supabase SQL Editor sebelum memakai
-- jenis konten "Gambar" di dashboard. Aman dijalankan berkali-kali.

alter table site_content drop constraint if exists site_content_content_type_check;
alter table site_content add constraint site_content_content_type_check
  check (content_type in ('text','html','attribute','image'));

-- Menambahkan kolom penanda "tampil di Beranda" untuk artikel.
-- Sebelumnya Beranda otomatis menampilkan 3 artikel terbaru yang tayang,
-- tanpa bisa dipilih manual. Dengan kolom ini, admin bisa memilih sendiri
-- artikel mana saja yang muncul di Beranda lewat dashboard.
--
-- Default TRUE supaya artikel yang sudah ada tetap tampil seperti biasa
-- setelah migrasi ini dijalankan (tidak tiba-tiba hilang dari Beranda).
--
-- Jalankan file ini di Supabase SQL Editor (aman dijalankan berkali-kali).

alter table artikel add column if not exists tampil_beranda boolean not null default true;

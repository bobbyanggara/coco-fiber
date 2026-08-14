-- Menambahkan kolom gambar kedua untuk artikel.
-- Sebelumnya artikel hanya punya 1 kolom gambar (gambar_url) yang tampil
-- sebagai gambar utama/hero di halaman detail artikel. Sekarang ditambah
-- gambar_url_2 supaya admin bisa mengganti gambar kedua yang tampil di
-- tengah isi artikel juga.
--
-- Jalankan file ini di Supabase SQL Editor (aman dijalankan berkali-kali).

alter table artikel add column if not exists gambar_url_2 text;

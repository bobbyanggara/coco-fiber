-- =========================================================================
-- CocoFiber — Tambah kolom FAQ ke tabel artikel
-- Jalankan SEKALI di: Supabase Dashboard > SQL Editor
-- Aman dijalankan meski kolom sudah ada (IF NOT EXISTS).
-- =========================================================================

alter table artikel
  add column if not exists faq jsonb default '[]'::jsonb;

-- Kolom `faq` menyimpan array objek dengan bentuk:
-- [
--   { "pertanyaan": "...", "pertanyaan_en": "...", "jawaban": "...", "jawaban_en": "..." },
--   ...
-- ]
--
-- Setelah kolom ini ada, FAQ setiap artikel bisa ditambah/diubah/dihapus
-- langsung lewat Dashboard Admin (menu Kelola Artikel), tanpa menyentuh HTML.

-- Selesai.

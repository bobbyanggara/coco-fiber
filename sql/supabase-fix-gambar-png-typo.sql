-- Artikel "Cocopeat untuk Media Tanam" sempat memakai referensi gambar
-- dengan ekstensi .png padahal file yang benar-benar ada di folder images/
-- adalah .webp. Ini menyebabkan gambar gagal dimuat (404) di halaman
-- artikel maupun di rich-text editor dashboard.
--
-- Jalankan file ini SEKALI di Supabase SQL Editor untuk memperbaiki data
-- yang sudah kadung tersimpan (aman dijalankan berkali-kali).

update artikel
set
  konten = replace(
    konten,
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.png',
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.webp'
  ),
  konten_en = replace(
    konten_en,
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.png',
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.webp'
  ),
  gambar_url = replace(
    gambar_url,
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.png',
    'cocofiber-untuk-erosion-control-solusi-ramah-lingkungan-untuk-stabilisasi-lereng-1775556198173.webp'
  )
where
  konten ilike '%1775556198173.png%'
  or konten_en ilike '%1775556198173.png%'
  or gambar_url ilike '%1775556198173.png%';

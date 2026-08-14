# CocoFiber. — Struktur Project

Situs export B2B CocoFiber (CV Kreasi Asa Indonesia) + Dashboard Admin, deploy di Vercel.

## Struktur folder

```
├── index.html, tentang.html, produk.html, kontak.html,
│   semua-artikel.html, artikel.html, artikel-*.html   → Halaman publik situs
├── styling.css, app.js                                 → Style & logic situs publik
├── cms-frontend.js                                      → Terapkan konten CMS (teks/gambar) ke halaman publik
├── produk-dinamis.js, frontend-content.js               → Render produk/artikel dari Supabase ke halaman publik
├── supabase-config.js                                   → Koneksi Supabase (dipakai situs & dashboard)
│
├── admin-login.html, admin-login.css, admin-login.js    → Halaman login admin
├── admin-theme.css                                      → Desain shared login + dashboard
├── dashboard.html, dashboard.css, dashboard.js          → Dashboard Admin (kelola produk/artikel/konten/pesan)
├── bootstrap-data.js                                     → Data awal (sekali jalan) untuk mengisi Supabase dari konten statis
│
├── api/chat.js                                           → Serverless function: proxy AI chatbot widget
├── images/                                               → Aset gambar statis
│
├── sql/                                                   → Semua migration SQL Supabase (jalankan di SQL Editor)
├── docs/                                                  → Catatan teknis / README lama tiap fase pengembangan
│
└── vercel.json                                            → Konfigurasi routing & header Vercel
```

## Kenapa halaman publik & dashboard tetap satu folder (tidak dipisah `public/` `admin/`)

Situs ini deploy di Vercel dengan `cleanUrls: true`, dan semua path relatif (CSS/JS/gambar) mengasumsikan semua file ada di root. Memindahkan ke subfolder butuh menulis ulang path di puluhan file HTML dan berisiko merusak deployment yang sudah jalan — jadi folder yang **aman dipisah tanpa mengubah URL** (SQL migration, dokumentasi) yang dirapikan ke subfolder. Kalau nanti mau restrukturisasi penuh ke `public/`/`admin/`, itu perlu sesi terpisah supaya semua path & `vercel.json` disesuaikan dengan hati-hati.

## Setup Supabase (urutan menjalankan SQL di `sql/`)

1. `supabase-schema.sql` — tabel dasar (produk, artikel)
2. `supabase-cms.sql` — tabel `site_content` untuk CMS teks
3. `supabase-storage-gambar.sql` — bucket storage untuk upload gambar
4. `supabase-pesan.sql` — tabel pesan masuk (form kontak)
5. `supabase-add-faq-column.sql` — kolom FAQ di tabel artikel
6. `supabase-add-image-content-type.sql` — **wajib dijalankan** supaya jenis konten "Gambar" di CMS dashboard bisa dipakai (lihat bagian di bawah)

## Update terbaru: Gambar CMS + Dialog Modern

- **Jenis konten "Gambar" di dashboard (Konten Situs):** foto fasilitas produksi & foto testimoni di Beranda/Tentang sekarang bisa diubah langsung dari dashboard (upload atau isi URL), tidak lagi hardcoded di HTML.
- **Semua `alert()`/`confirm()`/`prompt()` bawaan browser sudah diganti** modal & toast custom yang senada desain dashboard.

⚠️ **Sebelum memakai jenis konten "Gambar"**, jalankan `sql/supabase-add-image-content-type.sql` di Supabase SQL Editor — tabel `site_content` punya constraint yang perlu diperbarui agar menerima `content_type = 'image'`.

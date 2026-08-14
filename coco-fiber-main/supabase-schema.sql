-- =========================================================================
-- CocoFiber. — Supabase Schema
-- Jalankan SEMUA script ini sekali di: Supabase Dashboard > SQL Editor
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TABEL PRODUK
-- -------------------------------------------------------------------------
create table produk (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- untuk URL/id anchor, mis. 'coco-fiber'
  nama text not null,
  nama_en text,
  kategori text,
  deskripsi text,
  deskripsi_en text,
  harga text,                             -- teks bebas, mis. '$260–300 USD / MT'
  supply_ability text,                    -- mis. '300 Ton / Bulan'
  packaging text,                         -- mis. '18 Ton / Kontainer 40ft (HC)'
  payment_terms text,                     -- mis. 'L/C, T/T'
  fitur jsonb default '[]'::jsonb,        -- array of {id, en}
  quickspecs jsonb default '[]'::jsonb,   -- array of {label, value, sub}
  lead_time jsonb default '[]'::jsonb,    -- array of {qty, waktu}
  spesifikasi jsonb default '[]'::jsonb,  -- array of {label_id, label_en, value}
  gambar_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  urutan int default 0,                   -- untuk urutan tampil
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 2. TABEL ARTIKEL
-- -------------------------------------------------------------------------
create table artikel (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- dipakai di URL, mis. 'coco-fiber-industri'
  judul text not null,
  judul_en text,
  ringkasan text,                         -- untuk meta description & card
  ringkasan_en text,
  konten text,                            -- isi artikel, HTML atau markdown
  konten_en text,
  faq jsonb default '[]'::jsonb,          -- array of {pertanyaan, pertanyaan_en, jawaban, jawaban_en}
  kategori text,
  gambar_url text,
  penulis text,
  status text not null default 'draft' check (status in ('draft','published')),
  tanggal date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 3. AUTO-UPDATE kolom updated_at
-- -------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger produk_set_updated_at
before update on produk
for each row execute function set_updated_at();

create trigger artikel_set_updated_at
before update on artikel
for each row execute function set_updated_at();

-- -------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
--    Publik (pengunjung website) HANYA boleh baca produk/artikel published.
--    Hanya user yang LOGIN (admin) yang boleh insert/update/delete,
--    dan admin yang login boleh baca semua termasuk draft.
-- -------------------------------------------------------------------------
alter table produk enable row level security;
alter table artikel enable row level security;

-- Publik boleh SELECT produk yang published
create policy "Publik bisa lihat produk published"
on produk for select
to anon
using (status = 'published');

-- Admin (user yang sudah login) boleh SELECT semua produk (termasuk draft)
create policy "Admin bisa lihat semua produk"
on produk for select
to authenticated
using (true);

-- Admin boleh insert/update/delete produk
create policy "Admin bisa insert produk"
on produk for insert
to authenticated
with check (true);

create policy "Admin bisa update produk"
on produk for update
to authenticated
using (true)
with check (true);

create policy "Admin bisa delete produk"
on produk for delete
to authenticated
using (true);

-- Sama persis untuk artikel
create policy "Publik bisa lihat artikel published"
on artikel for select
to anon
using (status = 'published');

create policy "Admin bisa lihat semua artikel"
on artikel for select
to authenticated
using (true);

create policy "Admin bisa insert artikel"
on artikel for insert
to authenticated
with check (true);

create policy "Admin bisa update artikel"
on artikel for update
to authenticated
using (true)
with check (true);

create policy "Admin bisa delete artikel"
on artikel for delete
to authenticated
using (true);

-- -------------------------------------------------------------------------
-- 5. (OPSIONAL) Data awal dari produk yang sudah ada di produk.html
--    Silakan sesuaikan/lengkapi sendiri lewat dashboard admin nanti.
-- -------------------------------------------------------------------------
insert into produk (slug, nama, nama_en, kategori, harga, supply_ability, packaging, payment_terms, status, urutan, gambar_url)
values
  ('coco-fiber', 'Coco Fiber', 'Coco Fiber', 'Serat Sabut Kelapa', '$260–300 USD / MT', '300 Ton / Bulan', '18 Ton / Kontainer 40ft (HC)', 'L/C, T/T', 'published', 1, 'images/gallery-coco-fiber.webp'),
  ('cocopeat', 'Cocopeat', 'Cocopeat', 'Media Tanam', '$95–140 USD / MT', '250 Ton / Bulan', null, 'L/C, T/T', 'published', 2, 'images/gallery-cocopeat.webp'),
  ('cocomesh', 'Cocomesh', 'Cocomesh', 'Produk Turunan', 'Nego', 'Made to order', null, 'L/C, T/T', 'published', 3, 'images/cocomesh.webp');

-- Selesai. Cek tabel di Supabase > Table Editor untuk verifikasi.

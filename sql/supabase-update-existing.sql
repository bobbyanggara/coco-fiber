-- Coco Fiber: SAFE UPDATE untuk database yang SUDAH memiliki tabel produk/artikel
-- Jalankan file ini saja. TIDAK menghapus tabel atau data yang sudah ada.

-- Pastikan extension UUID tersedia
create extension if not exists pgcrypto;

-- Tambahkan tabel hanya jika belum ada
create table if not exists produk (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nama text not null,
  nama_en text,
  kategori text,
  deskripsi text,
  deskripsi_en text,
  harga text,
  supply_ability text,
  packaging text,
  payment_terms text,
  fitur jsonb default '[]'::jsonb,
  quickspecs jsonb default '[]'::jsonb,
  lead_time jsonb default '[]'::jsonb,
  spesifikasi jsonb default '[]'::jsonb,
  gambar_url text,
  status text not null default 'draft',
  urutan int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists artikel (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  judul text not null,
  judul_en text,
  ringkasan text,
  ringkasan_en text,
  konten text,
  konten_en text,
  kategori text,
  gambar_url text,
  penulis text,
  status text not null default 'draft',
  tanggal date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pastikan kolom CMS yang diperlukan tersedia pada tabel lama.
alter table produk add column if not exists nama_en text;
alter table produk add column if not exists kategori text;
alter table produk add column if not exists deskripsi text;
alter table produk add column if not exists deskripsi_en text;
alter table produk add column if not exists harga text;
alter table produk add column if not exists supply_ability text;
alter table produk add column if not exists packaging text;
alter table produk add column if not exists payment_terms text;
alter table produk add column if not exists fitur jsonb default '[]'::jsonb;
alter table produk add column if not exists quickspecs jsonb default '[]'::jsonb;
alter table produk add column if not exists lead_time jsonb default '[]'::jsonb;
alter table produk add column if not exists spesifikasi jsonb default '[]'::jsonb;
alter table produk add column if not exists gambar_url text;
alter table produk add column if not exists status text default 'draft';
alter table produk add column if not exists urutan int default 0;
alter table produk add column if not exists created_at timestamptz default now();
alter table produk add column if not exists updated_at timestamptz default now();

alter table artikel add column if not exists judul_en text;
alter table artikel add column if not exists ringkasan text;
alter table artikel add column if not exists ringkasan_en text;
alter table artikel add column if not exists konten text;
alter table artikel add column if not exists konten_en text;
alter table artikel add column if not exists kategori text;
alter table artikel add column if not exists gambar_url text;
alter table artikel add column if not exists penulis text;
alter table artikel add column if not exists status text default 'draft';
alter table artikel add column if not exists tanggal date default current_date;
alter table artikel add column if not exists created_at timestamptz default now();
alter table artikel add column if not exists updated_at timestamptz default now();

-- Trigger function
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger dibuat idempoten
drop trigger if exists produk_set_updated_at on produk;
create trigger produk_set_updated_at
before update on produk
for each row execute function set_updated_at();

drop trigger if exists artikel_set_updated_at on artikel;
create trigger artikel_set_updated_at
before update on artikel
for each row execute function set_updated_at();

-- RLS
alter table produk enable row level security;
alter table artikel enable row level security;

-- Hapus policy lama dengan nama yang sama, lalu buat ulang.
drop policy if exists "Publik bisa lihat produk published" on produk;
create policy "Publik bisa lihat produk published"
on produk for select to anon
using (status = 'published');

drop policy if exists "Admin bisa lihat semua produk" on produk;
create policy "Admin bisa lihat semua produk"
on produk for select to authenticated
using (true);

drop policy if exists "Admin bisa insert produk" on produk;
create policy "Admin bisa insert produk"
on produk for insert to authenticated
with check (true);

drop policy if exists "Admin bisa update produk" on produk;
create policy "Admin bisa update produk"
on produk for update to authenticated
using (true)
with check (true);

drop policy if exists "Admin bisa delete produk" on produk;
create policy "Admin bisa delete produk"
on produk for delete to authenticated
using (true);

drop policy if exists "Publik bisa lihat artikel published" on artikel;
create policy "Publik bisa lihat artikel published"
on artikel for select to anon
using (status = 'published');

drop policy if exists "Admin bisa lihat semua artikel" on artikel;
create policy "Admin bisa lihat semua artikel"
on artikel for select to authenticated
using (true);

drop policy if exists "Admin bisa insert artikel" on artikel;
create policy "Admin bisa insert artikel"
on artikel for insert to authenticated
with check (true);

drop policy if exists "Admin bisa update artikel" on artikel;
create policy "Admin bisa update artikel"
on artikel for update to authenticated
using (true)
with check (true);

drop policy if exists "Admin bisa delete artikel" on artikel;
create policy "Admin bisa delete artikel"
on artikel for delete to authenticated
using (true);

-- Index untuk daftar dashboard/frontend
create index if not exists idx_produk_urutan on produk (urutan);
create index if not exists idx_produk_status on produk (status);
create index if not exists idx_artikel_status on artikel (status);
create index if not exists idx_artikel_tanggal on artikel (tanggal desc);

-- Selesai.

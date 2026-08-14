-- CocoFiber: Tabel PESAN KONTAK (form kontak situs -> Supabase -> Dashboard Admin)
-- Jalankan file ini SEKALI di: Supabase Dashboard > SQL Editor
-- Aman dijalankan berkali-kali (idempoten, tidak menghapus data).

create extension if not exists pgcrypto;

create table if not exists pesan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kontak text not null,        -- no. WhatsApp atau email pengirim
  subjek text,
  pesan text not null,
  status text not null default 'baru' check (status in ('baru','dibaca','arsip')),
  created_at timestamptz default now()
);

alter table pesan enable row level security;

-- Siapa saja (pengunjung situs, belum login) boleh KIRIM pesan lewat form kontak.
drop policy if exists "Publik bisa kirim pesan" on pesan;
create policy "Publik bisa kirim pesan"
on pesan for insert
to anon
with check (true);

-- Hanya admin yang login yang boleh BACA semua pesan masuk.
drop policy if exists "Admin bisa lihat semua pesan" on pesan;
create policy "Admin bisa lihat semua pesan"
on pesan for select
to authenticated
using (true);

-- Hanya admin yang boleh UPDATE status (baru/dibaca/arsip).
drop policy if exists "Admin bisa update pesan" on pesan;
create policy "Admin bisa update pesan"
on pesan for update
to authenticated
using (true)
with check (true);

-- Hanya admin yang boleh HAPUS pesan.
drop policy if exists "Admin bisa hapus pesan" on pesan;
create policy "Admin bisa hapus pesan"
on pesan for delete
to authenticated
using (true);

create index if not exists idx_pesan_status on pesan (status);
create index if not exists idx_pesan_created on pesan (created_at desc);

-- Selesai. Setelah ini jalan, cek di Table Editor: harus ada tabel "pesan" baru.

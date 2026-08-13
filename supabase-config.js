// ==========================================================================
// CocoFiber. — Konfigurasi Supabase (dipakai bersama oleh semua halaman admin)
// ==========================================================================
//
// CARA ISI:
// 1. Buka project kamu di supabase.com > Settings > API
// 2. Copy "Project URL" ke SUPABASE_URL di bawah
// 3. Copy "anon public" key ke SUPABASE_ANON_KEY di bawah
//
// CATATAN KEAMANAN:
// anon key ini AMAN untuk ditaruh di kode frontend (boleh terlihat publik).
// Keamanan sebenarnya dijaga oleh Row Level Security (RLS) di Supabase,
// bukan oleh key ini. JANGAN PERNAH taruh "service_role key" di sini atau
// di kode frontend mana pun — itu key rahasia yang bisa bypass semua RLS.
// ==========================================================================

const SUPABASE_URL = 'https://osnqiwatdugjutemfzoa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbnFpd2F0ZHVnanV0ZW1mem9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODk2NDYsImV4cCI6MjEwMjE2NTY0Nn0.wIWkrijR_vHQkSyCe_wHx_WZ-OHU5Z9D1E6NS1pEbYM';

// Inisialisasi client Supabase, dipakai oleh file lain lewat window.supabaseClient
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

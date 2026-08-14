// ==========================================================================
// CocoFiber. Admin — Dashboard logic
// Produk & Artikel: tersimpan di Supabase (tabel `produk` dan `artikel`).
// Pesan: masih pakai localStorage sementara (belum ada form kontak ke DB).
// ==========================================================================
(async function () {
  var LOGIN_URL = './admin-login.html';

  // ---------- Auth guard (Supabase session) ----------
  // Cek session Supabase yang sedang aktif. Kalau tidak ada / expired,
  // lempar balik ke halaman login.
  var sessionRes = await supabaseClient.auth.getSession();
  if (!sessionRes.data.session) {
    window.location.href = LOGIN_URL;
    return;
  }

  // Kalau session berubah jadi tidak valid lagi di tengah pemakaian
  // (mis. logout dari tab lain, token expired), redirect otomatis.
  supabaseClient.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = LOGIN_URL;
    }
  });

  // ---------- Supabase: Pesan (dikirim dari form kontak situs) ----------
  async function fetchPesan() {
    var res = await supabaseClient
      .from('pesan')
      .select('*')
      .order('created_at', { ascending: false });
    if (res.error) {
      console.error('Gagal memuat pesan:', res.error);
      showToast('Gagal memuat pesan masuk. Jalankan sql/supabase-pesan.sql.');
      return [];
    }
    // Samakan bentuk data dengan yang dipakai renderPesan() (field `tanggal`).
    return res.data.map(function (m) {
      return {
        id: m.id,
        nama: m.nama,
        kontak: m.kontak,
        subjek: m.subjek || '(Tanpa subjek)',
        pesan: m.pesan,
        status: m.status,
        tanggal: m.created_at ? new Date(m.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
      };
    });
  }

  // data.produk, data.artikel & data.pesan diisi dari Supabase.
  var data = { produk: [], artikel: [], konten: [], pesan: [] };

  // ---------- Helper: bikin slug dari nama/judul ----------
  function toSlug(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'item-' + Date.now();
  }

  // ---------- Supabase: Produk ----------
  async function fetchProduk() {
    var res = await supabaseClient
      .from('produk')
      .select('*')
      .order('urutan', { ascending: true });
    if (res.error) {
      console.error('Gagal memuat produk:', res.error);
      showToast('Gagal memuat data produk.');
      return [];
    }
    return res.data;
  }

  async function fetchArtikel() {
    var res = await supabaseClient
      .from('artikel')
      .select('*')
      .order('tanggal', { ascending: false });
    if (res.error) {
      console.error('Gagal memuat artikel:', res.error);
      showToast('Gagal memuat data artikel.');
      return [];
    }
    return res.data;
  }

  async function fetchKonten() {
    var res = await supabaseClient.from('site_content').select('*').order('page', {ascending:true}).order('sort_order',{ascending:true});
    if (res.error) { console.error('Gagal memuat konten:', res.error); showToast('Gagal memuat konten frontend. Jalankan sql/supabase-cms.sql.'); return []; }
    return res.data || [];
  }

  // ---------- Bootstrap: ambil konten awal langsung dari file frontend ----------
  // Hanya INSERT data yang belum ada. Data yang sudah diedit admin tidak ditimpa.
  async function bootstrapFromFrontend() {
    var seed = window.COCO_BOOTSTRAP;
    if (!seed) return;

    async function insertMissing(table, keyName, rows, label) {
      if (!rows || !rows.length) return;
      var existing = await supabaseClient.from(table).select(keyName);
      if (existing.error) {
        console.error('Gagal mengecek ' + label + ':', existing.error);
        showToast('Database ' + label + ' belum siap: ' + existing.error.message);
        return;
      }
      var keys = new Set((existing.data || []).map(function (r) { return r[keyName]; }));
      var missing = rows.filter(function (r) { return !keys.has(r[keyName]); });
      if (!missing.length) return;

      // Supabase nyaman menerima batch kecil; hindari payload terlalu besar.
      for (var i = 0; i < missing.length; i += 50) {
        var batch = missing.slice(i, i + 50);
        var ins = await supabaseClient.from(table).insert(batch);
        if (ins.error) {
          console.error('Gagal bootstrap ' + label + ':', ins.error);
          showToast('Gagal memasukkan data awal ' + label + ': ' + ins.error.message);
          return;
        }
      }
    }

    // site_content tidak di-upsert agar edit admin tidak pernah tertimpa.
    await insertMissing('site_content', 'key', seed.site_content, 'konten frontend');
    await insertMissing('produk', 'slug', seed.products, 'produk');
    await insertMissing('artikel', 'slug', seed.articles, 'artikel');

    // Isi kolom `faq` untuk artikel lama yang sudah ada di Supabase sebelum
    // kolom FAQ ditambahkan, tapi FAQ-nya masih kosong. Artikel yang FAQ-nya
    // sudah pernah diisi/diubah lewat dashboard TIDAK disentuh.
    await backfillArtikelFaq(seed.articles);
  }

  async function backfillArtikelFaq(seedArticles) {
    if (!seedArticles || !seedArticles.length) return;
    var existing = await supabaseClient.from('artikel').select('id,slug,faq');
    if (existing.error) return; // kolom faq mungkin belum dibuat; abaikan diam-diam
    var bySlug = {};
    (existing.data || []).forEach(function (r) { bySlug[r.slug] = r; });
    for (var i = 0; i < seedArticles.length; i++) {
      var seedArt = seedArticles[i];
      var row = bySlug[seedArt.slug];
      var isEmpty = row && (!row.faq || (Array.isArray(row.faq) && row.faq.length === 0));
      if (row && isEmpty && seedArt.faq && seedArt.faq.length) {
        await supabaseClient.from('artikel').update({ faq: seedArt.faq }).eq('id', row.id);
      }
    }
  }

  // ---------- Sidebar nav / routing ----------
  var sections = ['overview', 'produk', 'artikel', 'konten', 'pesan', 'pengaturan'];
  var navLinks = document.querySelectorAll('.nav-link[data-section]');
  var sectionEls = {};
  sections.forEach(function (s) {
    sectionEls[s] = document.getElementById('section-' + s);
  });

  function goToSection(name) {
    if (sections.indexOf(name) === -1) name = 'overview';
    sections.forEach(function (s) {
      sectionEls[s].classList.toggle('active', s === name);
    });
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.section === name);
    });
    document.getElementById('topbarTitle').textContent = titleFor(name);
    document.getElementById('topbarSub').textContent = subFor(name);
    closeSidebarMobile();
    window.location.hash = name;
  }

  function titleFor(name) {
    return {
      overview: 'Ringkasan',
      produk: 'Kelola Produk',
      artikel: 'Kelola Artikel',
      konten: 'Konten Situs',
      pesan: 'Pesan Masuk',
      pengaturan: 'Pengaturan Akun'
    }[name];
  }
  function subFor(name) {
    return {
      overview: 'Ringkasan aktivitas dan performa situs CocoFiber.',
      produk: 'Tambah, ubah, atau nonaktifkan produk yang tampil di situs.',
      artikel: 'Kelola artikel yang tayang di halaman Artikel.',
      konten: 'Edit semua teks frontend tanpa menyentuh kode atau JSON.',
      pesan: 'Pesan masuk dari formulir kontak situs.',
      pengaturan: 'Kelola profil dan preferensi akun admin.'
    }[name];
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      goToSection(link.dataset.section);
    });
  });

  // ---------- Sidebar mobile ----------
  var sidebar = document.getElementById('sidebar');
  var sidebarBackdrop = document.getElementById('sidebarBackdrop');
  document.getElementById('sidebarToggle').addEventListener('click', function () {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('show');
  });
  function closeSidebarMobile() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
  }
  sidebarBackdrop.addEventListener('click', closeSidebarMobile);

  // ---------- Toast ----------
  var toastEl = document.getElementById('toast');
  var toastText = document.getElementById('toastText');
  var toastIcon = document.getElementById('toastIcon');
  var toastTimer;
  var TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  // type: 'success' | 'error' | 'info'. Kalau tidak diisi, otomatis dideteksi
  // dari kata kunci "gagal" di pesan supaya kode lama yang cuma showToast(pesan)
  // tetap dapat warna yang tepat tanpa perlu diubah satu-satu.
  function showToast(msg, type) {
    if (!type) type = /gagal|error|tidak valid|salah|kosong|wajib diisi/i.test(msg) ? 'error' : 'success';
    toastText.textContent = msg;
    toastIcon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
    toastEl.classList.remove('toast-success', 'toast-error', 'toast-info');
    toastEl.classList.add('toast-' + type);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }

  // ---------- Confirm dialog (menggantikan confirm() bawaan browser) ----------
  var confirmBackdrop = document.getElementById('confirmBackdrop');
  var confirmTitle = document.getElementById('confirmTitle');
  var confirmMessage = document.getElementById('confirmMessage');
  var confirmOkBtn = document.getElementById('confirmOkBtn');
  var confirmCancelBtn = document.getElementById('confirmCancelBtn');
  var confirmResolver = null;

  function showConfirm(message, opts) {
    opts = opts || {};
    confirmTitle.textContent = opts.title || 'Yakin?';
    confirmMessage.textContent = message;
    confirmOkBtn.textContent = opts.okLabel || 'Hapus';
    confirmBackdrop.classList.add('show');
    setTimeout(function () { confirmOkBtn.focus(); }, 10);
    return new Promise(function (resolve) {
      confirmResolver = resolve;
    });
  }
  function closeConfirm(result) {
    confirmBackdrop.classList.remove('show');
    if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
  }
  confirmOkBtn.addEventListener('click', function () { closeConfirm(true); });
  confirmCancelBtn.addEventListener('click', function () { closeConfirm(false); });
  confirmBackdrop.addEventListener('click', function (e) { if (e.target === confirmBackdrop) closeConfirm(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && confirmBackdrop.classList.contains('show')) closeConfirm(false);
  });

  // ---------- Picker dialog (menggantikan prompt() untuk "Gunakan Template") ----------
  var pickerBackdrop = document.getElementById('pickerBackdrop');
  var pickerTitle = document.getElementById('pickerTitle');
  var pickerMessage = document.getElementById('pickerMessage');
  var pickerList = document.getElementById('pickerList');
  var pickerCancelBtn = document.getElementById('pickerCancelBtn');
  var pickerResolver = null;

  // items: [{ label, sublabel, thumb }]. Resolve dengan index yang dipilih, atau null kalau batal.
  function showPicker(items, opts) {
    opts = opts || {};
    pickerTitle.textContent = opts.title || 'Pilih Template';
    pickerMessage.textContent = opts.message || 'Pilih salah satu untuk dijadikan dasar item baru.';
    if (!items.length) {
      pickerList.innerHTML = '<div class="picker-empty">Belum ada item yang bisa dijadikan template.</div>';
    } else {
      pickerList.innerHTML = items.map(function (it, i) {
        var thumb = it.thumb ? '<img class="picker-item-thumb" src="' + escapeHtml(it.thumb) + '" alt="">' : '';
        return '<button type="button" class="picker-item" data-picker-index="' + i + '">' + thumb +
          '<span class="picker-item-label">' + escapeHtml(it.label) + (it.sublabel ? ' <span style="color:var(--ink-soft);">· ' + escapeHtml(it.sublabel) + '</span>' : '') + '</span></button>';
      }).join('');
    }
    pickerBackdrop.classList.add('show');
    return new Promise(function (resolve) {
      pickerResolver = resolve;
    });
  }
  function closePicker(result) {
    pickerBackdrop.classList.remove('show');
    if (pickerResolver) { pickerResolver(result); pickerResolver = null; }
  }
  pickerList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-picker-index]');
    if (btn) closePicker(parseInt(btn.getAttribute('data-picker-index'), 10));
  });
  pickerCancelBtn.addEventListener('click', function () { closePicker(null); });
  pickerBackdrop.addEventListener('click', function (e) { if (e.target === pickerBackdrop) closePicker(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pickerBackdrop.classList.contains('show')) closePicker(null);
  });

  // ---------- Upload gambar ke Supabase Storage (bucket "konten") ----------
  // Dipakai oleh form Produk & Artikel supaya admin tinggal pilih file dari
  // laptop, tidak perlu upload manual ke tempat lain lalu tempel link.
  var IMAGE_BUCKET = 'konten';

  function setImagePreview(prefix, url) {
    var img = document.getElementById(prefix + 'ImagePreviewImg');
    var empty = document.getElementById(prefix + 'ImageEmptyState');
    var removeBtn = document.getElementById(prefix + 'ImageRemoveBtn');
    if (!img) return;
    if (url) {
      img.src = url;
      img.hidden = false;
      if (empty) empty.hidden = true;
      if (removeBtn) removeBtn.hidden = false;
    } else {
      img.hidden = true;
      img.src = '';
      if (empty) empty.hidden = false;
      if (removeBtn) removeBtn.hidden = true;
    }
  }

  async function uploadImageFile(prefix, file) {
    var statusEl = document.getElementById(prefix + 'ImageStatus');
    var urlInput = document.getElementById(prefix + 'Gambar');
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast('File harus berupa gambar (JPG/PNG/WebP).'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran gambar maksimal 5MB.'); return; }

    if (statusEl) statusEl.textContent = 'Mengunggah...';

    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = prefix + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    var up = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (up.error) {
      console.error('Gagal upload gambar:', up.error);
      if (statusEl) statusEl.textContent = '';
      showToast('Gagal upload gambar: ' + up.error.message + '. Pastikan bucket "konten" sudah dibuat (jalankan sql/supabase-storage-gambar.sql).');
      return;
    }

    var pub = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    var publicUrl = pub && pub.data ? pub.data.publicUrl : '';
    urlInput.value = publicUrl;
    setImagePreview(prefix, publicUrl);
    if (statusEl) statusEl.textContent = 'Gambar terunggah.';
    setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 2200);
  }

  function setupImageUpload(prefix) {
    var box = document.getElementById(prefix + 'ImageBox');
    var fileInput = document.getElementById(prefix + 'ImageFile');
    var pickBtn = document.getElementById(prefix + 'ImagePickBtn');
    var removeBtn = document.getElementById(prefix + 'ImageRemoveBtn');
    var urlInput = document.getElementById(prefix + 'Gambar');
    if (!box || !fileInput) return;

    pickBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) uploadImageFile(prefix, fileInput.files[0]);
      fileInput.value = '';
    });
    removeBtn.addEventListener('click', function () {
      urlInput.value = '';
      setImagePreview(prefix, '');
    });
    // Update pratinjau kalau admin isi URL manual lewat kolom fallback.
    urlInput.addEventListener('change', function () { setImagePreview(prefix, urlInput.value.trim()); });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(function (evt) {
      box.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); box.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      box.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); box.classList.remove('drag-over'); });
    });
    box.addEventListener('drop', function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) uploadImageFile(prefix, file);
    });
  }
  setupImageUpload('produk');
  setupImageUpload('artikel');
  setupImageUpload('artikel2');

  // ---------- Overview ----------
  function renderOverview() {
    document.getElementById('statProduk').textContent = data.produk.length;
    document.getElementById('statArtikel').textContent = data.artikel.length;
    var baru = data.pesan.filter(function (m) { return m.status === 'baru'; }).length;
    document.getElementById('statPesanBaru').textContent = baru;
    document.getElementById('statPublished').textContent =
      data.produk.filter(function (p) { return p.status === 'published'; }).length +
      data.artikel.filter(function (a) { return a.status === 'published'; }).length;

    var list = document.getElementById('activityList');
    var items = [];
    data.pesan.slice(0, 3).forEach(function (m) {
      items.push({ text: 'Pesan baru dari <strong>' + escapeHtml(m.nama) + '</strong> — ' + escapeHtml(m.subjek), time: m.tanggal });
    });
    data.artikel.slice(0, 2).forEach(function (a) {
      items.push({ text: 'Artikel <strong>' + escapeHtml(a.judul) + '</strong> berstatus ' + a.status, time: a.tanggal });
    });
    list.innerHTML = items.map(function (it) {
      return '<div class="activity-item"><span class="activity-dot"></span><div><p>' + it.text + '</p><time>' + it.time + '</time></div></div>';
    }).join('') || '<div class="empty-state">Belum ada aktivitas.</div>';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Produk ----------
  var produkTableBody = document.getElementById('produkTableBody');
  var produkStatusFilter = 'all';
  var produkSortSelect = document.getElementById('produkSort');
  var produkSearchQuery = '';

  function emptyStateHtml(msg) {
    return '<div class="empty-state"><span class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>' + msg + '</div>';
  }

  function applyProdukFilters(list) {
    var out = list;
    if (produkStatusFilter !== 'all') {
      out = out.filter(function (p) { return p.status === produkStatusFilter; });
    }
    if (produkSearchQuery) {
      var q = produkSearchQuery;
      out = out.filter(function (p) {
        return ((p.nama || '') + ' ' + (p.kategori || '')).toLowerCase().indexOf(q) !== -1;
      });
    }
    var sortBy = produkSortSelect ? produkSortSelect.value : 'urutan';
    out = out.slice();
    if (sortBy === 'nama') {
      out.sort(function (a, b) { return String(a.nama || '').localeCompare(String(b.nama || '')); });
    } else if (sortBy === 'terbaru') {
      out.sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    } else {
      out.sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); });
    }
    return out;
  }

  function renderProduk() {
    document.querySelectorAll('.nav-count[data-count="produk"]').forEach(function (el) {
      el.textContent = data.produk.length;
    });
    var publishedCount = data.produk.filter(function (p) { return p.status === 'published'; }).length;
    var draftCount = data.produk.filter(function (p) { return p.status === 'draft'; }).length;
    setText('countProdukAll', data.produk.length);
    setText('countProdukPublished', publishedCount);
    setText('countProdukDraft', draftCount);

    var rows = applyProdukFilters(data.produk);
    setText('produkTableCount', rows.length + ' dari ' + data.produk.length + ' produk ditampilkan');

    if (!data.produk.length) {
      produkTableBody.innerHTML = '<tr><td colspan="5">' + emptyStateHtml('Belum ada produk. Klik &ldquo;Tambah Produk&rdquo; untuk mulai.') + '</td></tr>';
      return;
    }
    if (!rows.length) {
      produkTableBody.innerHTML = '<tr><td colspan="5">' + emptyStateHtml('Tidak ada produk yang cocok dengan filter/pencarian.') + '</td></tr>';
      return;
    }
    produkTableBody.innerHTML = rows.map(function (p) {
      return '' +
        '<tr>' +
          '<td data-label="Produk"><div class="row-flex"><div><span class="cell-title">' + escapeHtml(p.nama) + '</span><span class="cell-sub">' + escapeHtml(p.kategori || '') + '</span></div></div></td>' +
          '<td data-label="Harga">' + escapeHtml(p.harga || '—') + '</td>' +
          '<td data-label="Stok / Supply">' + escapeHtml(p.supply_ability || '—') + '</td>' +
          '<td data-label="Status"><span class="badge ' + (p.status === 'published' ? 'badge-new' : 'badge-pending') + '">' + (p.status === 'published' ? 'Tayang' : 'Draft') + '</span></td>' +
          '<td class="cell-actions-td"><div class="cell-actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit-produk="' + p.id + '">Ubah</button>' +
            '<button class="btn btn-ghost btn-sm" data-duplicate-produk="' + p.id + '">Duplikat</button>' +
            '<button class="btn btn-danger btn-sm" data-delete-produk="' + p.id + '">Hapus</button>' +
          '</div></td>' +
        '</tr>';
    }).join('');
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  document.querySelectorAll('#produkFilterChips [data-status-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      produkStatusFilter = btn.getAttribute('data-status-filter');
      document.querySelectorAll('#produkFilterChips .chip').forEach(function (c) { c.classList.toggle('active', c === btn); });
      renderProduk();
    });
  });
  if (produkSortSelect) produkSortSelect.addEventListener('change', renderProduk);

  // ---------- Artikel ----------
  var artikelTableBody = document.getElementById('artikelTableBody');
  var artikelStatusFilter = 'all';
  var artikelSearchQuery = '';

  function applyArtikelFilters(list) {
    var out = list;
    if (artikelStatusFilter !== 'all') {
      out = out.filter(function (a) { return a.status === artikelStatusFilter; });
    }
    if (artikelSearchQuery) {
      var q = artikelSearchQuery;
      out = out.filter(function (a) {
        return ((a.judul || '') + ' ' + (a.kategori || '')).toLowerCase().indexOf(q) !== -1;
      });
    }
    return out;
  }

  function renderArtikel() {
    document.querySelectorAll('.nav-count[data-count="artikel"]').forEach(function (el) {
      el.textContent = data.artikel.length;
    });
    var publishedCount = data.artikel.filter(function (a) { return a.status === 'published'; }).length;
    var draftCount = data.artikel.filter(function (a) { return a.status === 'draft'; }).length;
    setText('countArtikelAll', data.artikel.length);
    setText('countArtikelPublished', publishedCount);
    setText('countArtikelDraft', draftCount);

    var rows = applyArtikelFilters(data.artikel);
    setText('artikelTableCount', rows.length + ' dari ' + data.artikel.length + ' artikel ditampilkan');

    if (!data.artikel.length) {
      artikelTableBody.innerHTML = '<tr><td colspan="4">' + emptyStateHtml('Belum ada artikel.') + '</td></tr>';
      return;
    }
    if (!rows.length) {
      artikelTableBody.innerHTML = '<tr><td colspan="4">' + emptyStateHtml('Tidak ada artikel yang cocok dengan filter/pencarian.') + '</td></tr>';
      return;
    }
    artikelTableBody.innerHTML = rows.map(function (a) {
      var beranda = a.tampil_beranda !== false; // default true kalau kolom belum pernah diisi
      return '' +
        '<tr>' +
          '<td data-label="Judul"><span class="cell-title">' + escapeHtml(a.judul) + '</span><span class="cell-sub">' + escapeHtml(a.kategori || '') + ' · ' + a.tanggal + '</span></td>' +
          '<td data-label="Status"><span class="badge ' + (a.status === 'published' ? 'badge-new' : 'badge-pending') + '">' + (a.status === 'published' ? 'Tayang' : 'Draft') + '</span></td>' +
          '<td data-label="Beranda"><button type="button" class="beranda-toggle" data-toggle-beranda="' + a.id + '" data-current="' + (beranda ? '1' : '0') + '" title="' + (beranda ? 'Tampil di Beranda — klik untuk sembunyikan' : 'Tidak tampil di Beranda — klik untuk tampilkan') + '">' +
            (beranda ?
              '<svg viewBox="0 0 36 20" fill="none"><rect x="0.5" y="0.5" width="35" height="19" rx="9.5" fill="var(--success,#4A5D45)" stroke="var(--success,#4A5D45)"/><circle cx="26" cy="10" r="7.5" fill="#fff"/></svg>' :
              '<svg viewBox="0 0 36 20" fill="none"><rect x="0.5" y="0.5" width="35" height="19" rx="9.5" fill="var(--line,#ddd)" stroke="var(--line-strong,#ccc)"/><circle cx="10" cy="10" r="7.5" fill="#fff"/></svg>') +
          '</button></td>' +
          '<td data-label="Tanggal">' + a.tanggal + '</td>' +
          '<td class="cell-actions-td"><div class="cell-actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit-artikel="' + a.id + '">Ubah</button>' +
            '<button class="btn btn-ghost btn-sm" data-duplicate-artikel="' + a.id + '">Duplikat</button>' +
            '<button class="btn btn-danger btn-sm" data-delete-artikel="' + a.id + '">Hapus</button>' +
          '</div></td>' +
        '</tr>';
    }).join('');
  }

  document.querySelectorAll('#artikelFilterChips [data-status-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      artikelStatusFilter = btn.getAttribute('data-status-filter');
      document.querySelectorAll('#artikelFilterChips .chip').forEach(function (c) { c.classList.toggle('active', c === btn); });
      renderArtikel();
    });
  });

  // ---------- Konten Frontend ----------
  var cmsList = document.getElementById('cmsList');
  var cmsPageFilter = document.getElementById('cmsPageFilter');
  var cmsSearch = document.getElementById('cmsSearch');
  function cmsPageLabel(page) {
    return ({'index.html':'Beranda','produk.html':'Produk','semua-artikel.html':'Artikel','tentang.html':'Tentang','kontak.html':'Kontak','artikel.html':'Detail Artikel'})[page] || page;
  }
  function renderKonten() {
    document.querySelectorAll('.nav-count[data-count="konten"]').forEach(function(el){el.textContent=data.konten.length;});
    var page=(cmsPageFilter&&cmsPageFilter.value)||'all', q=(cmsSearch&&cmsSearch.value||'').trim().toLowerCase();
    var rows=data.konten.filter(function(r){
      var pageOk=page==='all'||r.page===page;
      var hay=(r.label+' '+r.value_id+' '+r.value_en+' '+r.page).toLowerCase();
      return pageOk && (!q||hay.indexOf(q)!==-1);
    });
    if(!rows.length){cmsList.innerHTML='<div class="empty-state">Belum ada konten yang cocok.</div>';return;}
    cmsList.innerHTML=rows.map(function(r){
      var isImage = r.content_type === 'image';
      var preview = isImage
        ? (r.value_id ? '<img class="cms-row-thumb" src="'+escapeHtml(r.value_id)+'" alt="">' : '<span class="cms-preview">Belum ada gambar</span>')
        : '<span class="cms-preview">'+escapeHtml(r.value_id||r.value_en||'')+'</span>';
      return '<div class="cms-row" data-cms-row="'+escapeHtml(r.id)+'">'+
        '<div><span class="cms-page">'+escapeHtml(cmsPageLabel(r.page))+'</span></div>'+
        '<div style="display:flex;align-items:center;"><span class="cms-label">'+escapeHtml(r.label||r.key)+(isImage?' <span style="color:var(--ink-soft);font-weight:400;">(Gambar)</span>':'')+'</span>'+preview+'</div>'+
        '<div class="cell-actions"><button class="btn btn-ghost btn-sm" data-edit-konten="'+escapeHtml(r.id)+'">Ubah</button><button class="btn btn-danger btn-sm" data-delete-konten="'+escapeHtml(r.id)+'">Hapus</button></div>'+
      '</div>';
    }).join('');
  }
  function cmsEditor(r){
    var isImage = r.content_type === 'image';
    var typeOptions='<option value="text" '+(r.content_type==='text'?'selected':'')+'>Teks</option><option value="html" '+(r.content_type==='html'?'selected':'')+'>Teks + format sederhana</option><option value="attribute" '+(r.content_type==='attribute'?'selected':'')+'>Atribut (placeholder/title/label)</option><option value="image" '+(isImage?'selected':'')+'>Gambar</option>';
    // Baris teks ID/EN disembunyikan (bukan dihapus dari DOM) saat jenisnya
    // Gambar, supaya bisa toggle tanpa kehilangan isi kalau admin ganti pikiran.
    var textFieldsStyle = isImage ? ' style="display:none;"' : '';
    var imageFieldStyle = isImage ? '' : ' style="display:none;"';
    return '<div class="cms-editor" data-cms-editor="'+escapeHtml(r.id||'new')+'">'+
      '<div class="field"><label>Halaman</label><div class="input-shell"><select class="plain-input cms-page-input"><option value="index.html">Beranda</option><option value="produk.html">Produk</option><option value="semua-artikel.html">Artikel</option><option value="tentang.html">Tentang</option><option value="kontak.html">Kontak</option><option value="artikel.html">Detail Artikel</option></select></div></div>'+
      '<div class="field"><label>Nama / Label Konten</label><div class="input-shell"><input class="plain-input cms-label-input" value="'+escapeHtml(r.label||'')+'" placeholder="Contoh: Judul hero, Foto galeri warehouse"></div></div>'+
      '<div class="field"><label>Jenis</label><div class="input-shell"><select class="plain-input cms-type-input">'+typeOptions+'</select></div></div>'+
      '<div class="field cms-text-field"'+textFieldsStyle+'><label>Bahasa Indonesia</label><div class="input-shell"><textarea class="plain-input cms-id-input" rows="3">'+escapeHtml(r.value_id||'')+'</textarea></div></div>'+
      '<div class="field cms-text-field"'+textFieldsStyle+'><label>English</label><div class="input-shell"><textarea class="plain-input cms-en-input" rows="3">'+escapeHtml(r.value_en||'')+'</textarea></div></div>'+
      '<div class="field cms-image-field"'+imageFieldStyle+'>'+
        '<label>Gambar</label>'+
        '<div class="image-upload-box" data-cms-image-box>'+
          '<input type="file" class="cms-image-file" accept="image/*" hidden>'+
          '<div class="image-upload-preview">'+
            '<img class="cms-image-preview-img" src="'+escapeHtml(r.value_id||'')+'" alt=""'+(r.value_id?'':' hidden')+'>'+
            '<span class="image-upload-empty cms-image-empty"'+(r.value_id?' hidden':'')+'>Belum ada gambar</span>'+
          '</div>'+
          '<div class="image-upload-actions">'+
            '<button type="button" class="btn btn-ghost btn-sm cms-image-pick">Pilih Gambar</button>'+
            '<button type="button" class="btn btn-ghost btn-sm btn-danger-text cms-image-remove"'+(r.value_id?'':' hidden')+'>Hapus</button>'+
            '<span class="image-upload-status cms-image-status"></span>'+
          '</div>'+
          '<p class="field-hint">Seret &amp; lepas gambar, atau klik &ldquo;Pilih Gambar&rdquo;. JPG/PNG/WebP, maks 5MB.</p>'+
          '<details class="image-url-fallback"><summary>Atau isi URL gambar manual</summary><div class="input-shell"><input type="text" class="plain-input cms-image-url-input" value="'+escapeHtml(r.value_id||'')+'" placeholder="images/nama-file.webp atau URL"></div></details>'+
        '</div>'+
      '</div>'+
      '<div class="field cms-attr-field"><label>Atribut (jika diperlukan)</label><div class="input-shell"><select class="plain-input cms-attr-input"><option value="">Tidak ada</option><option value="placeholder">Placeholder</option><option value="title">Title</option><option value="aria-label">Label aksesibilitas</option><option value="src">Sumber gambar (src)</option><option value="alt">Teks alternatif (alt)</option></select></div></div>'+
      '<div class="field"><label>Status</label><div class="input-shell"><select class="plain-input cms-status-input"><option value="published">Tayang</option><option value="draft">Draft</option></select></div></div>'+
      '<div class="field"><label>Urutan</label><div class="input-shell"><input type="number" class="plain-input cms-order-input" value="'+(r.sort_order||0)+'"></div></div>'+
      '<div class="cms-editor-actions"><button type="button" class="btn btn-ghost btn-sm" data-cancel-cms="'+escapeHtml(r.id||'new')+'">Batal</button><button type="button" class="btn btn-primary btn-sm" data-save-cms="'+escapeHtml(r.id||'new')+'">Simpan</button></div>'+
      '</div>';
  }
  function setCmsImagePreview(editor, url){
    var img = editor.querySelector('.cms-image-preview-img');
    var empty = editor.querySelector('.cms-image-empty');
    var removeBtn = editor.querySelector('.cms-image-remove');
    var urlInput = editor.querySelector('.cms-image-url-input');
    if (urlInput) urlInput.value = url || '';
    if (url) { img.src = url; img.hidden = false; if (empty) empty.hidden = true; if (removeBtn) removeBtn.hidden = false; }
    else { img.hidden = true; img.src = ''; if (empty) empty.hidden = false; if (removeBtn) removeBtn.hidden = true; }
  }
  async function uploadCmsImage(editor, file){
    var statusEl = editor.querySelector('.cms-image-status');
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast('File harus berupa gambar (JPG/PNG/WebP).'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran gambar maksimal 5MB.'); return; }
    if (statusEl) statusEl.textContent = 'Mengunggah...';
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = 'konten-cms/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var up = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (up.error) {
      console.error('Gagal upload gambar CMS:', up.error);
      if (statusEl) statusEl.textContent = '';
      showToast('Gagal upload gambar: ' + up.error.message);
      return;
    }
    var pub = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    var publicUrl = pub && pub.data ? pub.data.publicUrl : '';
    setCmsImagePreview(editor, publicUrl);
    if (statusEl) statusEl.textContent = 'Gambar terunggah.';
    setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 2200);
  }
  function setupCmsImageEditor(editor){
    var fileInput = editor.querySelector('.cms-image-file');
    var pickBtn = editor.querySelector('.cms-image-pick');
    var removeBtn = editor.querySelector('.cms-image-remove');
    var urlInput = editor.querySelector('.cms-image-url-input');
    var box = editor.querySelector('[data-cms-image-box]');
    if (!fileInput) return;
    pickBtn.addEventListener('click', function(){ fileInput.click(); });
    fileInput.addEventListener('change', function(){
      if (fileInput.files && fileInput.files[0]) uploadCmsImage(editor, fileInput.files[0]);
      fileInput.value = '';
    });
    removeBtn.addEventListener('click', function(){ setCmsImagePreview(editor, ''); });
    urlInput.addEventListener('input', function(){ setCmsImagePreview(editor, urlInput.value.trim()); });
    ['dragover','dragenter'].forEach(function(evt){ box.addEventListener(evt, function(e){ e.preventDefault(); box.classList.add('drag-over'); }); });
    ['dragleave','drop'].forEach(function(evt){ box.addEventListener(evt, function(e){ e.preventDefault(); box.classList.remove('drag-over'); }); });
    box.addEventListener('drop', function(e){
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) uploadCmsImage(editor, file);
    });
  }
  // Toggle tampilan field teks vs field gambar saat admin ganti dropdown "Jenis".
  function bindCmsTypeToggle(editor){
    var typeInput = editor.querySelector('.cms-type-input');
    typeInput.addEventListener('change', function(){
      var isImage = typeInput.value === 'image';
      editor.querySelectorAll('.cms-text-field').forEach(function(el){ el.style.display = isImage ? 'none' : ''; });
      var imgField = editor.querySelector('.cms-image-field');
      if (imgField) imgField.style.display = isImage ? '' : 'none';
    });
  }
  function openCmsEditor(id){
    var row=id?data.konten.find(function(x){return x.id===id;}):{id:'new',page:'index.html',label:'',value_id:'',value_en:'',content_type:'text',attribute_name:'',status:'published',sort_order:data.konten.length+1};
    var wrap=document.createElement('div'); wrap.innerHTML=cmsEditor(row); var editor=wrap.firstElementChild;
    var existing=cmsList.querySelector('[data-cms-row="'+CSS.escape(String(id||''))+'"]');
    if(id && existing) existing.replaceWith(editor); else cmsList.prepend(editor);
    editor.querySelector('.cms-page-input').value=row.page;
    editor.querySelector('.cms-attr-input').value=row.attribute_name||'';
    editor.querySelector('.cms-status-input').value=row.status||'published';
    editor.querySelector('.cms-type-input').value=row.content_type||'text';
    setupCmsImageEditor(editor);
    bindCmsTypeToggle(editor);
  }
  cmsList.addEventListener('click', async function(e){
    var edit=e.target.getAttribute('data-edit-konten'), del=e.target.getAttribute('data-delete-konten'), cancel=e.target.getAttribute('data-cancel-cms'), save=e.target.getAttribute('data-save-cms');
    if(edit){openCmsEditor(edit);return;}
    if(cancel){renderKonten();return;}
    if(del){if(!await showConfirm('Konten ini akan dihapus dari CMS dan tidak bisa dikembalikan.',{title:'Hapus konten ini?'}))return;var rd=await supabaseClient.from('site_content').delete().eq('id',del);if(rd.error){showToast('Gagal menghapus konten: '+rd.error.message);return;}data.konten=await fetchKonten();renderKonten();showToast('Konten dihapus.');return;}
    if(save){
      var ed=e.target.closest('.cms-editor');var id=save==='new'?null:save;
      var contentType=ed.querySelector('.cms-type-input').value;
      var isImage=contentType==='image';
      var valueId = isImage ? (ed.querySelector('.cms-image-url-input').value||'').trim() : ed.querySelector('.cms-id-input').value;
      var payload={page:ed.querySelector('.cms-page-input').value,label:ed.querySelector('.cms-label-input').value.trim()||'Konten',value_id:valueId,value_en:isImage?'':ed.querySelector('.cms-en-input').value,content_type:contentType,attribute_name:ed.querySelector('.cms-attr-input').value||(isImage?'src':null),status:ed.querySelector('.cms-status-input').value,sort_order:parseInt(ed.querySelector('.cms-order-input').value||'0',10)};
      if(!payload.label){showToast('Nama konten wajib diisi.');return;}
      if(isImage && !payload.value_id){showToast('Pilih atau isi URL gambar terlebih dahulu.');return;}
      var rr=id?await supabaseClient.from('site_content').update(payload).eq('id',id):await supabaseClient.from('site_content').insert(Object.assign({key:toSlug(payload.page+'-'+payload.label)+'-'+Date.now()},payload));
      if(rr.error){showToast('Gagal menyimpan konten: '+rr.error.message);return;}
      data.konten=await fetchKonten();renderKonten();renderOverview();showToast('Konten berhasil disimpan.');
    }
  });
  if(cmsPageFilter) cmsPageFilter.addEventListener('change',renderKonten);
  if(cmsSearch) cmsSearch.addEventListener('input',renderKonten);
  document.getElementById('addKontenBtn').addEventListener('click',function(){openCmsEditor(null);});

  // ---------- Pesan ----------
  var pesanList = document.getElementById('pesanList');
  function renderPesan() {
    var baru = data.pesan.filter(function (m) { return m.status === 'baru'; }).length;
    document.querySelectorAll('.nav-count[data-count="pesan"]').forEach(function (el) {
      el.textContent = baru;
    });
    if (!data.pesan.length) {
      pesanList.innerHTML = '<div class="empty-state">Belum ada pesan masuk.</div>';
      return;
    }
    pesanList.innerHTML = data.pesan.map(function (m) {
      var badgeClass = m.status === 'baru' ? 'badge-new' : (m.status === 'dibaca' ? 'badge-pending' : 'badge-archived');
      var badgeLabel = m.status === 'baru' ? 'Baru' : (m.status === 'dibaca' ? 'Dibaca' : 'Arsip');
      return '' +
        '<div class="activity-item" style="align-items:flex-start;">' +
          '<span class="activity-dot" style="margin-top:0.55rem;"></span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.2rem;">' +
              '<strong style="font-size:0.9rem;">' + escapeHtml(m.nama) + '</strong>' +
              '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>' +
              '<time style="font-size:0.75rem;color:var(--ink-soft);margin-left:auto;">' + m.tanggal + '</time>' +
            '</div>' +
            '<p style="font-size:0.83rem;color:var(--ink-soft);margin-bottom:0.15rem;">' + escapeHtml(m.subjek) + ' · ' + escapeHtml(m.kontak) + '</p>' +
            '<p style="font-size:0.88rem;">' + escapeHtml(m.pesan) + '</p>' +
            '<div class="cell-actions" style="justify-content:flex-start;margin-top:0.6rem;">' +
              (m.status !== 'dibaca' ? '<button class="btn btn-ghost btn-sm" data-mark-pesan="' + m.id + '" data-status="dibaca">Tandai Dibaca</button>' : '') +
              (m.status !== 'arsip' ? '<button class="btn btn-ghost btn-sm" data-mark-pesan="' + m.id + '" data-status="arsip">Arsipkan</button>' : '') +
              '<button class="btn btn-danger btn-sm" data-delete-pesan="' + m.id + '">Hapus</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderAll() {
    renderOverview();
    renderProduk();
    renderArtikel();
    renderPesan();
    renderKonten();
  }

  // ---------- Modal: Produk ----------
  var produkModal = document.getElementById('produkModal');
  var produkForm = document.getElementById('produkForm');
  function arr(v){ if(Array.isArray(v)) return v; if(typeof v==='string'){try{var x=JSON.parse(v);return Array.isArray(x)?x:[]}catch(e){return []}} return []; }
  function inputVal(v){ return String(v==null?'':v); }
  function addRepeaterRow(type, value){
    var container=document.getElementById('produk'+({fitur:'Fitur',quickspecs:'Quickspecs',lead:'Lead',spesifikasi:'Spesifikasi'}[type])+'Rows');
    if(!container)return;
    value=value||{};
    var row=document.createElement('div'); row.className='repeater-row '+type+(type==='quickspecs'||type==='spesifikasi'?' triple':'');
    if(type==='fitur') row.innerHTML='<input class="plain-input rep-id" placeholder="Fitur Indonesia"><input class="plain-input rep-en" placeholder="Fitur English"><button type="button" class="btn btn-danger btn-xs repeater-remove">Hapus</button>';
    else if(type==='quickspecs') row.innerHTML='<input class="plain-input rep-label-id" placeholder="Label Indonesia"><input class="plain-input rep-value" placeholder="Nilai Indonesia"><input class="plain-input rep-label-en" placeholder="Label English"><input class="plain-input rep-value-en" placeholder="Nilai English"><input class="plain-input rep-sub" placeholder="Catatan kecil (opsional)"><button type="button" class="btn btn-danger btn-xs repeater-remove">Hapus</button>';
    else if(type==='lead') row.innerHTML='<input class="plain-input rep-qty" placeholder="Jumlah / Qty"><input class="plain-input rep-qty-en" placeholder="Qty English"><input class="plain-input rep-waktu" placeholder="Estimasi waktu"><input class="plain-input rep-waktu-en" placeholder="Time English"><button type="button" class="btn btn-danger btn-xs repeater-remove">Hapus</button>';
    else row.innerHTML='<input class="plain-input rep-label-id" placeholder="Label Indonesia"><input class="plain-input rep-value" placeholder="Nilai Indonesia"><input class="plain-input rep-label-en" placeholder="Label English"><input class="plain-input rep-value-en" placeholder="Nilai English"><button type="button" class="btn btn-danger btn-xs repeater-remove">Hapus</button>';
    container.appendChild(row);
    Object.keys(value).forEach(function(k){var map={id:'rep-id',en:'rep-en',label_id:'rep-label-id',label_en:'rep-label-en',value:'rep-value',value_en:'rep-value-en',sub:'rep-sub',qty:'rep-qty',qty_en:'rep-qty-en',waktu:'rep-waktu',waktu_en:'rep-waktu-en'};if(map[k]){var el=row.querySelector('.'+map[k]);if(el)el.value=inputVal(value[k]);}});
    row.querySelector('.repeater-remove').addEventListener('click',function(){row.remove();});
  }
  function clearRepeaters(){['Fitur','Quickspecs','Lead','Spesifikasi'].forEach(function(x){var el=document.getElementById('produk'+x+'Rows');if(el)el.innerHTML='';});}
  function fillRepeaters(p){
    clearRepeaters();
    arr(p&&p.fitur).forEach(function(x){addRepeaterRow('fitur',x);});
    arr(p&&p.quickspecs).forEach(function(x){addRepeaterRow('quickspecs',x);});
    arr(p&&p.lead_time).forEach(function(x){addRepeaterRow('lead',x);});
    arr(p&&p.spesifikasi).forEach(function(x){addRepeaterRow('spesifikasi',x);});
  }
  function collectRepeaters(type){
    var container=document.getElementById('produk'+({fitur:'Fitur',quickspecs:'Quickspecs',lead:'Lead',spesifikasi:'Spesifikasi'}[type])+'Rows');
    if(!container)return[];
    return Array.from(container.querySelectorAll('.repeater-row')).map(function(row){
      if(type==='fitur') return {id:row.querySelector('.rep-id').value.trim(),en:row.querySelector('.rep-en').value.trim()};
      if(type==='quickspecs') return {label_id:row.querySelector('.rep-label-id').value.trim(),label_en:row.querySelector('.rep-label-en').value.trim(),value:row.querySelector('.rep-value').value.trim(),value_en:row.querySelector('.rep-value-en').value.trim(),sub:row.querySelector('.rep-sub').value.trim()};
      if(type==='lead') return {qty:row.querySelector('.rep-qty').value.trim(),qty_en:row.querySelector('.rep-qty-en').value.trim(),waktu:row.querySelector('.rep-waktu').value.trim(),waktu_en:row.querySelector('.rep-waktu-en').value.trim()};
      return {label_id:row.querySelector('.rep-label-id').value.trim(),label_en:row.querySelector('.rep-label-en').value.trim(),value:row.querySelector('.rep-value').value.trim(),value_en:row.querySelector('.rep-value-en').value.trim()};
    }).filter(function(x){return Object.keys(x).some(function(k){return x[k];});});
  }
  async function openProdukModal(id, opts) {
    opts = opts || {};
    var isDuplicate = !!opts.duplicate;
    var editing = id ? data.produk.find(function (p) { return p.id === id; }) : null;

    // Selalu ambil data terbaru dari Supabase saat tombol Ubah/Duplikat diklik.
    if (id) {
      var fresh = await supabaseClient.from('produk').select('*').eq('id', id).maybeSingle();
      if (fresh.error) {
        console.error(fresh.error);
        showToast('Gagal mengambil data produk: ' + fresh.error.message);
        return;
      }
      if (fresh.data) {
        editing = fresh.data;
        if (!isDuplicate) {
          var idx = data.produk.findIndex(function (p) { return p.id === id; });
          if (idx >= 0) data.produk[idx] = fresh.data;
          else data.produk.push(fresh.data);
        }
      }
    }

    document.getElementById('produkModalTitle').textContent = isDuplicate ? 'Produk Baru dari Template' : (editing ? 'Ubah Produk' : 'Tambah Produk');
    produkForm.reset();
    document.getElementById('produkId').value = (editing && !isDuplicate) ? editing.id : '';
    fillRepeaters(editing||{});
    if (editing) {
      document.getElementById('produkNama').value = isDuplicate ? (editing.nama ? editing.nama + ' (Salinan)' : '') : (editing.nama || '');
      document.getElementById('produkKategori').value = editing.kategori || '';
      document.getElementById('produkHarga').value = editing.harga || '';
      document.getElementById('produkStok').value = editing.supply_ability || '';
      document.getElementById('produkDeskripsi').value = editing.deskripsi || '';
      document.getElementById('produkDeskripsiEn').value = editing.deskripsi_en || '';
      document.getElementById('produkPackaging').value = editing.packaging || '';
      document.getElementById('produkPayment').value = editing.payment_terms || '';
      document.getElementById('produkGambar').value = editing.gambar_url || '';
      document.getElementById('produkUrutan').value = isDuplicate ? 0 : (editing.urutan || 0);
      document.getElementById('produkStatus').value = isDuplicate ? 'draft' : editing.status;
    }
    setImagePreview('produk', document.getElementById('produkGambar').value);
    produkModal.classList.add('show');
  }
  function closeProdukModal() { produkModal.classList.remove('show'); }

  document.querySelectorAll('[data-add-row]').forEach(function(btn){btn.addEventListener('click',function(){addRepeaterRow(btn.getAttribute('data-add-row'),{});});});
  produkForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('produkId').value;
    var nama = document.getElementById('produkNama').value.trim();
    var payload = {
      nama: nama,
      kategori: document.getElementById('produkKategori').value.trim(),
      harga: document.getElementById('produkHarga').value.trim(),
      supply_ability: document.getElementById('produkStok').value.trim(),
      deskripsi: document.getElementById('produkDeskripsi').value.trim(),
      deskripsi_en: document.getElementById('produkDeskripsiEn').value.trim(),
      packaging: document.getElementById('produkPackaging').value.trim(),
      payment_terms: document.getElementById('produkPayment').value.trim(),
      gambar_url: document.getElementById('produkGambar').value.trim(),
      fitur: collectRepeaters('fitur'), quickspecs: collectRepeaters('quickspecs'), lead_time: collectRepeaters('lead'), spesifikasi: collectRepeaters('spesifikasi'),
      urutan: parseInt(document.getElementById('produkUrutan').value || '0', 10),
      status: document.getElementById('produkStatus').value
    };
    if (!payload.nama) { showToast('Nama produk wajib diisi.'); return; }
    var submitBtn = produkForm.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.disabled = true;
    var res;
    if (id) {
      res = await supabaseClient.from('produk').update(payload).eq('id', id).select().single();
    } else {
      // Slug harus unik. Jika nama sudah dipakai, tambahkan suffix waktu.
      var baseSlug = toSlug(nama);
      var existing = await supabaseClient.from('produk').select('slug').like('slug', baseSlug + '%');
      var used = (existing.data || []).map(function (x) { return x.slug; });
      var slug = baseSlug;
      if (used.indexOf(slug) !== -1) {
        var n = 2;
        while (used.indexOf(baseSlug + '-' + n) !== -1) n++;
        slug = baseSlug + '-' + n;
      }
      payload.slug = slug;
      payload.urutan = data.produk.length + 1;
      res = await supabaseClient.from('produk').insert(payload).select().single();
    }

    if (res.error) {
      console.error('Gagal menyimpan produk:', res.error);
      showToast('Gagal menyimpan produk: ' + res.error.message);
    } else {
      // Refresh dari server supaya produk baru/edit langsung terlihat di dashboard.
      data.produk = await fetchProduk();
      renderProduk();
      renderOverview();
      closeProdukModal();
      showToast(id ? 'Produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.');
    }
    if (submitBtn) submitBtn.disabled = false;
  });

  produkTableBody.addEventListener('click', async function (e) {
    var editId = e.target.getAttribute('data-edit-produk');
    var dupId = e.target.getAttribute('data-duplicate-produk');
    var delId = e.target.getAttribute('data-delete-produk');
    if (editId) openProdukModal(editId);
    if (dupId) openProdukModal(dupId, { duplicate: true });
    if (delId) { if (!await showConfirm('Produk ini akan dihapus dari situs dan tidak bisa dikembalikan.', { title: 'Hapus produk ini?' })) return; var res = await supabaseClient.from('produk').delete().eq('id', delId); if (res.error) { showToast('Gagal menghapus produk: ' + res.error.message); return; } data.produk = await fetchProduk(); renderProduk(); renderOverview(); showToast('Produk dihapus.'); }
  });
  document.getElementById('addProdukBtn').addEventListener('click', function () { openProdukModal(null); });
  document.getElementById('produkModalClose').addEventListener('click', closeProdukModal);
  document.getElementById('produkModalCancel').addEventListener('click', closeProdukModal);

  // "Gunakan Template" di atas tabel: pilih dari daftar produk yang sudah ada
  // untuk dijadikan dasar produk baru (tanpa harus scroll cari tombol Duplikat).
  document.getElementById('templateProdukBtn').addEventListener('click', async function () {
    if (!data.produk.length) { showToast('Belum ada produk yang bisa dijadikan template.'); return; }
    var items = data.produk.map(function (p) { return { label: p.nama, sublabel: p.kategori, thumb: p.gambar_url }; });
    var idx = await showPicker(items, { title: 'Gunakan Produk sebagai Template', message: 'Pilih produk yang mau dijadikan dasar produk baru.' });
    if (idx === null || !data.produk[idx]) return;
    openProdukModal(data.produk[idx].id, { duplicate: true });
  });

  document.querySelectorAll('.rich-toolbar button').forEach(function(btn){btn.addEventListener('click',function(){var cmd=btn.getAttribute('data-cmd'),value=btn.getAttribute('data-value')||null;document.execCommand(cmd,false,value);});});

  // ---------- Modal: Artikel FAQ repeater ----------
  var artikelFaqList = document.getElementById('artikelFaqList');
  function addFaqRow(faq) {
    faq = faq || {};
    var item = document.createElement('div');
    item.className = 'faq-editor-item';
    item.innerHTML =
      '<div class="faq-editor-q-row">' +
        '<input class="plain-input faq-q" placeholder="Pertanyaan (Indonesia)">' +
        '<input class="plain-input faq-q-en" placeholder="Question (English)">' +
        '<button type="button" class="btn btn-danger btn-xs faq-remove">Hapus</button>' +
      '</div>' +
      '<div class="faq-editor-a-row">' +
        '<textarea class="plain-input faq-a" rows="2" placeholder="Jawaban (Indonesia)"></textarea>' +
        '<textarea class="plain-input faq-a-en" rows="2" placeholder="Answer (English)"></textarea>' +
      '</div>';
    item.querySelector('.faq-q').value = faq.pertanyaan || '';
    item.querySelector('.faq-q-en').value = faq.pertanyaan_en || '';
    item.querySelector('.faq-a').value = faq.jawaban || '';
    item.querySelector('.faq-a-en').value = faq.jawaban_en || '';
    item.querySelector('.faq-remove').addEventListener('click', function () { item.remove(); });
    artikelFaqList.appendChild(item);
  }
  function renderFaqEditor(faqArr) {
    artikelFaqList.innerHTML = '';
    (Array.isArray(faqArr) ? faqArr : []).forEach(function (f) { addFaqRow(f); });
  }
  function collectFaqEditor() {
    return Array.from(artikelFaqList.querySelectorAll('.faq-editor-item')).map(function (item) {
      return {
        pertanyaan: item.querySelector('.faq-q').value.trim(),
        pertanyaan_en: item.querySelector('.faq-q-en').value.trim(),
        jawaban: item.querySelector('.faq-a').value.trim(),
        jawaban_en: item.querySelector('.faq-a-en').value.trim()
      };
    }).filter(function (f) { return f.pertanyaan || f.jawaban; });
  }
  document.getElementById('artikelFaqAdd').addEventListener('click', function () { addFaqRow(); });

  // ---------- Modal: Artikel ----------
  var artikelModal = document.getElementById('artikelModal');
  var artikelForm = document.getElementById('artikelForm');
  function openArtikelModal(id, opts) {
    opts = opts || {};
    var isDuplicate = !!opts.duplicate;
    var editing = id ? data.artikel.find(function (a) { return a.id === id; }) : null;
    document.getElementById('artikelModalTitle').textContent = isDuplicate ? 'Artikel Baru dari Template' : (editing ? 'Ubah Artikel' : 'Tulis Artikel');
    artikelForm.reset();
    renderFaqEditor(editing ? editing.faq : []);
    document.getElementById('artikelId').value = (editing && !isDuplicate) ? editing.id : '';
    if (editing) {
      document.getElementById('artikelJudul').value = isDuplicate ? (editing.judul ? editing.judul + ' (Salinan)' : '') : (editing.judul || '');
      document.getElementById('artikelJudulEn').value = editing.judul_en || '';
      document.getElementById('artikelRingkasan').value = editing.ringkasan || '';
      document.getElementById('artikelRingkasanEn').value = editing.ringkasan_en || '';
      document.getElementById('artikelKategori').value = editing.kategori || '';
      document.getElementById('artikelGambar').value = editing.gambar_url || '';
      document.getElementById('artikel2Gambar').value = editing.gambar_url_2 || '';
      document.getElementById('artikelPenulis').value = editing.penulis || '';
      document.getElementById('artikelKonten').innerHTML = editing.konten || '';
      document.getElementById('artikelKontenEn').innerHTML = editing.konten_en || '';
      document.getElementById('artikelStatus').value = isDuplicate ? 'draft' : editing.status;
      document.getElementById('artikelTampilBeranda').checked = editing.tampil_beranda !== false;
    } else {
      document.getElementById('artikelTampilBeranda').checked = true;
    }
    setImagePreview('artikel', document.getElementById('artikelGambar').value);
    setImagePreview('artikel2', document.getElementById('artikel2Gambar').value);
    artikelModal.classList.add('show');
  }
  function closeArtikelModal() { artikelModal.classList.remove('show'); }

  artikelForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('artikelId').value;
    var judul = document.getElementById('artikelJudul').value.trim();
    var payload = {
      judul: judul,
      judul_en: document.getElementById('artikelJudulEn').value.trim(),
      ringkasan: document.getElementById('artikelRingkasan').value.trim(),
      ringkasan_en: document.getElementById('artikelRingkasanEn').value.trim(),
      kategori: document.getElementById('artikelKategori').value.trim(),
      gambar_url: document.getElementById('artikelGambar').value.trim(),
      gambar_url_2: document.getElementById('artikel2Gambar').value.trim(),
      penulis: document.getElementById('artikelPenulis').value.trim(),
      konten: document.getElementById('artikelKonten').innerHTML.trim(),
      konten_en: document.getElementById('artikelKontenEn').innerHTML.trim(),
      faq: collectFaqEditor(),
      status: document.getElementById('artikelStatus').value,
      tampil_beranda: document.getElementById('artikelTampilBeranda').checked
    };
    if (!payload.judul) return;

    var submitBtn = artikelForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    if (id) {
      var res = await supabaseClient.from('artikel').update(payload).eq('id', id);
      if (res.error) {
        console.error(res.error);
        showToast('Gagal memperbarui artikel: ' + res.error.message);
      } else {
        showToast('Artikel berhasil diperbarui.');
      }
    } else {
      payload.slug = toSlug(judul);
      payload.tanggal = new Date().toISOString().slice(0, 10);
      var res2 = await supabaseClient.from('artikel').insert(payload);
      if (res2.error) {
        console.error(res2.error);
        showToast('Gagal menambahkan artikel: ' + res2.error.message);
      } else {
        showToast('Artikel baru berhasil ditambahkan.');
      }
    }

    if (submitBtn) submitBtn.disabled = false;
    data.artikel = await fetchArtikel();
    renderArtikel();
    renderOverview();
    closeArtikelModal();
  });

  artikelTableBody.addEventListener('click', async function (e) {
    var editId = e.target.getAttribute('data-edit-artikel');
    var dupId = e.target.getAttribute('data-duplicate-artikel');
    var delId = e.target.getAttribute('data-delete-artikel');
    var berandaBtn = e.target.closest('[data-toggle-beranda]');
    if (berandaBtn) {
      var bId = berandaBtn.getAttribute('data-toggle-beranda');
      var nextVal = berandaBtn.getAttribute('data-current') !== '1';
      berandaBtn.disabled = true;
      var resB = await supabaseClient.from('artikel').update({ tampil_beranda: nextVal }).eq('id', bId);
      berandaBtn.disabled = false;
      if (resB.error) {
        console.error(resB.error);
        showToast('Gagal mengubah status Beranda: ' + resB.error.message);
        return;
      }
      data.artikel = await fetchArtikel();
      renderArtikel();
      showToast(nextVal ? 'Artikel ditampilkan di Beranda.' : 'Artikel disembunyikan dari Beranda.');
      return;
    }
    if (editId) openArtikelModal(editId);
    if (dupId) openArtikelModal(dupId, { duplicate: true });
    if (delId) {
      if (!await showConfirm('Artikel ini akan dihapus dari situs dan tidak bisa dikembalikan.', { title: 'Hapus artikel ini?' })) return;
      var res = await supabaseClient.from('artikel').delete().eq('id', delId);
      if (res.error) {
        console.error(res.error);
        showToast('Gagal menghapus artikel: ' + res.error.message);
        return;
      }
      data.artikel = await fetchArtikel();
      renderArtikel();
      renderOverview();
      showToast('Artikel dihapus.');
    }
  });

  document.getElementById('addArtikelBtn').addEventListener('click', function () { openArtikelModal(null); });
  document.getElementById('artikelModalClose').addEventListener('click', closeArtikelModal);
  document.getElementById('artikelModalCancel').addEventListener('click', closeArtikelModal);

  // "Gunakan Template": pilih artikel lama untuk dijadikan dasar artikel baru.
  document.getElementById('templateArtikelBtn').addEventListener('click', async function () {
    if (!data.artikel.length) { showToast('Belum ada artikel yang bisa dijadikan template.'); return; }
    var items = data.artikel.map(function (a) { return { label: a.judul, sublabel: a.kategori, thumb: a.gambar_url }; });
    var idx = await showPicker(items, { title: 'Gunakan Artikel sebagai Template', message: 'Pilih artikel yang mau dijadikan dasar artikel baru.' });
    if (idx === null || !data.artikel[idx]) return;
    openArtikelModal(data.artikel[idx].id, { duplicate: true });
  });

  // ---------- Pesan actions ----------
  pesanList.addEventListener('click', async function (e) {
    var markId = e.target.getAttribute('data-mark-pesan');
    var delId = e.target.getAttribute('data-delete-pesan');
    if (markId) {
      var status = e.target.getAttribute('data-status');
      var res = await supabaseClient.from('pesan').update({ status: status }).eq('id', markId);
      if (res.error) {
        console.error(res.error);
        showToast('Gagal memperbarui status pesan: ' + res.error.message);
        return;
      }
      data.pesan = await fetchPesan();
      renderPesan();
      renderOverview();
      showToast('Status pesan diperbarui.');
    }
    if (delId) {
      if (!await showConfirm('Pesan ini akan dihapus dan tidak bisa dikembalikan.', { title: 'Hapus pesan ini?' })) return;
      var resDel = await supabaseClient.from('pesan').delete().eq('id', delId);
      if (resDel.error) {
        console.error(resDel.error);
        showToast('Gagal menghapus pesan: ' + resDel.error.message);
        return;
      }
      data.pesan = await fetchPesan();
      renderPesan();
      renderOverview();
      showToast('Pesan dihapus.');
    }
  });

  // ---------- Pengaturan (profil, email, password — tersambung ke Supabase Auth) ----------
  var currentUser = sessionRes.data.session.user;
  var settingsForm = document.getElementById('settingsForm');
  var settingsNameInput = document.getElementById('settingsName');
  var settingsEmailInput = document.getElementById('settingsEmail');
  var settingsCurrentPassInput = document.getElementById('settingsCurrentPass');
  var settingsNewPassInput = document.getElementById('settingsNewPass');
  var settingsConfirmPassInput = document.getElementById('settingsConfirmPass');
  var settingsAlert = document.getElementById('settingsAlert');
  var settingsAlertText = document.getElementById('settingsAlertText');
  var settingsSubmitBtn = document.getElementById('settingsSubmitBtn');

  function displayName(user) {
    return (user.user_metadata && user.user_metadata.full_name) || 'Admin CocoFiber';
  }
  function applyIdentityToChrome(user) {
    var name = displayName(user);
    setText('sidebarAdminName', name);
    setText('sidebarAdminEmail', user.email || '');
    setText('topbarUserName', name);
    document.querySelectorAll('.admin-avatar').forEach(function (el) {
      el.textContent = (name.trim().charAt(0) || 'A').toUpperCase();
    });
  }
  function fillSettingsForm(user) {
    settingsNameInput.value = displayName(user);
    settingsEmailInput.value = user.email || '';
  }
  fillSettingsForm(currentUser);
  applyIdentityToChrome(currentUser);

  function showSettingsAlert(msg) {
    settingsAlertText.textContent = msg;
    settingsAlert.classList.add('show');
  }
  function hideSettingsAlert() {
    settingsAlert.classList.remove('show');
  }
  function setSettingsLoading(isLoading) {
    settingsSubmitBtn.classList.toggle('loading', isLoading);
    settingsSubmitBtn.disabled = isLoading;
  }

  settingsForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideSettingsAlert();

    var name = settingsNameInput.value.trim();
    var newEmail = settingsEmailInput.value.trim();
    var currentPass = settingsCurrentPassInput.value;
    var newPass = settingsNewPassInput.value;
    var confirmPass = settingsConfirmPassInput.value;

    var emailChanged = newEmail && newEmail.toLowerCase() !== (currentUser.email || '').toLowerCase();
    var wantsPasswordChange = !!(newPass || confirmPass);

    if (!newEmail) {
      showSettingsAlert('Email tidak boleh kosong.');
      return;
    }

    if (wantsPasswordChange) {
      if (newPass.length < 8) {
        showSettingsAlert('Password baru minimal 8 karakter.');
        return;
      }
      if (newPass !== confirmPass) {
        showSettingsAlert('Konfirmasi password tidak cocok.');
        return;
      }
    }

    // Perubahan email/password adalah aksi sensitif — minta password saat ini
    // untuk memverifikasi ulang identitas sebelum mengubahnya (defense in depth,
    // supaya sesi yang lupa logout di perangkat lain tidak bisa langsung
    // mengambil alih akun hanya dengan mengubah email/password).
    if ((emailChanged || wantsPasswordChange) && !currentPass) {
      showSettingsAlert('Masukkan password saat ini untuk mengubah email atau password.');
      return;
    }

    setSettingsLoading(true);

    if ((emailChanged || wantsPasswordChange) && currentPass) {
      var reauth = await supabaseClient.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPass
      });
      if (reauth.error) {
        showSettingsAlert('Password saat ini salah.');
        setSettingsLoading(false);
        return;
      }
    }

    var payload = { data: { full_name: name } };
    if (emailChanged) payload.email = newEmail;
    if (wantsPasswordChange) payload.password = newPass;

    var result = await supabaseClient.auth.updateUser(payload);

    setSettingsLoading(false);

    if (result.error) {
      showSettingsAlert(result.error.message || 'Gagal menyimpan perubahan.');
      return;
    }

    currentUser = result.data.user || currentUser;
    settingsCurrentPassInput.value = '';
    settingsNewPassInput.value = '';
    settingsConfirmPassInput.value = '';
    applyIdentityToChrome(currentUser);

    if (emailChanged) {
      showToast('Perubahan disimpan. Cek email baru untuk konfirmasi alamat email.');
    } else if (wantsPasswordChange) {
      showToast('Password berhasil diperbarui.');
    } else {
      showToast('Profil berhasil diperbarui.');
    }
  });

  // ---------- Logout ----------
  document.querySelectorAll('[data-action="logout"]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      await supabaseClient.auth.signOut();
      window.location.href = LOGIN_URL;
    });
  });

  // ---------- Search bar (filter produk/artikel, debounced) ----------
  var searchDebounce;
  document.getElementById('topbarSearch').addEventListener('input', function (e) {
    var q = e.target.value.trim().toLowerCase();
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      produkSearchQuery = q;
      artikelSearchQuery = q;
      renderProduk();
      renderArtikel();
    }, 180);
  });

  // ---------- Topbar user menu ----------
  var userMenuBtn = document.getElementById('userMenuBtn');
  var userMenu = document.getElementById('userMenu');
  if (userMenuBtn && userMenu) {
    userMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willShow = !userMenu.classList.contains('show');
      userMenu.classList.toggle('show', willShow);
      userMenuBtn.setAttribute('aria-expanded', String(willShow));
    });
    document.addEventListener('click', function (e) {
      if (!userMenu.contains(e.target) && e.target !== userMenuBtn) {
        userMenu.classList.remove('show');
        userMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
    userMenu.querySelectorAll('[data-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goToSection(btn.getAttribute('data-section'));
        userMenu.classList.remove('show');
      });
    });
  }

  // ---------- Session info + idle auto-logout (security) ----------
  // Kalau admin tidak beraktivitas dalam waktu lama di perangkat bersama,
  // sesi otomatis ditutup untuk mengurangi risiko akses tidak sah.
  var IDLE_LIMIT_MS = 20 * 60 * 1000; // 20 menit
  var idleTimer;
  var sessionPill = document.getElementById('sessionPill');
  if (sessionPill) {
    var loginAt = new Date();
    sessionPill.textContent = 'Masuk pukul ' + loginAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async function () {
      showToast('Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.');
      await supabaseClient.auth.signOut();
      setTimeout(function () { window.location.href = LOGIN_URL; }, 900);
    }, IDLE_LIMIT_MS);
  }
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();

  // ---------- Init ----------
  // Tampilkan skeleton loading dulu supaya dashboard terasa responsif
  // saat menunggu data dari Supabase.
  function skeletonRows(cols, count) {
    var cells = '';
    for (var c = 0; c < cols; c++) cells += '<td><div class="skeleton-bar" style="width:' + (55 + Math.random() * 35) + '%;"></div></td>';
    var out = '';
    for (var i = 0; i < count; i++) out += '<tr class="skeleton-row">' + cells + '</tr>';
    return out;
  }
  produkTableBody.innerHTML = skeletonRows(5, 4);
  artikelTableBody.innerHTML = skeletonRows(4, 4);

  // Pertama-tama sinkronkan data awal yang memang sudah ada di frontend.
  // Hanya record yang belum ada yang dimasukkan ke Supabase.
  await bootstrapFromFrontend();

  // Setelah bootstrap selesai, ambil data terbaru dari Supabase.
  data.produk = await fetchProduk();
  data.artikel = await fetchArtikel();
  data.konten = await fetchKonten();
  data.pesan = await fetchPesan();
  renderAll();
  var initial = window.location.hash.replace('#', '');
  goToSection(sections.indexOf(initial) !== -1 ? initial : 'overview');
})();

// ==========================================================================
// CocoFiber. — Produk dinamis dari Supabase
// Kartu produk STATIS (Coco Fiber, Cocopeat, Cocomesh) di produk.html TIDAK
// disentuh oleh script ini. Script ini hanya MENAMBAHKAN kartu untuk produk
// lain yang ditambahkan lewat Admin Panel dan berstatus "published".
//
// Setelah data produk di Supabase dilengkapi (fitur, quickspecs, dll. untuk
// ketiga produk di atas), kartu statis bisa dihapus dan SKIP_SLUGS di bawah
// dikosongkan supaya semua produk (termasuk yang 3 itu) dirender dari DB.
// ==========================================================================
(function () {
  var SKIP_SLUGS = ['coco-fiber', 'cocopeat', 'cocomesh'];

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Bangun HTML kartu produk versi ringkas (dipakai untuk produk yang belum
  // punya data lengkap fitur/quickspecs/lead time/spesifikasi di Supabase).
  function renderCard(p) {
    var img = p.gambar_url || 'images/gallery-warehouse.webp';
    var waMsg = encodeURIComponent('Halo, saya tertarik dengan produk ' + p.nama + '. Boleh minta info harga terbaru?');

    var quickspecsHtml = '';
    if (p.supply_ability) {
      quickspecsHtml += '<div><span class="qs-label">Supply Ability</span><span class="qs-value">' + escapeHtml(p.supply_ability) + '</span></div>';
    }
    if (p.packaging) {
      quickspecsHtml += '<div><span class="qs-label">Kemasan &amp; Pengiriman</span><span class="qs-value">' + escapeHtml(p.packaging) + '</span></div>';
    }
    if (p.harga) {
      quickspecsHtml += '<div><span class="qs-label">Harga</span><span class="qs-value">' + escapeHtml(p.harga) + '</span></div>';
    }
    if (p.payment_terms) {
      quickspecsHtml += '<div><span class="qs-label">Pembayaran</span><span class="qs-value">' + escapeHtml(p.payment_terms) + '</span></div>';
    }

    return '' +
      '<article class="p-card" id="product-' + escapeHtml(p.slug) + '">' +
        '<div class="p-card-img" role="button" tabindex="0" aria-label="Perbesar gambar ' + escapeHtml(p.nama) + '">' +
          '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.nama) + '" loading="lazy">' +
          '<span class="p-card-img-zoom" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>' +
          '</span>' +
        '</div>' +
        '<div class="p-card-body">' +
          '<p class="p-card-eyebrow">Produk Kami</p>' +
          '<h3>' + escapeHtml(p.nama) + '</h3>' +
          (p.deskripsi ? '<p class="p-card-desc">' + escapeHtml(p.deskripsi) + '</p>' : '') +
          (quickspecsHtml ? '<div class="p-card-quickspecs">' + quickspecsHtml + '</div>' : '') +
          '<div class="p-card-actions">' +
            '<a href="kontak.html" class="btn btn-primary btn-sm">Dapatkan Penawaran</a>' +
            '<a href="https://wa.me/6285257930183?text=' + waMsg + '" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.892.526 3.66 1.437 5.166L2 22l4.958-1.393A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.524 2 12.001 2zm0 18.135c-1.744 0-3.362-.51-4.727-1.386l-.339-.202-3.075.863.85-3.11-.221-.35A8.106 8.106 0 013.865 12c0-4.487 3.649-8.135 8.136-8.135S20.135 7.513 20.135 12 16.488 20.135 12.001 20.135z"/></svg>' +
              'WhatsApp' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  async function loadDynamicProducts() {
    if (typeof supabaseClient === 'undefined') return; // Supabase belum di-load, diamkan saja

    var res = await supabaseClient
      .from('produk')
      .select('*')
      .eq('status', 'published')
      .order('urutan', { ascending: true });

    if (res.error) {
      console.error('Gagal memuat produk dinamis:', res.error);
      return;
    }

    var extra = (res.data || []).filter(function (p) {
      return SKIP_SLUGS.indexOf(p.slug) === -1;
    });
    if (!extra.length) return;

    var track = document.getElementById('productTrack');
    if (!track) return;

    var html = extra.map(renderCard).join('');
    track.insertAdjacentHTML('beforeend', html);

    // Kartu baru butuh event listener lightbox & harus dihitung ulang oleh
    // slider. app.js sudah lebih dulu jalan (dan tidak menemukan kartu ini),
    // jadi kita re-attach secara manual di sini.
    attachLightboxToNewCards(track);
    window.dispatchEvent(new Event('resize')); // memicu updateArrows() di app.js
  }

  function attachLightboxToNewCards(track) {
    var overlay = document.getElementById('imgLightboxOverlay');
    var closeBtn = document.getElementById('imgLightboxClose');
    var lightboxImg = document.getElementById('imgLightboxImg');
    var caption = document.getElementById('imgLightboxCaption');
    if (!overlay || !lightboxImg) return;

    function openLightbox(trigger) {
      var img = trigger.querySelector('img');
      if (!img) return;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || '';
      if (caption) caption.textContent = img.alt || '';
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('img-lightbox-open');
      if (closeBtn) closeBtn.focus();
    }

    // Hanya pasang listener ke trigger yang BELUM punya listener (kartu baru).
    track.querySelectorAll('.p-card-img').forEach(function (trigger) {
      if (trigger.dataset.lightboxBound) return;
      trigger.dataset.lightboxBound = '1';
      trigger.addEventListener('click', function () { openLightbox(trigger); });
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(trigger);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicProducts);
  } else {
    loadDynamicProducts();
  }
})();

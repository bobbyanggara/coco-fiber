// CocoFiber — frontend content from Supabase
(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try { var x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; }
    }
    return [];
  }
  function lang() {
    try { return localStorage.getItem('kreasiasa_lang') || 'id'; } catch (e) { return 'id'; }
  }
  function pick(id, en) { return lang() === 'en' && en ? en : (id || en || ''); }

  function productCard(p) {
    var features = arr(p.fitur);
    var quick = arr(p.quickspecs);
    var lead = arr(p.lead_time);
    var specs = arr(p.spesifikasi);
    var img = p.gambar_url || 'images/gallery-warehouse.webp';
    var wa = encodeURIComponent('Halo, saya tertarik dengan produk ' + p.nama + '. Boleh minta info harga terbaru?');

    if (!quick.length) {
      if (p.supply_ability) quick.push({label:'Supply Ability', value:p.supply_ability});
      if (p.packaging) quick.push({label:'Kemasan & Pengiriman', value:p.packaging});
      if (p.harga) quick.push({label:'Harga', value:p.harga});
      if (p.payment_terms) quick.push({label:'Pembayaran', value:p.payment_terms});
    }

    var featureHtml = features.length ? '<ul class="p-card-features">' + features.map(function (f) {
      var text = typeof f === 'string' ? f : pick(f.id || f.label_id, f.en || f.label_en);
      return '<li><svg class="feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c8-1 13-6 15-15C10 6 5 11 4 20z"/><path d="M8.5 15.5C11 13 13.5 10.5 16 8"/></svg><span>' + esc(text) + '</span></li>';
    }).join('') + '</ul>' : '';

    var quickHtml = quick.length ? '<div class="p-card-quickspecs">' + quick.map(function(q) {
      return '<div><span class="qs-label">' + esc(pick(q.label_id || q.label, q.label_en)) + '</span><span class="qs-value">' + esc(pick(q.value_id || q.value, q.value_en)) + '</span>' +
        (q.sub ? '<small class="qs-sub">' + esc(pick(q.sub_id || q.sub, q.sub_en)) + '</small>' : '') + '</div>';
    }).join('') + '</div>' : '';

    var leadHtml = lead.length ? '<div class="p-card-table-wrap"><p class="p-card-table-title">' + (lang()==='en'?'Lead Time':'Waktu Pengiriman') + '</p><table class="p-card-table"><tr><th>' + (lang()==='en'?'Quantity':'Jumlah') + '</th><th>' + (lang()==='en'?'Est. Time':'Estimasi') + '</th></tr>' +
      lead.map(function(x){return '<tr><td>'+esc(pick(x.qty_id||x.qty, x.qty_en))+'</td><td>'+esc(pick(x.waktu_id||x.waktu, x.waktu_en))+'</td></tr>';}).join('') + '</table></div>' : '';

    var specHtml = specs.length ? '<div class="p-card-table-wrap"><p class="p-card-table-title">' + (lang()==='en'?'Specification':'Spesifikasi') + '</p><table class="p-card-table p-card-table-spec">' +
      specs.map(function(x){return '<tr><td>'+esc(pick(x.label_id, x.label_en || x.label))+'</td><td>'+esc(pick(x.value_id || x.value, x.value_en))+'</td></tr>';}).join('') + '</table></div>' : '';

    return '<article class="p-card" id="product-' + esc(p.slug) + '">' +
      '<div class="p-card-img dynamic-lightbox" role="button" tabindex="0" aria-label="' + esc(lang()==='en'?'Enlarge image of ':'Perbesar gambar ') + esc(pick(p.nama,p.nama_en)) + '">' +
        '<img src="' + esc(img) + '" alt="' + esc(pick(p.nama,p.nama_en)) + '" loading="lazy"><span class="p-card-img-zoom" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg></span>' +
      '</div><div class="p-card-body"><p class="p-card-eyebrow">' + (lang()==='en'?'Our Products':'Produk Kami') + '</p>' +
      '<h3>' + esc(pick(p.nama,p.nama_en)) + '</h3>' +
      (p.deskripsi || p.deskripsi_en ? '<p class="p-card-desc">' + esc(pick(p.deskripsi,p.deskripsi_en)) + '</p>' : '') +
      featureHtml + quickHtml +
      '<div class="p-card-actions"><a href="kontak.html" class="btn btn-primary btn-sm">' + (lang()==='en'?'Get Quotation':'Dapatkan Penawaran') + '</a>' +
      '<a href="https://wa.me/6285257930183?text=' + wa + '" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">WhatsApp</a></div>' +
      (leadHtml || specHtml ? '<div class="p-card-details">' + leadHtml + specHtml + '</div>' : '') +
      '</div></article>';
  }

  function articleCard(a) {
    var title = pick(a.judul, a.judul_en);
    var summary = pick(a.ringkasan, a.ringkasan_en);
    var img = a.gambar_url || 'images/gallery-coco-fiber.webp';
    return '<article class="art-card"><a class="art-thumb" href="artikel.html?slug=' + encodeURIComponent(a.slug) + '">' +
      '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy"></a>' +
      '<p class="art-tag">' + esc(a.kategori || (lang()==='en'?'Article':'Artikel')) + '</p>' +
      '<h3>' + esc(title) + '</h3>' +
      (summary ? '<p class="art-teaser">' + esc(summary) + '</p>' : '') +
      '<a class="art-more" href="artikel.html?slug=' + encodeURIComponent(a.slug) + '"><span>' + (lang()==='en'?'Read More':'Baca Selengkapnya') + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></a></article>';
  }

  async function getProducts() {
    var r = await supabaseClient.from('produk').select('*').eq('status','published').order('urutan',{ascending:true});
    if (r.error) { console.error(r.error); return []; }
    return r.data || [];
  }
  async function getArticles(limit) {
    var q = supabaseClient.from('artikel').select('*').eq('status','published').order('tanggal',{ascending:false});
    if (limit) q = q.limit(limit);
    var r = await q;
    if (r.error) { console.error(r.error); return []; }
    return r.data || [];
  }

  async function render() {
    if (typeof supabaseClient === 'undefined') return;
    var productTrack = document.getElementById('productTrack');
    var articleGrids = document.querySelectorAll('.article-grid');
    var needProducts = !!productTrack;
    var needArticles = articleGrids.length > 0;
    if (!needProducts && !needArticles) return;

    if (needProducts) {
      var products = await getProducts();
      productTrack.innerHTML = products.length ? products.map(productCard).join('') :
        '<div class="empty-state">Belum ada produk yang tayang.</div>';
      bindLightbox();
      window.dispatchEvent(new Event('resize'));
    }
    if (needArticles) {
      var limit = document.body.classList.contains('all-articles-page') ? null : 3;
      var articles = await getArticles(limit);
      articleGrids.forEach(function(grid) {
        grid.innerHTML = articles.length ? articles.map(articleCard).join('') :
          '<div class="empty-state">Belum ada artikel yang tayang.</div>';
      });
      // app.js binds article cards before this async render; bind navigation here too.
      document.querySelectorAll('.art-card').forEach(function(card) {
        if (card.dataset.dynamicBound) return;
        card.dataset.dynamicBound = '1';
        card.addEventListener('click', function(e) {
          if (e.target.closest('a')) return;
          var link = card.querySelector('.art-more');
          if (link) window.location.href = link.href;
        });
      });
    }
  }

  function bindLightbox() {
    var overlay = document.getElementById('imgLightboxOverlay');
    var image = document.getElementById('imgLightboxImg');
    var close = document.getElementById('imgLightboxClose');
    if (!overlay || !image) return;
    document.querySelectorAll('.dynamic-lightbox').forEach(function(t) {
      if (t.dataset.bound) return;
      t.dataset.bound = '1';
      function open() {
        var img=t.querySelector('img'); if(!img) return;
        image.src=img.currentSrc||img.src; image.alt=img.alt||'';
        var cap=document.getElementById('imgLightboxCaption'); if(cap) cap.textContent=img.alt||'';
        overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden','false');
      }
      t.addEventListener('click',open);
      t.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
    if (close && !close.dataset.dynamicBound) {
      close.dataset.dynamicBound='1';
      close.addEventListener('click',function(){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');});
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
  var ls = document.getElementById('langSwitch');
  if (ls) ls.addEventListener('click', function(){ setTimeout(render, 20); });
})();

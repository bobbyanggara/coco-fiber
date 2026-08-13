// CocoFiber CMS — applies editable frontend content from Supabase.
(function () {
  'use strict';
  function currentLang(){ try { return localStorage.getItem('kreasiasa_lang') || 'id'; } catch(e){ return 'id'; } }
  function apply(rows){
    var lang=currentLang(), map={};
    (rows||[]).forEach(function(r){ map[r.key]=r; });
    document.querySelectorAll('[data-cms-key]').forEach(function(el){
      var r=map[el.getAttribute('data-cms-key')];
      // Jika record CMS belum ada / Supabase sedang gagal, pertahankan
      // konten statis asli dari HTML. Jangan menyembunyikannya.
      if(!r) return;
      el.style.display = '';
      var val=lang==='en' && r.value_en ? r.value_en : (r.value_id || r.value_en || '');
      if(r.content_type==='html') el.innerHTML=val; else el.textContent=val;
    });
    document.querySelectorAll('[data-cms-key-placeholder],[data-cms-key-title],[data-cms-key-aria-label]').forEach(function(el){
      var key=el.getAttribute('data-cms-key-placeholder')||el.getAttribute('data-cms-key-title')||el.getAttribute('data-cms-key-aria-label');
      var r=map[key];
      // Record tidak ada berarti gunakan attribute bawaan HTML.
      if(!r) return;
      el.style.display='';
      var val=lang==='en'&&r.value_en?r.value_en:(r.value_id||r.value_en||'');
      if(r.attribute_name) el.setAttribute(r.attribute_name,val);
    });
  }
  // Deteksi nama halaman dari URL, tahan terhadap Vercel "cleanUrls"
  // (mis. /produk atau /produk.html sama-sama harus dikenali sebagai 'produk.html',
  // sesuai nilai kolom `page` yang tersimpan di tabel site_content).
  function pageKey(){
    var path = location.pathname.replace(/\/+$/,''); // buang trailing slash
    var last = path.split('/').pop();
    if(!last) return 'index.html';
    if(!/\.[a-z0-9]+$/i.test(last)) last += '.html'; // tidak ada ekstensi -> tambahkan .html
    return last;
  }
  async function load(){
    if(typeof supabaseClient==='undefined') return;
    var page=pageKey();
    var r=await supabaseClient.from('site_content').select('*').eq('page',page).eq('status','published').order('sort_order',{ascending:true});
    if(!r.error) {
      apply(r.data||[]);
    } else {
      console.warn('CMS Supabase tidak tersedia; konten statis HTML dipertahankan.', r.error);
    }
  }
  window.cocoFiberCMS={reload:load};
  document.addEventListener('DOMContentLoaded',load);
  if(document.readyState!=='loading') load();
  var ls=document.getElementById('langSwitch');
  if(ls) ls.addEventListener('click',function(){setTimeout(load,30);});
})();

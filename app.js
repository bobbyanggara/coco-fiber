// CV Kreasi Asa Indonesia: site scripts

// Safety net: some mobile in-app browsers (e.g. WhatsApp's WebView) can
// briefly report a wider layout viewport before the first paint settles,
// which visually shifts the page horizontally until the user scrolls.
// Forcing horizontal scroll back to 0 on load/resize prevents that.
(function preventHorizontalShift() {
   function resetX() {
      if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
   }
   resetX();
   window.addEventListener('load', resetX);
   window.addEventListener('resize', resetX);
})();

// Mobile menu toggle
try {
   const mobileMenu = document.getElementById('mobileMenu');
   const navLinks = document.getElementById('navLinks');

   if (mobileMenu && navLinks) {
      mobileMenu.addEventListener('click', () => {
         const isOpen = navLinks.classList.toggle('active');
         mobileMenu.classList.toggle('active', isOpen);
         mobileMenu.setAttribute('aria-expanded', String(isOpen));
      });

      // Close mobile menu after tapping a link
      navLinks.querySelectorAll('a').forEach(link => {
         link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileMenu.setAttribute('aria-expanded', 'false');
         });
      });
   }
} catch (err) { /* keep the rest of the page working even if this fails */ }

// Smooth scroll for in-page anchors
try {
   document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
         const target = document.querySelector(this.getAttribute('href'));
         if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }
      });
   });
} catch (err) { /* ignore */ }

// Nav active state is static per page (set via class="active" in the HTML,
// e.g. "Beranda" on index.html, "Artikel" on semua-artikel.html) and no
// longer tracks scroll position — Home stays highlighted the whole time
// you're on the homepage, even after scrolling past other sections.

// Scroll-triggered fade-ins + counters
try {
   var animateCounter = function animateCounter(el) {
      if (el.dataset.done) return;
      el.dataset.done = 'true';

      const target = parseInt(el.getAttribute('data-count'), 10);
      const duration = 900;
      const start = performance.now();

      function tick(now) {
         const progress = Math.min((now - start) / duration, 1);
         el.textContent = Math.floor(progress * target);
         if (progress < 1) {
            requestAnimationFrame(tick);
         } else {
            el.textContent = target;
         }
      }
      requestAnimationFrame(tick);
   };

   // Default upward fade for most content blocks across the page.
   const upTargets = document.querySelectorAll(
      '.section-head, .p-card, .about-stats, .a-stat, .art-card, .t-card, ' +
      '.contact-info, .contact-form, .export-strip, .quote-cta-strip, ' +
      '.footer-brand, .footer-links, .footer-contact-list'
   );
   upTargets.forEach(el => el.classList.add('fade-in'));

   // Directional variants for a livelier, less uniform reveal.
   const leftTargets = document.querySelectorAll('.about-visual');
   leftTargets.forEach(el => el.classList.add('fade-in', 'fade-in-left'));

   const rightTargets = document.querySelectorAll('.about-text');
   rightTargets.forEach(el => el.classList.add('fade-in', 'fade-in-right'));

   const scaleTargets = document.querySelectorAll('.quote-cta');
   scaleTargets.forEach(el => el.classList.add('fade-in', 'fade-in-scale'));

   const revealTargets = document.querySelectorAll('.fade-in');

   const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
         if (entry.isIntersecting) {
            setTimeout(() => {
               entry.target.classList.add('animate');
               const counter = entry.target.querySelector('.counter');
               if (counter) animateCounter(counter);
            }, i * 80);
            observer.unobserve(entry.target);
         }
      });
   }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

   revealTargets.forEach(el => observer.observe(el));
} catch (err) {
   // If IntersectionObserver or anything above isn't supported, just make
   // sure content isn't stuck invisible (fade-in starts at opacity:0).
   document.querySelectorAll('.fade-in').forEach(el => el.classList.add('animate'));
}


// ---------- Safe localStorage wrapper ----------
// Some mobile browsers/WebViews (Safari Private Browsing, in-app browsers
// like WhatsApp/Instagram, strict cookie settings, etc.) throw when
// localStorage is accessed. An uncaught throw here would silently stop every
// script below it from running at all — including the product dropdown,
// FAQ accordion, and search — even though everything works fine on desktop.
// Wrapping every access keeps the rest of the page functional either way.
const safeStorage = {
   get(key) {
      try { return localStorage.getItem(key); } catch (err) { return null; }
   },
   set(key, value) {
      try { localStorage.setItem(key, value); } catch (err) { /* ignore */ }
   }
};

// ---------- Language switch (ID / EN) ----------
let langSwitch = null;
let currentLang = 'id';
let submitLabels = {
   idle: { id: 'Kirim via WhatsApp', en: 'Send via WhatsApp' },
   sending: { id: 'Membuka WhatsApp...', en: 'Opening WhatsApp...' },
   sent: { id: 'Terkirim ✓', en: 'Sent ✓' }
};
let applyLanguage = function applyLanguage() { /* replaced below if init succeeds */ };

try {
   langSwitch = document.getElementById('langSwitch');
   currentLang = safeStorage.get('kreasiasa_lang') || 'id';

   applyLanguage = function applyLanguage(lang) {
      currentLang = lang;
      document.documentElement.lang = lang;
      safeStorage.set('kreasiasa_lang', lang);

      if (langSwitch) {
         langSwitch.setAttribute('data-lang', lang);
         const nextLang = lang === 'id' ? 'en' : 'id';
         const nextLabel = nextLang === 'en' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia';
         langSwitch.setAttribute('aria-label', nextLabel);
         langSwitch.setAttribute('title', nextLabel);
      }

      // Plain text / HTML swap
      document.querySelectorAll('[data-en]').forEach(el => {
         if (!el.dataset.idStore) {
            el.dataset.idStore = el.classList.contains('i18n-html') ? el.innerHTML : el.textContent;
         }
         if (el.classList.contains('i18n-html')) {
            el.innerHTML = lang === 'en' ? el.getAttribute('data-en') : el.dataset.idStore;
         } else {
            el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.dataset.idStore;
         }
      });

      // Placeholder swap
      document.querySelectorAll('[data-en-placeholder]').forEach(el => {
         if (!el.dataset.idPlaceholder) {
            el.dataset.idPlaceholder = el.getAttribute('placeholder');
         }
         el.setAttribute('placeholder', lang === 'en' ? el.getAttribute('data-en-placeholder') : el.dataset.idPlaceholder);
      });

      // aria-label swap
      document.querySelectorAll('[data-en-aria]').forEach(el => {
         if (!el.dataset.idAria) {
            el.dataset.idAria = el.getAttribute('aria-label') || '';
         }
         el.setAttribute('aria-label', lang === 'en' ? el.getAttribute('data-en-aria') : el.dataset.idAria);
      });

      // title swap
      document.querySelectorAll('[data-en-title]').forEach(el => {
         if (!el.dataset.idTitle) {
            el.dataset.idTitle = el.getAttribute('title') || '';
         }
         el.setAttribute('title', lang === 'en' ? el.getAttribute('data-en-title') : el.dataset.idTitle);
      });

      // Reset submit button label to current idle state in the right language
      const submitBtn = document.querySelector('.contact-form .btn');
      if (submitBtn && !submitBtn.disabled) {
         submitBtn.textContent = submitLabels.idle[lang];
      }
   };

   if (langSwitch) {
      langSwitch.addEventListener('click', () => {
         const nextLang = langSwitch.getAttribute('data-lang') === 'id' ? 'en' : 'id';
         applyLanguage(nextLang);
      });
   }

   document.addEventListener('DOMContentLoaded', () => applyLanguage(currentLang));
} catch (err) { /* keep the rest of the page working even if this fails */ }

// ---------- Rotating hero headline ----------
try {
   (function initHeroRotator() {
      const rotator = document.getElementById('heroRotator');
      if (!rotator) return;
      const items = Array.from(rotator.querySelectorAll('.hero-rotator-item'));
      if (items.length < 2) return;

      let index = items.findIndex(el => el.classList.contains('is-active'));
      if (index === -1) index = 0;

      setInterval(() => {
         const current = items[index];
         index = (index + 1) % items.length;
         const next = items[index];

         current.classList.remove('is-active');
         next.classList.add('is-active');
      }, 3000);
   })();
} catch (err) { /* ignore */ }

// Get Quote CTA -> smooth-scrolls to #kontak (handled above) and then
// auto-focuses the first contact form field for a more direct "jump to form" feel.
try {
   const quoteCtaBtn = document.querySelector('.quote-cta-btn');
   const cfNameInput = document.getElementById('cfName');
   if (quoteCtaBtn && cfNameInput) {
      quoteCtaBtn.addEventListener('click', () => {
         setTimeout(() => cfNameInput.focus({ preventScroll: true }), 650);
      });
   }
} catch (err) { /* ignore */ }

// Contact form submission — builds a WhatsApp message from the form fields
// and opens it in the WhatsApp API (wa.me) so it's ready to send to our team.
try {
   const contactForm = document.getElementById('contactForm');
   const WHATSAPP_NUMBER = '6285257930183'; // no "+", no leading zero

   const waMessageTemplates = {
      id: (name, contact, subject, message) =>
         `Halo, saya ingin menghubungi CocoFiber.\n\n` +
         `*Nama:* ${name}\n` +
         `*Kontak:* ${contact}\n` +
         `*Subjek:* ${subject}\n` +
         `*Pesan:*\n${message}`,
      en: (name, contact, subject, message) =>
         `Hello, I'd like to get in touch with CocoFiber.\n\n` +
         `*Name:* ${name}\n` +
         `*Contact:* ${contact}\n` +
         `*Subject:* ${subject}\n` +
         `*Message:*\n${message}`
   };

   if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
         e.preventDefault();
         const btn = contactForm.querySelector('.btn');

         const name = contactForm.querySelector('#cfName').value.trim();
         const contact = contactForm.querySelector('#cfContact').value.trim();
         const subjectSelect = contactForm.querySelector('#cfSubject');
         const subject = subjectSelect.options[subjectSelect.selectedIndex]
            ? subjectSelect.options[subjectSelect.selectedIndex].text
            : subjectSelect.value;
         const message = contactForm.querySelector('#cfMessage').value.trim();

         if (!name || !contact || !subjectSelect.value || !message) {
            contactForm.reportValidity();
            return;
         }

         const buildMessage = waMessageTemplates[currentLang] || waMessageTemplates.id;
         const waText = buildMessage(name, contact, subject, message);
         const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

         btn.textContent = submitLabels.sending[currentLang];
         btn.disabled = true;

         window.open(waUrl, '_blank', 'noopener');

         setTimeout(() => {
            btn.textContent = submitLabels.sent[currentLang];
            setTimeout(() => {
               btn.textContent = submitLabels.idle[currentLang];
               btn.disabled = false;
               contactForm.reset();
            }, 2200);
         }, 500);
      });
   }
} catch (err) { /* ignore */ }

// Product carousel: left/right arrows scroll the track by one card width,
// and disable themselves at the start/end of the scroll range.
(function initProductSlider() {
   const track = document.getElementById('productTrack');
   const prevBtn = document.getElementById('productPrev');
   const nextBtn = document.getElementById('productNext');
   if (!track || !prevBtn || !nextBtn) return;

   function scrollAmount() {
      const card = track.querySelector('.p-card');
      if (!card) return track.clientWidth * 0.9;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return card.getBoundingClientRect().width + gap;
   }

   function updateArrows() {
      const maxScroll = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
   }

   prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
   });
   nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
   });

   track.addEventListener('scroll', () => {
      window.requestAnimationFrame(updateArrows);
   }, { passive: true });
   window.addEventListener('resize', updateArrows);
   updateArrows();

   // Once the user has swiped the row themselves, the hint has done its job — hide it.
   const swipeHint = document.querySelector('.product-swipe-hint');
   if (swipeHint) {
      track.addEventListener('scroll', () => {
         swipeHint.style.opacity = '0';
         swipeHint.style.pointerEvents = 'none';
      }, { once: true, passive: true });
   }
})();

// Mobile only: product cards stack vertically and only the first one shows
// by default. Tapping "Lihat Produk Selengkapnya" reveals the rest in place.
(function initProductShowMore() {
   const btn = document.getElementById('productShowMore');
   const track = document.getElementById('productTrack');
   if (!btn || !track) return;

   const revealAll = () => {
      track.querySelectorAll('.p-card.is-hidden-mobile').forEach(card => {
         card.classList.remove('is-hidden-mobile');
      });
      btn.setAttribute('aria-expanded', 'true');
      btn.style.display = 'none';
   };

   btn.addEventListener('click', revealAll);

   // If arriving via a direct link to a specific product card (e.g. footer link
   // to #product-cocopeat), reveal all cards first so the target isn't hidden,
   // then scroll to it.
   if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target && target.classList.contains('p-card')) {
         revealAll();
         requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
         });
      }
   }
})();

// Product image lightbox: click (or Enter/Space) a product photo to view it enlarged.
(function initProductImageLightbox() {
   const triggers = document.querySelectorAll('.p-card-img');
   const overlay = document.getElementById('imgLightboxOverlay');
   const closeBtn = document.getElementById('imgLightboxClose');
   const lightboxImg = document.getElementById('imgLightboxImg');
   const caption = document.getElementById('imgLightboxCaption');
   if (!triggers.length || !overlay || !lightboxImg) return;

   let lastFocused = null;

   function openLightbox(trigger) {
      const img = trigger.querySelector('img');
      if (!img) return;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || '';
      if (caption) caption.textContent = img.alt || '';
      lastFocused = trigger;

      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('img-lightbox-open');
      if (closeBtn) closeBtn.focus();
   }

   function closeLightbox() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('img-lightbox-open');
      if (lastFocused) lastFocused.focus();
   }

   triggers.forEach(trigger => {
      trigger.addEventListener('click', () => openLightbox(trigger));
      trigger.addEventListener('keydown', (e) => {
         if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(trigger);
         }
      });
   });

   if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

   // Click on the dark backdrop (but not the image itself) closes the lightbox
   overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
   });

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
   });
})();

// FAQ accordion (article pages)
(function initFaqAccordion() {
   const items = document.querySelectorAll('.faq-item');
   if (!items.length) return;

   items.forEach(item => {
      const trigger = item.querySelector('.faq-trigger');
      if (!trigger) return;

      trigger.addEventListener('click', () => {
         const isOpen = item.classList.toggle('is-open');
         trigger.setAttribute('aria-expanded', String(isOpen));
      });
   });
})();

// Floating contact button (WhatsApp / Email chooser)
(function initFabContact() {
   const fab = document.getElementById('fabContact');
   const fabMain = document.getElementById('fabMain');
   if (!fab || !fabMain) return;

   function closeFab() {
      fab.classList.remove('open');
      fabMain.setAttribute('aria-expanded', 'false');
   }

   fabMain.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = fab.classList.toggle('open');
      fabMain.setAttribute('aria-expanded', String(isOpen));
   });

   document.addEventListener('click', (e) => {
      if (!fab.contains(e.target)) closeFab();
   });

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFab();
   });

   fab.querySelectorAll('.fab-option').forEach(opt => {
      opt.addEventListener('click', closeFab);
   });
})();

// ---------- Scroll progress bar ----------
(function initScrollProgress() {
   const bar = document.getElementById('scrollProgress');
   if (!bar) return;

   function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
   }

   window.addEventListener('scroll', update, { passive: true });
   window.addEventListener('resize', update);
   update();
})();

// ---------- Navbar "scrolled" state ----------
(function initNavbarScroll() {
   const navbar = document.querySelector('.navbar');
   if (!navbar) return;

   function update() {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
   }

   window.addEventListener('scroll', update, { passive: true });
   update();
})();

// ---------- Parallax scroll effects ----------
// Depth-layered movement across sections: hero background/content move at
// different speeds, and key image blocks drift gently as they cross the
// viewport. Fully skipped for prefers-reduced-motion.
(function initParallax() {
   const heroBg = document.getElementById('heroBg');
   const heroInner = document.getElementById('heroInner');

   const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (reduceMotion) return;

   // Collect floating layers: { el, strength }. Positive strength drifts
   // with scroll direction, negative drifts against it (creates separation
   // between overlapping elements like the about photo + its floating badge).
   const floaters = [];
   function addFloaters(selector, baseStrength, alternate) {
      document.querySelectorAll(selector).forEach((el, i) => {
         const strength = alternate ? (i % 2 === 0 ? baseStrength : -baseStrength) : baseStrength;
         floaters.push({ el, strength });
      });
   }
   addFloaters('.about-visual-frame', 0.05, false);
   addFloaters('.about-visual-badge', -0.09, false);
   addFloaters('.art-thumb', 0.05, true);
   addFloaters('.p-card-img', 0.035, true);

   // Lighter movement on narrow viewports keeps things calm on mobile
   const isNarrow = window.innerWidth < 640;
   const heroBgFactor = isNarrow ? 0.16 : 0.28;
   const heroInnerFactor = isNarrow ? 0.06 : 0.12;
   const floatCap = isNarrow ? 14 : 26;

   let viewportH = window.innerHeight;
   let ticking = false;

   function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

   function update() {
      const scrollY = window.scrollY;

      if (heroBg) {
         heroBg.style.transform = `translate3d(0, ${scrollY * heroBgFactor}px, 0)`;
      }
      if (heroInner) {
         const fade = clamp(1 - scrollY / (viewportH * 0.85), 0, 1);
         heroInner.style.transform = `translate3d(0, ${scrollY * heroInnerFactor}px, 0)`;
         heroInner.style.opacity = fade;
      }

      floaters.forEach(({ el, strength }) => {
         const rect = el.getBoundingClientRect();
         if (rect.bottom < -150 || rect.top > viewportH + 150) return; // skip offscreen
         const centerOffset = (rect.top + rect.height / 2) - viewportH / 2;
         const move = clamp(centerOffset * strength, -floatCap, floatCap);
         el.style.transform = `translate3d(0, ${move}px, 0)`;
      });

      ticking = false;
   }

   window.addEventListener('scroll', () => {
      if (!ticking) {
         requestAnimationFrame(update);
         ticking = true;
      }
   }, { passive: true });

   window.addEventListener('resize', () => {
      viewportH = window.innerHeight;
      update();
   });

   update();
})();

// ---------- AI Chat Widget ----------
(function initAiChat() {
   const openBtn = document.getElementById('fabAiOpen');
   const chatWindow = document.getElementById('aiChatWindow');
   const closeBtn = document.getElementById('aiChatClose');
   const chatBody = document.getElementById('aiChatBody');
   const chatForm = document.getElementById('aiChatForm');
   const chatInput = document.getElementById('aiChatInput');
   const sendBtn = document.getElementById('aiChatSend');
   const suggestions = document.getElementById('aiChatSuggestions');
   const fab = document.getElementById('fabContact');

   if (!openBtn || !chatWindow || !chatForm) return;

   const history = []; // { role: 'user' | 'assistant', content: string }

   function getLang() {
      return document.documentElement.lang === 'en' ? 'en' : 'id';
   }

   function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
   }

   function addMessage(role, text) {
      const msg = document.createElement('div');
      msg.className = role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-bot';
      msg.textContent = text;
      chatBody.appendChild(msg);
      scrollToBottom();
      return msg;
   }

   function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'ai-msg-typing';
      typing.id = 'aiTypingIndicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      chatBody.appendChild(typing);
      scrollToBottom();
   }

   function hideTyping() {
      const typing = document.getElementById('aiTypingIndicator');
      if (typing) typing.remove();
   }

   async function sendMessage(text) {
      if (!text.trim()) return;

      // Hide suggestion chips after first message
      if (suggestions) suggestions.style.display = 'none';

      addMessage('user', text);
      history.push({ role: 'user', content: text });

      chatInput.value = '';
      sendBtn.disabled = true;
      showTyping();

      try {
         const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
         });

         const data = await res.json();
         hideTyping();

         if (!res.ok) {
            throw new Error(data.error || 'Request failed');
         }

         addMessage('assistant', data.reply);
         history.push({ role: 'assistant', content: data.reply });
      } catch (err) {
         hideTyping();
         const lang = getLang();
         const errorMsg = lang === 'en'
            ? "Sorry, I'm having trouble connecting right now. Please contact us via WhatsApp."
            : 'Maaf, sedang ada gangguan koneksi. Silakan hubungi kami lewat WhatsApp.';
         addMessage('assistant', errorMsg);
      } finally {
         sendBtn.disabled = false;
         chatInput.focus();
      }
   }

   function openChat() {
      chatWindow.classList.add('open');
      if (fab) fab.classList.remove('open');
      chatInput.focus();
   }

   function closeChat() {
      chatWindow.classList.remove('open');
   }

   openBtn.addEventListener('click', openChat);
   if (closeBtn) closeBtn.addEventListener('click', closeChat);

   chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(chatInput.value);
   });

   if (suggestions) {
      suggestions.querySelectorAll('.ai-suggestion-chip').forEach((chip) => {
         chip.addEventListener('click', () => {
            const lang = getLang();
            const question = lang === 'en' ? chip.dataset.qEn : chip.dataset.qId;
            sendMessage(question || chip.textContent);
         });
      });
   }

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatWindow.classList.contains('open')) closeChat();
   });
})();

// ---------- Site Search ----------
(function initSiteSearch() {
   const trigger = document.getElementById('searchTrigger');
   const overlay = document.getElementById('searchOverlay');
   if (!trigger || !overlay) return;

   const input = document.getElementById('searchInput');
   const resultsBox = document.getElementById('searchResults');
   const closeBtn = document.getElementById('searchClose');
   const hintEl = document.getElementById('searchHint');

   // The top-bar search icon is a desktop-only shortcut (mobile users get the
   // search entry inside the hamburger menu instead). CSS already hides it by
   // default and only shows it at desktop widths, so this just keeps it out
   // of the tab order / accessibility tree on mobile. Wrapped in try/catch so
   // that on any browser without matchMedia listener support, this never
   // throws and breaks the rest of the script.
   try {
      const mobileNavQuery = window.matchMedia('(min-width:860px)');
      function syncTriggerAvailability(e) {
         const isDesktop = e.matches;
         trigger.toggleAttribute('hidden', !isDesktop);
         trigger.setAttribute('tabindex', isDesktop ? '0' : '-1');
         trigger.setAttribute('aria-hidden', String(!isDesktop));
      }
      syncTriggerAvailability(mobileNavQuery);
      if (typeof mobileNavQuery.addEventListener === 'function') {
         mobileNavQuery.addEventListener('change', syncTriggerAvailability);
      } else if (typeof mobileNavQuery.addListener === 'function') {
         // Safari <14 / older WebViews only support the legacy API.
         mobileNavQuery.addListener(syncTriggerAvailability);
      }
   } catch (err) {
      // If matchMedia isn't available at all, CSS alone still handles
      // showing/hiding the button correctly — just skip this enhancement.
   }

   // Tentang, Produk, and Kontak each now live on their own standalone page,
   // so search results link straight there instead of to a homepage anchor.
   // Only "home", "artikel", and "testimoni" still resolve to a section on
   // another page (index.html / semua-artikel.html).
   const dedicatedPages = { tentang: 'tentang.html', produk: 'produk.html', kontak: 'kontak.html' };

   function hrefFor(anchor) {
      if (dedicatedPages[anchor]) return dedicatedPages[anchor];
      if (anchor === 'testimoni') return 'tentang.html#testimoni';
      if (anchor === 'artikel') return 'index.html#artikel';
      return 'index.html#home';
   }

   function getLang() {
      return document.documentElement.lang === 'en' ? 'en' : 'id';
   }

   // Static search index: each entry has bilingual title/desc, a target
   // anchor id on the homepage, and an icon key. Kept in sync by hand with
   // the sections in index.html (products, about, articles, testimonials,
   // gallery, contact).
   const iconPaths = {
      product: '<path d="M20 7L12 3 4 7l8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
      leaf: '<path d="M4 20c8-1 13-6 15-15C10 6 5 11 4 20z"/><path d="M8.5 15.5C11 13 13.5 10.5 16 8"/>',
      article: '<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      building: '<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>',
      star: '<path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.7z"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-9 9"/>',
      mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
      badge: '<path d="M9 2h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a2 2 0 0 1 2-2z"/><path d="M9 12h6M9 16h6M9 8h2"/>'
   };

   const searchIndex = [
      {
         anchor: 'produk', icon: 'product', group: { id: 'Produk', en: 'Products' },
         title: { id: 'Coco Fiber', en: 'Coco Fiber' },
         desc: {
            id: 'Coco fiber kualitas ekspor, kemasan bal, untuk industri dan pertanian.',
            en: 'Export-quality coco fiber, baled packaging, for industry and agriculture.'
         },
         keywords: 'coco fiber sabut kelapa serat matras jok mobil geotekstil bal 300 ton export coir'
      },
      {
         anchor: 'produk', icon: 'leaf', group: { id: 'Produk', en: 'Products' },
         title: { id: 'Cocopeat', en: 'Cocopeat' },
         desc: {
            id: 'Media tanam organik dari sabut kelapa, washed & unwashed, low/high EC.',
            en: 'Organic growing medium from coconut husk, washed & unwashed, low/high EC.'
         },
         keywords: 'cocopeat media tanam hidroponik pembibitan block 5kg low ec high ec washed unwashed'
      },
      {
         anchor: 'produk', icon: 'building', group: { id: 'Produk', en: 'Products' },
         title: { id: 'Produk Turunan: Cocomesh, Cocopot, Cocodisc', en: 'Derivative Products: Cocomesh, Coco Pot, Coco Disc' },
         desc: {
            id: 'Cocomesh untuk reklamasi lahan, cocopot & cocodisc untuk pembibitan.',
            en: 'Cocomesh for land reclamation, coco pot & coco disc for seedling nurseries.'
         },
         keywords: 'cocomesh cocopot cocodisc reklamasi lahan erosi pembibitan custom roll mesh'
      },
      {
         anchor: 'tentang', icon: 'badge', group: { id: 'Tentang', en: 'About' },
         title: { id: 'Tentang Kami', en: 'About Us' },
         desc: {
            id: 'Dari petani lokal ke buyer dunia, kapasitas ±100 ton/bulan, FOB/CIF.',
            en: 'From local farmers to global buyers, ±100 tons/month capacity, FOB/CIF.'
         },
         keywords: 'tentang perusahaan profil sidoarjo jawa timur kapasitas fob cif waktu produksi'
      },
      {
         anchor: 'artikel', icon: 'article', group: { id: 'Artikel', en: 'Articles' },
         title: { id: 'Manfaat Coco Fiber untuk Industri', en: 'Coco Fiber for Industry' },
         desc: {
            id: 'Matras, jok mobil, hingga geotekstil penahan erosi.',
            en: 'Mattresses, automotive seats, and erosion-control geotextiles.'
         },
         keywords: 'artikel coco fiber industri matras jok mobil geotekstil manufaktur'
      },
      {
         anchor: 'artikel', icon: 'article', group: { id: 'Artikel', en: 'Articles' },
         title: { id: 'Cocopeat sebagai Media Tanam', en: 'Cocopeat as a Growing Medium' },
         desc: {
            id: 'Alasan petani dan pekebun hidroponik memilih cocopeat.',
            en: 'Why farmers and hydroponic growers choose cocopeat.'
         },
         keywords: 'artikel cocopeat media tanam hidroponik petani pekebun'
      },
      {
         anchor: 'artikel', icon: 'article', group: { id: 'Artikel', en: 'Articles' },
         title: { id: 'Cocomesh untuk Reklamasi Lahan', en: 'Cocomesh for Land Reclamation' },
         desc: {
            id: 'Solusi alami pengendali erosi untuk lahan bekas tambang.',
            en: 'A natural erosion-control solution for reclaimed mining land.'
         },
         keywords: 'artikel cocomesh reklamasi lahan erosi tambang solusi alami'
      },
      {
         anchor: 'testimoni', icon: 'star', group: { id: 'Testimoni', en: 'Testimonials' },
         title: { id: 'Testimoni Pelanggan', en: 'Customer Testimonials' },
         desc: {
            id: 'Kata pengrajin furniture, pemilik nursery, dan reseller pertanian.',
            en: 'From a furniture craftsman, a nursery owner, and an agriculture reseller.'
         },
         keywords: 'testimoni pelanggan ulasan review ahmad fauzi budi santoso dewi lestari'
      },
      {
         anchor: 'kontak', icon: 'mail', group: { id: 'Kontak', en: 'Contact' },
         title: { id: 'Dapatkan Penawaran Anda', en: 'Get Your Offer' },
         desc: {
            id: 'Hubungi kami lewat WhatsApp, email, atau form kontak.',
            en: 'Reach us via WhatsApp, email, or the contact form.'
         },
         keywords: 'kontak hubungi whatsapp email form penawaran quotation alamat'
      }
   ];

   let activeIndex = -1;
   let currentResults = [];

   function normalize(str) {
      return (str || '')
         .toLowerCase()
         .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents defensively
   }

   function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, (c) => ({
         '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
   }

   function highlight(text, query) {
      const safeText = escapeHtml(text);
      if (!query) return safeText;
      const safeQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!safeQuery) return safeText;
      try {
         return safeText.replace(new RegExp(`(${safeQuery})`, 'ig'), '<mark>$1</mark>');
      } catch (err) {
         return safeText;
      }
   }

   function scoreEntry(entry, terms, lang) {
      const haystack = normalize(
         `${entry.title.id} ${entry.title.en} ${entry.desc.id} ${entry.desc.en} ${entry.keywords}`
      );
      let score = 0;
      for (const term of terms) {
         if (!term) continue;
         const titleNorm = normalize(entry.title[lang]);
         if (titleNorm.startsWith(term)) score += 6;
         else if (titleNorm.includes(term)) score += 4;
         else if (haystack.includes(term)) score += 1;
         else return -1; // every term must match somewhere
      }
      return score;
   }

   function runSearch(rawQuery) {
      const lang = getLang();
      const query = rawQuery.trim();

      if (!query) {
         currentResults = [];
         activeIndex = -1;
         resultsBox.innerHTML = '';
         if (hintEl) resultsBox.appendChild(hintEl);
         return;
      }

      const terms = normalize(query).split(/\s+/).filter(Boolean);

      const scored = searchIndex
         .map(entry => ({ entry, score: scoreEntry(entry, terms, lang) }))
         .filter(r => r.score > 0)
         .sort((a, b) => b.score - a.score)
         .slice(0, 8);

      currentResults = scored.map(r => r.entry);
      activeIndex = currentResults.length ? 0 : -1;
      renderResults(query, lang);
   }

   function renderResults(query, lang) {
      resultsBox.innerHTML = '';

      if (!currentResults.length) {
         const empty = document.createElement('div');
         empty.className = 'search-empty';
         const noResultsLabel = lang === 'en' ? 'No results found' : 'Tidak ada hasil ditemukan';
         const tryLabel = lang === 'en' ? 'Try a different keyword.' : 'Coba kata kunci lain.';
         empty.innerHTML = `<strong>${escapeHtml(noResultsLabel)}</strong>${escapeHtml(tryLabel)}`;
         resultsBox.appendChild(empty);
         return;
      }

      let lastGroup = null;
      currentResults.forEach((entry, i) => {
         const groupLabel = entry.group[lang];
         if (groupLabel !== lastGroup) {
            const label = document.createElement('div');
            label.className = 'search-group-label';
            label.textContent = groupLabel;
            resultsBox.appendChild(label);
            lastGroup = groupLabel;
         }

         const item = document.createElement('a');
         item.href = hrefFor(entry.anchor);
         item.className = 'search-result' + (i === activeIndex ? ' active' : '');
         item.setAttribute('role', 'option');
         item.dataset.index = String(i);

         const iconSvg = iconPaths[entry.icon] || iconPaths.article;
         item.innerHTML = `
            <span class="search-result-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconSvg}</svg></span>
            <span class="search-result-text">
               <strong>${highlight(entry.title[lang], query)}</strong>
               <p>${escapeHtml(entry.desc[lang])}</p>
            </span>
            <svg class="search-result-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
         `;

         item.addEventListener('click', () => {
            closeSearch();
         });
         item.addEventListener('mouseenter', () => {
            activeIndex = i;
            updateActiveClasses();
         });

         resultsBox.appendChild(item);
      });
   }

   function updateActiveClasses() {
      resultsBox.querySelectorAll('.search-result').forEach(el => {
         const isActive = Number(el.dataset.index) === activeIndex;
         el.classList.toggle('active', isActive);
         if (isActive) el.scrollIntoView({ block: 'nearest' });
      });
   }

   function openSearch() {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('search-open');
      // Close other overlays that might compete for attention/space
      const chatWindow = document.getElementById('aiChatWindow');
      if (chatWindow) chatWindow.classList.remove('open');
      const fab = document.getElementById('fabContact');
      if (fab) fab.classList.remove('open');

      input.value = '';
      runSearch('');
      setTimeout(() => input.focus(), 50);
   }

   function closeSearch() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('search-open');
   }

   trigger.addEventListener('click', openSearch);
   if (closeBtn) closeBtn.addEventListener('click', closeSearch);

   // Secondary search entry point shown inside the mobile nav dropdown
   const mobileTrigger = document.getElementById('searchTriggerMobile');
   if (mobileTrigger) {
      mobileTrigger.addEventListener('click', () => {
         const navLinks = document.getElementById('navLinks');
         const mobileMenuBtn = document.getElementById('mobileMenu');
         if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (mobileMenuBtn) {
               mobileMenuBtn.classList.remove('active');
               mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
         }
         openSearch();
      });
   }

   overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
   });

   input.addEventListener('input', (e) => runSearch(e.target.value));

   input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
         e.preventDefault();
         if (!currentResults.length) return;
         activeIndex = (activeIndex + 1) % currentResults.length;
         updateActiveClasses();
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         if (!currentResults.length) return;
         activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
         updateActiveClasses();
      } else if (e.key === 'Enter') {
         e.preventDefault();
         if (activeIndex >= 0 && currentResults[activeIndex]) {
            window.location.href = hrefFor(currentResults[activeIndex].anchor);
            closeSearch();
         }
      } else if (e.key === 'Escape') {
         closeSearch();
      }
   });

   // Global shortcuts: Ctrl/Cmd+K to open, Esc to close from anywhere
   document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'k') {
         e.preventDefault();
         if (overlay.classList.contains('open')) {
            closeSearch();
         } else {
            openSearch();
         }
      } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
         closeSearch();
      }
   });
})();

// ---------- Lead Capture Popup (auto-opens 10s after page load) ----------
// Submissions are sent to your email via Web3Forms (a free, backend-less form
// relay). To activate email delivery:
//   1. Go to https://web3forms.com, enter the email you want leads sent to,
//      and click "Create Access Key" — you'll get a key instantly by email.
//   2. Paste that key into WEB3FORMS_ACCESS_KEY below, replacing the placeholder.
// Until a real key is set, submissions will still show the success animation
// but won't actually be delivered anywhere.
try {
   const WEB3FORMS_ACCESS_KEY = 'YOUR-WEB3FORMS-ACCESS-KEY-HERE';

   const POPUP_DELAY_MS = 10000;               // show 10s after page load
   const STORAGE_KEY = 'kreasiasa_lead_popup';  // stores 'shown' for this tab/session only

   // Uses sessionStorage (not localStorage) on purpose: it resets every time
   // a new tab/window is opened, so the popup reappears each new session,
   // but won't re-show on every scroll/refresh within the same tab.
   const sessionSafeGet = (key) => {
      try { return window.sessionStorage.getItem(key); } catch (err) { return null; }
   };
   const sessionSafeSet = (key, value) => {
      try { window.sessionStorage.setItem(key, value); } catch (err) { /* ignore */ }
   };

   const overlay = document.getElementById('leadPopupOverlay');
   const popupCloseBtn = document.getElementById('leadPopupClose');
   const popupForm = document.getElementById('leadPopupForm');
   const formState = document.getElementById('leadPopupFormState');
   const successState = document.getElementById('leadPopupSuccessState');

   if (overlay && popupForm) {

      const shouldShowPopup = () => !sessionSafeGet(STORAGE_KEY);

      const openPopup = () => {
         overlay.classList.add('is-open');
         overlay.setAttribute('aria-hidden', 'false');
         document.body.classList.add('lead-popup-open');
      };

      const closePopup = (remember) => {
         overlay.classList.remove('is-open');
         overlay.setAttribute('aria-hidden', 'true');
         document.body.classList.remove('lead-popup-open');
         if (remember) sessionSafeSet(STORAGE_KEY, 'shown');
      };

      if (shouldShowPopup()) {
         setTimeout(() => {
            // Don't interrupt if the AI chat or search overlay is already open
            const aiOpen = document.getElementById('aiChatWindow')?.classList.contains('open');
            const searchOpen = document.body.classList.contains('search-open');
            if (!aiOpen && !searchOpen) openPopup();
         }, POPUP_DELAY_MS);
      }


      popupCloseBtn.addEventListener('click', () => closePopup(true));
      overlay.addEventListener('click', (e) => {
         if (e.target === overlay) closePopup(true);
      });
      document.addEventListener('keydown', (e) => {
         if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePopup(true);
      });

      popupForm.addEventListener('submit', async (e) => {
         e.preventDefault();
         const submitBtn = document.getElementById('leadPopupSubmit');
         const name = document.getElementById('lpName').value.trim();
         const contact = document.getElementById('lpContact').value.trim();
         if (!name || !contact) return;

         submitBtn.disabled = true;

         try {
            if (WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY !== 'YOUR-WEB3FORMS-ACCESS-KEY-HERE') {
               await fetch('https://api.web3forms.com/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     access_key: WEB3FORMS_ACCESS_KEY,
                     subject: 'Penawaran Gratis — Lead Baru dari Website CocoFiber',
                     from_name: 'CocoFiber Website',
                     name: name,
                     contact: contact,
                     message: `Nama: ${name}\nKontak (WhatsApp/Email): ${contact}\n\nDikirim otomatis dari popup "Get a Free Price Quote" di cocofiber.com`
                  })
               });
            }
         } catch (err) {
            // Fail silently in the UI; the lead simply won't be delivered.
         }

         formState.hidden = true;
         successState.hidden = false;
         sessionSafeSet(STORAGE_KEY, 'shown');

         setTimeout(() => closePopup(false), 3200);
      });
   }
} catch (err) { /* keep the rest of the page working even if this fails */ }

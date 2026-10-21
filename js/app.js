/* =========================================================
   صفة الصلاة — منطق الواجهة
   - التنقل بين الأقسام (hash routing)
   - الوضع الليلي / النهاري مع الحفظ
   - قائمة الجوال
   - تثبيت PWA
   - تسجيل Service Worker (العمل دون إنترنت)
   ========================================================= */
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const root       = document.documentElement;
  const header     = $('#siteHeader');
  const nav        = $('#mainNav');
  const menuBtn    = $('#menuBtn');
  const themeBtn   = $('#themeBtn');
  const views      = $$('.view');
  const navLinks   = $$('.nav-link');
  const metaTheme  = $('meta[name="theme-color"]');
  const THEME_KEY  = 'sifat-salah:theme';

  /* ------------------------------------------------------
     1. الوضع الليلي / النهاري
     ------------------------------------------------------ */
  const THEME_COLORS = { light: '#1F5B4C', dark: '#0A141C' };

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
    if (themeBtn) {
      const isDark = theme === 'dark';
      themeBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي');
      themeBtn.setAttribute('title', isDark ? 'الوضع النهاري' : 'الوضع الليلي');
    }
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* تجاهل */ }
    }
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* تجاهل */ }

    const prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme(saved || (prefersDark ? 'dark' : 'light'), false);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      let saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (err) { /* تجاهل */ }
      if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
    });
  }

  initTheme();

  /* ------------------------------------------------------
     2. التنقل بين الأقسام
     ------------------------------------------------------ */
  const VIEWS = ['home', 'salah', 'adhkar', 'sunan', 'arkan', 'wajibat'];

  function currentView() {
    const id = (location.hash || '#home').replace('#', '');
    return VIEWS.includes(id) ? id : 'home';
  }

  function show(id, opts) {
    const options = opts || {};
    views.forEach((v) => {
      const active = v.id === id;
      v.classList.toggle('is-active', active);
      if (active) {
        v.removeAttribute('hidden');
      } else {
        v.setAttribute('hidden', '');
      }
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    document.title = (() => {
      const h = document.getElementById(id)?.querySelector('h1, h2');
      return h ? `${h.textContent.trim().replace(/\s+/g, ' ')} — صفة الصلاة` : 'كيفية صلاة النبي ﷺ';
    })();

    closeMenu();

    if (options.scroll !== false) {
      const y = options.toTop === false
        ? 0
        : (id === 'home' ? 0 : (header ? header.offsetHeight : 0));
      window.scrollTo({ top: y, behavior: options.instant ? 'auto' : 'smooth' });
    }
  }

  function onRoute() {
    show(currentView(), { instant: false });
  }

  window.addEventListener('hashchange', onRoute);

  // أول تحميل
  if (location.hash) {
    show(currentView(), { scroll: false, instant: true });
  }

  /* ------------------------------------------------------
     3. قائمة الجوال
     ------------------------------------------------------ */
  function closeMenu() {
    if (!nav || !menuBtn) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (!nav || !menuBtn) return;
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);

  document.addEventListener('click', (e) => {
    if (!nav || !menuBtn) return;
    if (!nav.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 860) closeMenu();
  });

  /* ------------------------------------------------------
     4. ظل الهيدر عند التمرير
     ------------------------------------------------------ */
  let ticking = false;
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 4);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ------------------------------------------------------
     5. تثبيت التطبيق (PWA)
     ------------------------------------------------------ */
  const installButtons = $$('[data-install]');
  const installBtn     = $('#installBtn');
  let deferredPrompt   = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  function setInstallVisible(visible) {
    if (installBtn) installBtn.hidden = !visible;
    installButtons.forEach((b) => { b.hidden = !visible; });
  }

  function showToast(message, ms) {
    let toast = $('#pwaToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwaToast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove('is-visible'), ms || 5200);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone()) setInstallVisible(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setInstallVisible(false);
    showToast('تم تثبيت التطبيق على جهازك ✓');
  });

  async function doInstall() {
    if (isStandalone()) {
      showToast('التطبيق مثبَّت بالفعل على جهازك.');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') showToast('جارٍ تثبيت التطبيق…');
      } catch (e) { /* تجاهل */ }
      deferredPrompt = null;
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    showToast(isIOS
      ? 'للتثبيت على iPhone: اضغط زر المشاركة ⤴ ثم «إضافة إلى الشاشة الرئيسية».'
      : 'للتثبيت: افتح قائمة المتصفح ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
      7000);
  }

  installButtons.forEach((b) => b.addEventListener('click', doInstall));
  if (installBtn) installBtn.addEventListener('click', doInstall);

  if (isStandalone()) setInstallVisible(false);

  /* ------------------------------------------------------
     6. Service Worker — العمل دون إنترنت
     ------------------------------------------------------ */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* تجاهل */ });
    });
  }

  /* ------------------------------------------------------
     7. تحسينات صغيرة
     ------------------------------------------------------ */
  // منع القفز عند إعادة تحميل الصفحة مع hash
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // إضافة رقم الصفحة تلقائيًا لصور الفوتر؟ لا حاجة.
  // تحديث سنة الحقوق إن وُجد عنصر
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

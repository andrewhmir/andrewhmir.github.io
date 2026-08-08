/* ==========================================================================
   Portfolio Engine — Renders all content from data.js · Handles all UX
   No Bootstrap · No jQuery · Vanilla JS
   ========================================================================== */

(function () {
  'use strict';

  /* ── DOM References ─────────────────────────────────────────────── */
  const $progress   = document.getElementById('scrollProgress');
  const $scrollTop  = document.getElementById('scrollTopBtn');
  const $navHeader  = document.getElementById('navHeader');
  const $navToggle  = document.getElementById('navToggle');
  const $navMenu    = document.getElementById('navMenu');
  const $navList    = document.getElementById('navList');
  const $heroPhoto  = document.getElementById('heroPhoto');
  const $heroBio    = document.getElementById('heroBio');
  const $heroEmail  = document.getElementById('heroEmail');
  const $heroLinks  = document.getElementById('heroLinks');
  const $newsTimeline = document.getElementById('newsTimeline');
  const $projectList  = document.getElementById('projectList');
  const $leadershipList = document.getElementById('leadershipList');
  const $honorsList     = document.getElementById('honorsList');
  const $modalOverlay   = document.getElementById('modalOverlay');
  const $modalClose     = document.getElementById('modalClose');
  const $modalHeader    = document.getElementById('modalHeader');
  const $modalImage     = document.getElementById('modalImage');
  const $modalBody      = document.getElementById('modalBody');
  const $footerYear     = document.getElementById('currentYear');
  const $footerEmail    = document.getElementById('footerEmail');

  /* ── Guard ──────────────────────────────────────────────────────── */
  if (typeof PORTFOLIO === 'undefined') {
    console.warn('PORTFOLIO data not loaded. Make sure js/data.js is included.');
    return;
  }

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */

  /* ── Navigation ──────────────────────────────────────────────── */
  function renderNav() {
    if (!$navList) return;
    $navList.innerHTML = PORTFOLIO.nav.map(item =>
      `<li><a href="#${item.id}" data-nav="${item.id}">${item.label}</a></li>`
    ).join('');
  }

  /* ── Hero ──────────────────────────────────────────────────── */

  /* Sync photo height to match bio text box (desktop only).
     flexbox stretch is unreliable on replaced <img> elements, so we
     explicitly set height from the bio container's computed height. */
  var MOBILE_BP = 768;
  function syncPhotoHeight() {
    if (!$heroPhoto || !$heroBio) return;
    if (window.innerWidth <= MOBILE_BP) {
      /* Mobile: CSS handles fixed 100×100 — reset inline styles */
      $heroPhoto.style.height = '';
      $heroPhoto.style.width  = '';
      return;
    }
    var bioH = $heroBio.offsetHeight;
    if (bioH > 0) {
      $heroPhoto.style.height = bioH + 'px';
      $heroPhoto.style.width  = 'auto';
    }
  }

  var _resizeTimer;
  function onResize() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(syncPhotoHeight, 80);
  }

  function renderHero() {
    if ($heroPhoto) {
      $heroPhoto.src = PORTFOLIO.profileImage;
      /* Sync once image loads so we have correct intrinsic dimensions */
      $heroPhoto.addEventListener('load', syncPhotoHeight, { once: true });
    }
    if ($heroBio) {
      $heroBio.innerHTML = PORTFOLIO.bio.map(p => `<p>${p}</p>`).join('');
    }
    if ($heroEmail) {
      const obfuscated = PORTFOLIO.email.replace('.', ' [dot] ').replace('@', ' [at] ').replace('.', ' [dot] ');
      $heroEmail.innerHTML = `<i class="far fa-envelope" style="margin-right:7px;"></i>${obfuscated}`;
      $heroEmail.dataset.copy = PORTFOLIO.email;
    }
    if ($heroLinks) {
      $heroLinks.innerHTML = PORTFOLIO.social.map(item => {
        if (item.copy) {
          return `<button class="pill" data-action="copy" data-copy="${item.copy}" aria-label="Copy ${item.label.toLowerCase()}">
            <i class="${item.icon}"></i> ${item.label}
          </button>`;
        }
        return `<a class="pill" href="${item.url}" target="_blank" rel="noopener">
          <i class="${item.icon}"></i> ${item.label}
        </a>`;
      }).join('');
    }
    /* Initial sync + listen for resize */
    syncPhotoHeight();
    window.addEventListener('resize', onResize);
  }

  /* ── News Timeline ──────────────────────────────────────────── */
  function renderNews() {
    if (!$newsTimeline) return;
    $newsTimeline.innerHTML = PORTFOLIO.news.map((item, i) =>
      `<div class="timeline-item reveal" style="--reveal-delay: ${i * 60}ms">
        <span class="timeline-date">${item.date}</span>
        <p class="timeline-text">${item.text}</p>
      </div>`
    ).join('');
  }

  /* ── Projects ──────────────────────────────────────────────── */
  function renderProjectCard(p, i) {
    const isSolo = !p.authors.includes(',');
    const soloClass = isSolo ? ' project-card--solo' : '';
    const isImg = isImage(p.video);
    const links = [
      { label: 'Overview', icon: 'fas fa-eye', action: 'overview' },
      { label: 'Team',     icon: 'fas fa-users', action: 'team' },
      ...(p.report && p.report.image && p.report.text ? [{ label: 'Report', icon: 'fas fa-file-pdf', action: 'report' }] : []),
      ...p.links.map(l => ({ label: l.label, icon: l.icon, url: l.url }))
    ];

    const sourceBadge = p.source
      ? `<span class="project-source project-source--${p.source}">${p.source === 'open' ? 'Open Source' : 'Closed Source'}${p.sourceNote ? ' · ' + p.sourceNote : ''}</span>`
      : '';

    const pills = links.map(l => {
      if (l.url) {
        return `<a class="pill" href="${l.url}" target="_blank" rel="noopener"><i class="${l.icon}"></i> ${l.label}</a>`;
      }
      return `<button class="pill" data-action="modal" data-project="${p.id}" data-tab="${l.action}"><i class="${l.icon}"></i> ${l.label}</button>`;
    }).join('');

    return `
      <div class="project-card${soloClass} reveal" style="--reveal-delay: ${i * 80}ms">
        ${isImg
          ? `<img class="project-thumb img-fallback" src="${p.video}" alt="${p.title}" loading="lazy">`
          : `<video class="project-thumb" playsinline autoplay loop muted preload="metadata">
              <source src="${p.video}" type="video/mp4">
             </video>`
        }
        <div class="project-info">
          <h3 class="project-title">${p.title}${sourceBadge}</h3>
          <p class="project-authors">${p.authors}</p>
          <span class="project-venue">${p.venue}</span>
          <div class="project-links">${pills}</div>
        </div>
      </div>`;
  }

  function renderProjects() {
    if (!$projectList) return;

    // Group projects by category, preserving category order
    var cats = [];
    var groups = {};
    PORTFOLIO.projects.forEach(function (p) {
      var cat = p.category || '';
      if (!groups[cat]) {
        groups[cat] = [];
        cats.push(cat);
      }
      groups[cat].push(p);
    });

    // Reorder: Software first, then Robotics, then any uncategorized
    var order = ['Software', 'Robotics'];
    var ordered = [];
    order.forEach(function (cat) {
      if (groups[cat]) {
        ordered.push({ category: cat, projects: groups[cat] });
        delete groups[cat];
      }
    });
    // Append any remaining categories not in the explicit order
    cats.forEach(function (cat) {
      if (groups[cat]) {
        ordered.push({ category: cat, projects: groups[cat] });
      }
    });

    var cardIndex = 0;
    var html = '';
    ordered.forEach(function (group) {
      html += '<h3 class="project-subheading">' + group.category + '</h3>';
      group.projects.forEach(function (p) {
        html += renderProjectCard(p, cardIndex++);
      });
    });
    $projectList.innerHTML = html;
  }

  /* ── Leadership ─────────────────────────────────────────────── */
  function renderLeadership() {
    if (!$leadershipList) return;
    $leadershipList.innerHTML = PORTFOLIO.leadership.map((item, i) =>
      `<div class="record-item reveal" style="--reveal-delay: ${i * 50}ms">
        <span class="record-desc">${item.description}</span>
        <span class="record-year">${item.year}</span>
      </div>`
    ).join('');
  }

  /* ── Honors ─────────────────────────────────────────────────── */
  function renderHonors() {
    if (!$honorsList) return;
    $honorsList.innerHTML = PORTFOLIO.honors.map((item, i) =>
      `<div class="record-item reveal" style="--reveal-delay: ${i * 40}ms">
        <span class="record-desc">${item.description}</span>
        <span class="record-year">${item.year}</span>
      </div>`
    ).join('');
  }

  /* ── Footer ─────────────────────────────────────────────────── */
  function renderFooter() {
    if ($footerYear) {
      $footerYear.textContent = new Date().getFullYear();
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     MODAL (single shared instance)
     ════════════════════════════════════════════════════════════════════ */

  function lockBodyScroll() {
    var w = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-w', w + 'px');
    document.body.style.paddingRight = w + 'px';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.documentElement.style.removeProperty('--scrollbar-w');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  function openModal(projectId, tab) {
    if (!$modalOverlay || !$modalHeader || !$modalImage || !$modalBody) return;

    const proj = PORTFOLIO.projects.find(p => p.id === projectId);
    if (!proj) return;

    const isTeam   = (tab === 'team');
    const isReport = (tab === 'report');
    const data = isReport ? proj.report : (isTeam ? proj.team : proj.overview);
    const title = isReport ? `${proj.title} — Technical Report` : (isTeam ? `${proj.title} — Team` : `${proj.title} — Overview`);

    $modalHeader.innerHTML = `
      <h3>${title}</h3>
      <p class="modal-subtitle">${proj.venue}</p>`;

    $modalImage.innerHTML = `<img src="${data.image}" alt="${title}">`;

    if (isTeam && Array.isArray(data.text)) {
      $modalBody.innerHTML = data.text.map(t => `<p>${t}</p>`).join('');
    } else {
      $modalBody.innerHTML = `<p>${data.text}</p>`;
    }

    $modalOverlay.classList.add('active');
    lockBodyScroll();
    $navHeader.classList.add('hidden');
  }

  function closeModal() {
    if (!$modalOverlay) return;
    $modalOverlay.classList.remove('active');
    unlockBodyScroll();
    $navHeader.classList.remove('hidden');
  }

  if ($modalClose) {
    $modalClose.addEventListener('click', closeModal);
  }

  if ($modalOverlay) {
    $modalOverlay.addEventListener('click', function (e) {
      if (e.target === $modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $modalOverlay && $modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });

  /* ── Event Delegation: Project modal buttons ──────────────────── */
  if ($projectList) {
    $projectList.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="modal"]');
      if (!btn) return;
      openModal(btn.dataset.project, btn.dataset.tab);
    });
  }

  /* ── Event Delegation: Copy-to-clipboard buttons ──────────────── */
  if ($heroLinks) {
    $heroLinks.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action="copy"]');
      if (!btn) return;
      copyToClipboard(btn.dataset.copy, btn);
    });
  }

  /* Email click-to-copy */
  if ($heroEmail) {
    $heroEmail.addEventListener('click', function () {
      copyToClipboard($heroEmail.dataset.copy, $heroEmail);
    });
  }

  if ($footerEmail) {
    $footerEmail.addEventListener('click', function () {
      copyToClipboard($footerEmail.dataset.copy, $footerEmail);
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     INTERACTIONS
     ════════════════════════════════════════════════════════════════════ */

  /* ── Scroll Progress ────────────────────────────────────────── */
  function updateScrollProgress() {
    if (!$progress) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    $progress.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : '0%';
  }

  /* ── Scroll-to-Top ──────────────────────────────────────────── */
  function updateScrollTopVisibility() {
    if (!$scrollTop) return;
    $scrollTop.classList.toggle('visible', window.scrollY > 400);
  }

  if ($scrollTop) {
    $scrollTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Nav Scroll Spy ─────────────────────────────────────────── */
  function updateActiveNav() {
    const links = document.querySelectorAll('[data-nav]');
    if (!links.length) return;

    const scrollPos = window.scrollY + 80;
    let current = null;

    links.forEach(link => {
      const id = link.getAttribute('data-nav');
      const section = document.getElementById(id);
      if (section && scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
        current = id;
      }
    });

    links.forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-nav') === current);
    });
  }

  /* ── Nav Hide/Show on Scroll ─────────────────────────────────── */
  let lastScroll = 0;
  function updateNavVisibility() {
    if (!$navHeader) return;
    const currentScroll = window.scrollY;

    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-h'), 10) || 56;
    if (currentScroll > lastScroll && currentScroll > navH + 20) {
      $navHeader.classList.add('hidden');
    } else {
      $navHeader.classList.remove('hidden');
    }
    lastScroll = currentScroll;
  }

  /* ── Nav Backdrop ─────────────────────────────────────────── */
  const $navBackdrop = document.createElement('div');
  $navBackdrop.classList.add('nav-backdrop');
  document.body.appendChild($navBackdrop);

  function openMobileNav() {
    $navMenu.classList.add('open');
    $navToggle.classList.add('open');
    $navToggle.setAttribute('aria-expanded', 'true');
    $navBackdrop.classList.add('open');
    lockBodyScroll();
  }

  function closeMobileNav() {
    $navMenu.classList.remove('open');
    $navToggle.classList.remove('open');
    $navToggle.setAttribute('aria-expanded', 'false');
    $navBackdrop.classList.remove('open');
    unlockBodyScroll();
  }

  /* ── Mobile Nav Toggle ──────────────────────────────────────── */
  if ($navToggle && $navMenu) {
    $navToggle.addEventListener('click', function () {
      if ($navMenu.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    // Close on nav link click (mobile)
    $navMenu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        closeMobileNav();
      }
    });

    // Close on backdrop click
    $navBackdrop.addEventListener('click', function () {
      closeMobileNav();
    });
  }

  /* ── Scroll-Triggered Reveal ────────────────────────────────── */
  function initRevealObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  /* ── Smooth Scroll for Anchor Links ─────────────────────────── */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-h'), 10) || 56;
        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth'
        });
      }
    });
  }

  /* ── Combined Scroll Handler (throttled) ────────────────────── */
  let throttled = false;
  function onScroll() {
    if (!throttled) {
      requestAnimationFrame(function () {
        updateScrollProgress();
        updateScrollTopVisibility();
        updateActiveNav();
        updateNavVisibility();
        throttled = false;
      });
      throttled = true;
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     CLIPBOARD
     ════════════════════════════════════════════════════════════════════ */

  function copyToClipboard(text, el) {
    const showToast = (msg, isError) => {
      const toast = document.createElement('div');
      toast.className = 'toast' + (isError ? ' toast--error' : '');
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; }, 1800);
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2200);
    };

    if (el) {
      el.style.transform = 'scale(0.96)';
      setTimeout(() => { if (el) el.style.transform = ''; }, 150);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showToast('Email copied — reach out anytime!')).catch(() => showToast('Could not copy', true));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Email copied — reach out anytime!');
      } catch (e) {
        showToast('Could not copy', true);
      }
      document.body.removeChild(ta);
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════════════════════════════ */

  function isImage(src) {
    return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(src);
  }

  /* ════════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════════ */

  function init() {
    renderNav();
    renderHero();
    renderNews();
    renderProjects();
    renderLeadership();
    renderHonors();
    renderFooter();

    initRevealObserver();
    initSmoothScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial state
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
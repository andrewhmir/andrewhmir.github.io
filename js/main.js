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
  const $modalCard      = document.getElementById('modalCard');
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
    $newsTimeline.innerHTML = PORTFOLIO.news.map((item, i) => {
      const hasGallery = Array.isArray(item.images) && item.images.length > 0;
      const hint = hasGallery ? '<span class="gallery-hint" aria-hidden="true"><i class="fas fa-images"></i></span>' : '';
      const inner = `<span class="timeline-date">${item.date}</span>
        <p class="timeline-text">${item.text}${hint}</p>`;
      const delay = `style="--reveal-delay: ${i * 60}ms"`;

      if (!hasGallery) {
        return `<div class="timeline-item reveal" ${delay}>${inner}</div>`;
      }
      /* data-entry carries the real index in the unfiltered list; indices are
         never re-derived from a filtered loop. */
      return `<button type="button" class="timeline-item timeline-item--gallery reveal" ${delay}
        data-gallery="news" data-entry="${i}"
        aria-label="View photos: ${item.text}">${inner}</button>`;
    }).join('');
  }

  /* ── Projects ──────────────────────────────────────────────── */
  function renderProjectCard(p, i) {
    const isSolo = !p.authors.includes(',');
    const soloClass = isSolo ? ' project-card--solo' : '';
    const isImg = isImage(p.video);
    const links = [
      { label: 'Overview', icon: 'fas fa-eye', action: 'overview' },
      ...(!isSolo ? [{ label: 'Team', icon: 'fas fa-users', action: 'team' }] : []),
      ...(p.awards && p.awards.length ? [{ label: 'Awards', icon: 'fas fa-trophy', action: 'awards' }] : []),
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
      <article class="project-card${soloClass} reveal" style="--reveal-delay: ${i * 80}ms">
        <div class="project-media">
          ${isImg
            ? `<img class="project-thumb img-fallback" src="${p.video}" alt="${p.title}" loading="lazy">`
            : `<video class="project-thumb" playsinline loop muted preload="none"
                     poster="${p.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg')}">
                <source src="${p.video}" type="video/mp4">
               </video>`
          }
          <div class="project-cue" aria-hidden="true">
            <span class="project-cue-icon"><i class="fas fa-eye"></i></span>
            <span class="project-cue-label">View project</span>
          </div>
        </div>
        <div class="project-info">
          <h3 class="project-title">
            <button type="button" class="project-hit" data-action="modal" data-project="${p.id}" data-tab="overview">${p.title}</button>${sourceBadge}
          </h3>
          ${p.tagline ? `<p class="project-tagline">${p.tagline}</p>` : ''}
          <p class="project-authors">${p.authors}</p>
          <span class="project-venue">${p.venue}</span>
          <div class="project-links">${pills}</div>
        </div>
      </article>`;
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

    // Reorder: Applications first, then Robotics, then any uncategorized
    var order = ['Applications', 'Robotics'];
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
  /* `entryIndex` is the item's real index in the unfiltered list, passed in by
     the caller — never the position within a filtered subset. It is what
     Site.galleryFor resolves against, so a row opens its own entry. */
  function renderRecordItem(item, entryIndex, kind, step) {
    const hasGallery = Array.isArray(item.images) && item.images.length > 0;
    const hint = hasGallery ? '<span class="gallery-hint" aria-hidden="true"><i class="fas fa-images"></i></span>' : '';
    const inner = `<span class="record-desc">${item.description}${hint}</span>
      <span class="record-year">${item.year}</span>`;
    const delay = `style="--reveal-delay: ${entryIndex * step}ms"`;

    if (!hasGallery) {
      return `<div class="record-item reveal" ${delay}>${inner}</div>`;
    }
    return `<button type="button" class="record-item record-item--gallery reveal" ${delay}
      data-gallery="${kind}" data-entry="${entryIndex}"
      aria-label="View photos: ${item.description}">${inner}</button>`;
  }

  function renderLeadership() {
    if (!$leadershipList) return;
    $leadershipList.innerHTML = PORTFOLIO.leadership.map((item, i) =>
      renderRecordItem(item, i, 'leadership', 50)
    ).join('');
  }

  /* ── Honors ─────────────────────────────────────────────────── */
  function renderHonors() {
    if (!$honorsList) return;
    $honorsList.innerHTML = PORTFOLIO.honors.map((item, i) =>
      renderRecordItem(item, i, 'honors', 40)
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

  /* ── Gallery (slow auto-scrolling photo carousel — Leadership / Honors / News) ── */

  const galleryState = {
    images: [],
    current: 0
  };

  const GALLERY_LABELS = { news: 'News', leadership: 'Leadership', honors: 'Honors' };
  const GALLERY_SPEED = 40; // px per second — slow, consistent glide

  let galleryDriftId = null;
  let galleryLastTick = null;

  /* The carousel's markup, unchanged apart from taking its inputs as
     parameters so openGallery can drive it from Site.galleryFor. */
  function buildGalleryMarkup(images, title) {
    const multi = images.length > 1;
    return `
      <div class="gallery" id="gallery">
        <div class="gallery-track" id="galleryTrack">
          ${images.concat(images).map((src, i) => `
            <figure class="gallery-slide">
              <img src="${src}" alt="${title} — photo ${(i % images.length) + 1}"
                   onerror="this.closest('.gallery-slide').classList.add('is-placeholder');this.onerror=null;this.src='files/PlaceHolder.png';">
            </figure>`).join('')}
        </div>
        ${multi ? `
          <button class="gallery-arrow gallery-arrow--prev" id="galleryPrev" aria-label="Previous photo"><i class="fas fa-chevron-left"></i></button>
          <button class="gallery-arrow gallery-arrow--next" id="galleryNext" aria-label="Next photo"><i class="fas fa-chevron-right"></i></button>
          <div class="gallery-dots" id="galleryDots">
            ${images.map((_, i) => `<button class="gallery-dot${i === 0 ? ' active' : ''}" data-slide="${i}" aria-label="Go to photo ${i + 1}"></button>`).join('')}
          </div>
          <div class="gallery-counter" id="galleryCounter">1 / ${images.length}</div>
        ` : ''}
      </div>`;
  }

  function openGallery(kind, entryIndex) {
    if (!$modalOverlay || !$modalHeader || !$modalImage || !$modalBody) return;

    /* Site.galleryFor is total: it resolves the entry by its real index in the
       unfiltered list and always yields an images array. A row with no photos
       therefore opens nothing — it never falls through to a neighbour's. */
    var data = Site.galleryFor(kind, entryIndex);
    if (!data.images.length) return;   /* nothing to show — do not open */

    galleryState.images = data.images;
    galleryState.current = 0;

    var label = GALLERY_LABELS[kind] || '';
    $modalHeader.innerHTML = '<h3 id="modalTitle">' + data.title + '</h3>'
      + '<p class="modal-subtitle">' + label + (data.meta ? ' · ' + data.meta : '') + '</p>';

    $modalImage.style.display = '';
    $modalImage.innerHTML = buildGalleryMarkup(data.images, data.title);
    $modalBody.innerHTML = '';
    bindGalleryControls();
    updateGalleryUI();
    openDialog();
    startGalleryDrift();
  }

  function bindGalleryControls() {
    const $track = document.getElementById('galleryTrack');
    const $prev = document.getElementById('galleryPrev');
    const $next = document.getElementById('galleryNext');
    const $gallery = document.getElementById('gallery');

    if ($prev) $prev.addEventListener('click', () => goToSlide(galleryState.current - 1));
    if ($next) $next.addEventListener('click', () => goToSlide(galleryState.current + 1));

    document.querySelectorAll('#galleryDots .gallery-dot').forEach(dot => {
      dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.slide, 10)));
    });

    if ($track) {
      $track.addEventListener('scroll', () => updateGalleryUI(), { passive: true });
    }

    if ($gallery) {
      $gallery.addEventListener('mouseenter', stopGalleryDrift);
      $gallery.addEventListener('mouseleave', startGalleryDrift);
      $gallery.addEventListener('focusin', stopGalleryDrift);
      $gallery.addEventListener('focusout', startGalleryDrift);
    }
  }

  function goToSlide(n) {
    const total = galleryState.images.length;
    if (!total) return;
    galleryState.current = ((n % total) + total) % total;

    const $track = document.getElementById('galleryTrack');
    if ($track) {
      $track.scrollLeft = galleryState.current * $track.clientWidth;
    }
    updateGalleryUI();
  }

  function updateGalleryUI() {
    const $track = document.getElementById('galleryTrack');
    const total = galleryState.images.length;

    if ($track && total && $track.clientWidth > 0) {
      galleryState.current = Math.round($track.scrollLeft / $track.clientWidth) % total;
    }

    document.querySelectorAll('#galleryDots .gallery-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === galleryState.current);
    });
    const $counter = document.getElementById('galleryCounter');
    if ($counter) {
      $counter.textContent = `${galleryState.current + 1} / ${total}`;
    }
  }

  function startGalleryDrift() {
    stopGalleryDrift();
    if (galleryState.images.length < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    galleryLastTick = null;
    galleryDriftId = requestAnimationFrame(driftTick);
  }

  function stopGalleryDrift() {
    if (galleryDriftId) {
      cancelAnimationFrame(galleryDriftId);
      galleryDriftId = null;
    }
  }

  function driftTick(now) {
    const $track = document.getElementById('galleryTrack');
    if (!$track) { galleryDriftId = null; return; }

    if (galleryLastTick == null) galleryLastTick = now;
    const dt = (now - galleryLastTick) / 1000;
    galleryLastTick = now;

    const total = galleryState.images.length;
    const setWidth = $track.clientWidth * total;

    if (setWidth > 0) {
      $track.scrollLeft += GALLERY_SPEED * dt;
      if ($track.scrollLeft >= setWidth) {
        $track.scrollLeft -= setWidth;
      }
      updateGalleryUI();
    }

    galleryDriftId = requestAnimationFrame(driftTick);
  }

  /* ── Dialog focus management ─────────────────────────────────── */

  var lastFocused = null;

  /* Make every sibling of the overlay inert: removes them from the tab
     order and from the accessibility tree while the dialog is open. */
  function setBackgroundInert(on) {
    var layer = document.querySelector('.content-layer');
    if (!layer) return;
    Array.prototype.forEach.call(layer.children, function (el) {
      if (el === $modalOverlay) return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function openDialog() {
    lastFocused = document.activeElement;
    $modalOverlay.classList.add('active');
    lockBodyScroll();
    $navHeader.classList.add('hidden');
    setBackgroundInert(true);
    if ($modalCard) $modalCard.focus();
  }

  /* Wrap Tab/Shift+Tab inside the dialog. `inert` already handles assistive
     tech and hit-testing; this keeps keyboard cycling deterministic. */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    if (!$modalOverlay.classList.contains('active') || !$modalCard) return;
    var items = $modalCard.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    items = Array.prototype.filter.call(items, function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === $modalCard)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', trapFocus);

  function openModal(projectId, tab) {
    if (!$modalOverlay || !$modalHeader || !$modalImage || !$modalBody) return;

    const proj = PORTFOLIO.projects.find(p => p.id === projectId);
    if (!proj) return;

    const isTeam   = (tab === 'team');
    const isReport = (tab === 'report');
    const isAwards = (tab === 'awards');
    const data = isReport ? proj.report : (isTeam ? proj.team : (isAwards ? proj.awards : proj.overview));
    const title = isReport ? `${proj.title} — Technical Report`
      : (isTeam ? `${proj.title} — Team`
      : (isAwards ? `${proj.title} — Awards`
      : `${proj.title} — Overview`));

    $modalHeader.innerHTML = `
      <h3 id="modalTitle">${title}</h3>
      <p class="modal-subtitle">${proj.venue}</p>`;

    if (isAwards) {
      $modalImage.innerHTML = '';
      $modalImage.style.display = 'none';
      $modalBody.innerHTML = '<div class="record-list">'
        + data.map((a, i) =>
            `<div class="record-item">
              <span class="record-desc">${a.description}</span>
              <span class="record-year">${a.year}</span>
            </div>`
          ).join('')
        + '</div>';
    } else {
      $modalImage.style.display = '';
      $modalImage.innerHTML = `<img src="${data.image}" alt="${title}">`;
      if (isTeam && Array.isArray(data.text)) {
        $modalBody.innerHTML = data.text.map(t => `<p>${t}</p>`).join('');
      } else {
        $modalBody.innerHTML = `<p>${data.text}</p>`;
      }
    }

    openDialog();
  }

  function closeModal() {
    stopGalleryDrift();
    if (!$modalOverlay) return;
    $modalOverlay.classList.remove('active');
    setBackgroundInert(false);
    unlockBodyScroll();
    $navHeader.classList.remove('hidden');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
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

  /* ── Event Delegation: Gallery lines (Leadership / Honors / News) ── */
  function bindGalleryList($el) {
    if (!$el) return;
    $el.addEventListener('click', function (e) {
      const item = e.target.closest('[data-gallery]');
      if (!item) return;
      openGallery(item.dataset.gallery, Number(item.dataset.entry));
    });
  }
  bindGalleryList($leadershipList);
  bindGalleryList($honorsList);
  bindGalleryList($newsTimeline);

  /* ── Event Delegation: Copy-to-clipboard buttons ──────────────── */
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-goto]');
    if (go && Site.walk) { Site.walk.goToRoom(go.dataset.goto); }
  });

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

  /* ── In-View Video Playback ──────────────────────────────────
     Videos carry preload="none" and a poster, so nothing is fetched until a
     card is actually on screen. Playback is skipped entirely when the visitor
     has asked for reduced motion. */
  function initVideoPlayback() {
    var videos = document.querySelectorAll('.project-card video');
    if (!videos.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          /* autoplay can still be refused — the poster stays in place */
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.25 });

    Array.prototype.forEach.call(videos, function (v) { observer.observe(v); });
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
     THE WALK — Lenis smooth horizontal scrolling + proximity snap
     ════════════════════════════════════════════════════════════════════ */

  /* Native CSS scroll-snap is deliberately off: it re-snaps whenever the
     scroll position is set programmatically, so it fights every Lenis
     animation. lenis/snap replaces it and handles wheel, touch and keys. */
  function initWalk() {
    var hall = document.getElementById('hall');
    var strip = document.getElementById('strip');
    if (!hall || !strip || typeof Lenis === 'undefined') return null;

    var lenis = new Lenis({
      wrapper: hall,
      content: strip,
      orientation: 'horizontal',
      lerp: 0.1,
      autoRaf: true,
      anchors: true,          /* without this, in-page links stop working */
      prevent: function (node) {
        return !!(node.closest && node.closest('.modal-overlay'));
      }
    });

    var snap = null;
    if (typeof Snap !== 'undefined') {
      snap = new Snap(lenis, {
        type: 'proximity',
        distanceThreshold: '35%',
        debounce: 150        /* the 500ms default feels sluggish */
      });
    }

    function registerTargets() {
      if (!snap) return;
      snap.stop();
      var els = strip.querySelectorAll('[data-snap]');
      Array.prototype.forEach.call(els, function (el) {
        snap.addElement(el, { align: 'center' });
      });
      snap.start();
    }

    /* Rooms are rendered after this runs, so register snap targets when they
       appear rather than depending on a call-order contract with the renderer. */
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () { registerTargets(); });
      mo.observe(strip, { childList: true });
    }

    function goToRoom(key) {
      var room = strip.querySelector('[data-room="' + key + '"]');
      if (room) lenis.scrollTo(room, { offset: 0 });
    }

    return {
      lenis: lenis,
      snap: snap,
      goToRoom: goToRoom,
      registerTargets: registerTargets,
      resize: function () { lenis.resize(); if (snap) snap.resize(); },
      stop: function () { lenis.stop(); if (snap) snap.stop(); },
      start: function () { lenis.start(); if (snap) snap.start(); }
    };
  }

  /* ════════════════════════════════════════════════════════════════════
     THE ROOMS — every string on a wall is sourced from PORTFOLIO
     ════════════════════════════════════════════════════════════════════ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderLabel(entry, index) {
    return '<div class="lbl">'
      + '<span class="no">CAT. ' + String(index + 1).padStart(2, '0') + ' &mdash; ' + esc(entry.venue) + '</span>'
      + '<p class="lt">' + esc(entry.tagline || entry.title) + '</p>'
      + '<p class="by">' + entry.authors + '</p>'
      + (entry.overview && entry.overview.text
          ? '<p class="med">' + esc(entry.overview.text.split('\n\n')[0]) + '</p>' : '')
      + '<p class="pro">' + esc(entry.source === 'open' ? 'Open source' : 'Closed source')
      + (entry.awards && entry.awards.length ? ' &middot; ' + entry.awards.length + ' awards' : '')
      + '</p></div>';
  }

  /* A work needs an image. Projects with video also have a poster frame, which
     make-images.mjs generates — use it so no frame is ever empty. */
  function workImage(p) {
    if (isImage(p.video)) return p.video;
    if (p.overview && p.overview.image) return p.overview.image;
    return p.video.replace(/^files\//, 'files/posters/').replace(/\.mp4$/i, '.jpg');
  }

  function renderWork(p, index) {
    var img = workImage(p);
    return '<article class="work" data-work data-snap data-project="' + esc(p.id) + '">'
      + '<div class="pool"></div>'
      + '<button type="button" class="project-hit canvas" data-action="modal"'
      + ' data-project="' + esc(p.id) + '" data-tab="overview"'
      + ' aria-label="Open ' + esc(p.title) + '">'
      + '<img class="project-thumb" src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy"'
      + ' onerror="this.closest(\'.work\').classList.add(\'is-empty\');this.remove();">'
      + '</button>'
      + '<div class="project-cue" aria-hidden="true"><span>View project</span></div>'
      + renderLabel(p, index)
      + '</article>';
  }

  function renderPlate(entry) {
    return '<div class="plate">'
      + '<p class="pt">' + esc(entry.description) + '</p>'
      + '<span class="py">' + esc(entry.year) + '</span></div>';
  }

  function renderRooms() {
    var strip = document.getElementById('strip');
    if (!strip) return;
    var rooms = Site.deriveRooms(PORTFOLIO.projects);
    var html = '';

    /* Room 1 — About */
    html += '<section class="room" data-room="About" data-snap>'
      + '<div class="sign"><span class="no">ROOM 1</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">About</span>'
      + '<span class="sub">' + esc(PORTFOLIO.title) + '</span></h2>'
      + '<div class="hang"><div class="work" style="width:31%">'
      + '<div class="pool"></div>'
      + '<div class="canvas"><img src="' + esc(PORTFOLIO.profileImage) + '" alt="' + esc(PORTFOLIO.name) + '"></div>'
      + '</div><div class="about-copy">'
      + PORTFOLIO.bio.map(function (p) { return '<p class="note">' + esc(p) + '</p>'; }).join('')
      + '<div class="about-links">'
      + PORTFOLIO.social.map(function (s) {
          return '<a class="plate-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">'
            + esc(s.label) + '</a>';
        }).join('')
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button>'
      + '</div></div></div></section>';

    /* Rooms 2..N — one per derived category */
    rooms.forEach(function (room, ri) {
      html += '<section class="room" data-room="' + esc(room.key) + '">'
        + '<div class="sign"><span class="no">ROOM ' + (ri + 2) + '</span><span class="rule"></span></div>'
        + '<h2 class="room-title"><span class="t">' + esc(room.title) + '</span>'
        + '<span class="sub">' + room.projects.length + ' works'
        + '<span class="count">' + esc(room.key.toUpperCase()) + '</span></span></h2>'
        + '<div class="hang">'
        + room.projects.map(function (p, i) { return renderWork(p, i); }).join('')
        + '</div></section>';
    });

    /* Leadership */
    html += '<section class="room" data-room="Leadership">'
      + '<div class="sign"><span class="no">ROOM ' + (rooms.length + 2) + '</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Leadership</span>'
      + '<span class="sub">Posts held<span class="count">' + PORTFOLIO.leadership.length + ' POSTS</span></span></h2>'
      + '<div class="hang hang--plates">'
      + PORTFOLIO.leadership.map(function (l, i) {
          var hasGallery = Array.isArray(l.images) && l.images.length > 0;
          var inner = '<p class="pt">' + esc(l.description) + '</p><span class="py">' + esc(l.year) + '</span>';
          return hasGallery
            ? '<button type="button" class="plate" data-gallery="leadership" data-entry="' + i + '">' + inner + '</button>'
            : '<div class="plate">' + inner + '</div>';
        }).join('')
      + '</div></section>';

    /* Honours */
    html += '<section class="room" data-room="Honours">'
      + '<div class="sign"><span class="no">ROOM ' + (rooms.length + 3) + '</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Honours</span>'
      + '<span class="sub">Competitions, conferences and citations'
      + '<span class="count">' + PORTFOLIO.honors.length + ' HONOURS</span></span></h2>'
      + '<div class="hang hang--plates">'
      + PORTFOLIO.honors.map(function (h, i) {
          var hasGallery = Array.isArray(h.images) && h.images.length > 0;
          if (!hasGallery) return renderPlate(h);
          return '<article class="work" data-work data-snap>'
            + '<div class="pool"></div>'
            + '<button type="button" class="project-hit canvas" data-gallery="honors"'
            + ' data-entry="' + i + '" aria-label="View photos: ' + esc(h.description) + '">'
            + '<img class="project-thumb" src="' + esc(h.images[0]) + '" alt="" loading="lazy">'
            + '</button>'
            + '<div class="lbl"><span class="no">DIST. ' + String(i + 1).padStart(2, '0')
            + '</span><p class="lt">' + esc(h.description) + '</p>'
            + '<p class="by">' + esc(h.year) + '</p></div></article>';
        }).join('')
      + '</div></section>';

    /* Contact */
    html += '<section class="room" data-room="Contact" data-snap>'
      + '<div class="sign"><span class="no">&mdash;</span><span class="rule"></span></div>'
      + '<h2 class="room-title"><span class="t">Contact</span>'
      + '<span class="sub">Thanks for walking the collection</span></h2>'
      + '<p class="note">Let&rsquo;s build something together.</p>'
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button></section>';

    strip.innerHTML = html;
  }

  function renderDirectory() {
    var dir = document.getElementById('directory');
    if (!dir) return;
    var rooms = Site.deriveRooms(PORTFOLIO.projects);
    var items = [{ key: 'About', title: 'About', note: 'bio & contact' }]
      .concat(rooms.map(function (r) {
        return { key: r.key, title: r.title, note: r.projects.length + ' works' };
      }))
      .concat([
        { key: 'Leadership', title: 'Leadership', note: PORTFOLIO.leadership.length + ' posts' },
        { key: 'Honours', title: 'Honours', note: PORTFOLIO.honors.length + ' honours' },
        { key: 'Contact', title: 'Contact', note: '—' }
      ]);
    dir.innerHTML = '<span class="dh">Rooms</span><ol>'
      + items.map(function (it, i) {
          return '<li><button type="button" class="room-link" data-goto="' + esc(it.key) + '">'
            + '<span class="rn">' + (it.key === 'Contact' ? '&mdash;' : 'Room ' + (i + 1)) + '</span>'
            + '<span class="rt">' + esc(it.title) + '</span>'
            + '<span class="rd">' + esc(it.note) + '</span></button></li>';
        }).join('')
      + '</ol>';
  }

  /* ════════════════════════════════════════════════════════════════════
     LIGHTING — a work's light rises as it arrives and never goes back out
     ════════════════════════════════════════════════════════════════════ */

  /* `--lit` is written to the .work element itself (a leaf-ish node), and it is
     registered `inherits: false` in css/styles.css. Never write an inherited
     custom property on a large subtree per frame: measured at 503ms of
     RecalcStyleDuration per 3s of scroll in a prior project. */
  function initLights() {
    var strip = document.getElementById('strip');
    var hall = document.getElementById('hall');
    if (!strip || !hall) return;

    var works = Array.prototype.slice.call(strip.querySelectorAll('[data-work]'));
    if (!works.length) return;

    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      works.forEach(function (w) { w.style.setProperty('--lit', '1'); });
      return;
    }

    /* Restored mid-walk on load: mark everything already passed as seen so the
       lighting does not sweep across the whole strip on the first frame. */
    var startMid = hall.scrollLeft + hall.clientWidth / 2;
    works.forEach(function (w) {
      if (w.offsetLeft + w.offsetWidth / 2 < startMid) w.dataset.seen = '1';
    });

    var ticking = false;
    function update() {
      var vw = hall.clientWidth;
      var mid = hall.scrollLeft + vw / 2;
      var centres = works.map(function (w) { return w.offsetLeft + w.offsetWidth / 2; });
      var active = Site.visibleWork(hall.scrollLeft, vw, centres);

      works.forEach(function (w, i) {
        var c = centres[i];
        var d = Math.abs(c - mid) / (vw * 0.62);
        var v = Math.max(0, 1 - d);
        v = v * v * (3 - 2 * v);                  /* smoothstep */
        if (i === active) v = 1;
        if (v > 0.5) w.dataset.seen = '1';
        var lit = (w.dataset.seen === '1') ? Math.max(v, 0.72) : v * 0.62;
        w.style.setProperty('--lit', lit.toFixed(3));
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }

    hall.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* Exposed so a test can re-run the controller against a seeded DOM, and so
     the renderer can relight after a re-render. */
  Site.initLights = initLights;

  /* ════════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════════ */

  function init() {
    /* The walk first: the renderer below fills #strip, and the MutationObserver
       in initWalk registers the snap targets as the rooms appear.
       The rooms are built from PORTFOLIO, so the gallery cannot drift from the
       data; the directory is the same list, printed at the top of the walk. */
    Site.walk = initWalk();

    renderDirectory();
    renderRooms();

    /* After the walk and the rooms, so the first update() sees real geometry:
       Lenis has measured the strip and every work has an offsetLeft. */
    initLights();

    /* renderNav() is deliberately not called: the nav it filled listed #News,
       #Projects and #Records, none of which exist in the walk any more. The
       directory above is the room navigation now. */
    renderHero();
    renderNews();
    renderProjects();
    renderLeadership();
    renderHonors();
    renderFooter();

    initRevealObserver();
    initVideoPlayback();
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
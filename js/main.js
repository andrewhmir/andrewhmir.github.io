/* ==========================================================================
   Portfolio Engine — Renders all content from data.js · Handles all UX
   No Bootstrap · No jQuery · Vanilla JS
   ========================================================================== */

(function () {
  'use strict';

  /* ── DOM References ─────────────────────────────────────────────── */
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

  /* The data-gallery / data-entry pair a piece carries is now scoped by the
     array the record lives in (`honors:3`), because both record arrays start
     their indices at 0 and a bare index would collide across rooms. This
     splits it back into the two arguments `Site.galleryFor` takes, and is
     total: anything that is not a scoped key opens nothing rather than
     falling through to a neighbour's photographs. */
  function openGalleryRef(ref) {
    var at = String(ref == null ? '' : ref).indexOf(':');
    if (at < 1) return;
    var kind = ref.slice(0, at);
    var index = Number(ref.slice(at + 1));
    if (!Number.isInteger(index) || index < 0) return;
    openGallery(kind, index);
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

  /* ── Event Delegation: the walk's controls ────────────────────────
     These are bound to `document`, not to a host element. The rooms are
     rendered into #strip after this file runs, and the host elements the old
     build used (#projectList, #honorsList, #leadershipList, #newsTimeline,
     #heroLinks) no longer exist — a handler bound to one of them would never
     fire, and every work, gallery row and email button would be inert. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var modalBtn = t.closest('[data-action="modal"]');
    if (modalBtn) { openModal(modalBtn.dataset.project, modalBtn.dataset.tab); return; }

    var galleryBtn = t.closest('[data-gallery]');
    if (galleryBtn) { openGalleryRef(galleryBtn.dataset.entry); return; }

    var copyBtn = t.closest('[data-action="copy"]');
    if (copyBtn) { copyToClipboard(copyBtn.dataset.copy, copyBtn); }
  });

  /* Host-bound gallery lists, kept for the containers that still exist. */
  function bindGalleryList($el) {
    if (!$el) return;
    $el.addEventListener('click', function (e) {
      const item = e.target.closest('[data-gallery]');
      if (!item) return;
      openGalleryRef(item.dataset.entry);
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

  /* A work's centre in PAGE coordinates — the same frame as hall.scrollLeft.
     `offsetLeft` alone is not that: it resolves against the nearest POSITIONED
     ancestor, which is .room (it is position: relative), not the strip. Reading
     it directly compares a room-local number against a viewport-global one, so
     each room ends up lighting whichever of its works is furthest right, and
     works fade again as you walk past them. offsetParent is walked instead, the
     way lenis-snap itself does. */
  function pageX(el) {
    var x = 0;
    for (var n = el; n; n = n.offsetParent) {
      x += n.offsetLeft || 0;
      if (n.offsetParent === n) break;      /* detached or body: stop */
    }
    return x;
  }

  function centreX(el) {
    return pageX(el) + el.offsetWidth / 2;
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

  function pieceLetter(i) {
    return String.fromCharCode(65 + i);
  }

  /* ── The cluster: how a group's photographs hang ────────────────────────
     A group is one exhibit: its photographs hang together as one composition
     rather than as N unrelated works.

     A frame is given a HEIGHT and its width follows its photograph, so every
     frame has its photograph's own proportions. The obvious alternative — a
     fixed width and height per slot — gives the frame an aspect ratio of its
     own, and then `object-fit: cover` crops a landscape photograph into a
     strip: a 271x104 frame for a 1.72:1 photograph is a 2.6:1 letterbox, and
     `contain` instead would leave black bars inside the mat. Neither is a
     photograph hung on a wall, so the frame takes the photograph's shape.

     WHICH columns hang, and which piece is the lead, comes from an
     arrangement — Site.hangLayout, dealt from the group's own key so
     neighbouring groups differ and a reload never reshuffles the wall. The
     heights themselves are `--lead-h` and `--sup-h` in css/styles.css. They
     cannot live here as `cqi` any more: a gallery is now as wide as its
     contents, so sizing a group from its own width is circular. The binding
     constraint on a single row is the room's height, which is what the
     stylesheet's clamps are cut from.

     Every frame clears 44x44 at every supported width, because those clamps'
     own pixel floors are above it. */

  /* A piece is a real focusable control: the whole frame opens the group's
     dialog, and its accessible name says which photograph it is. A piece whose
     photograph has not arrived is not a control at all — see the awaited
     branch below. */
  function renderCluster(pieces, layout, record, kind, entryIndex) {
    var title = record.title || record.description || '';
    var piece = function (p, i) {
      var open = groupOpener(kind, record, entryIndex, p);
      var lead = i === layout.lead;
      var label = open.name || (title + ' — photograph ' + pieceLetter(i));
      /* A photograph still waiting for its file has nothing to open, so it is
         not a button: a focusable control that does nothing when activated is
         worse than a frame that plainly is not one. */
      if (open.inert) {
        return '<span class="piece piece--pending' + (lead ? ' piece--lead' : '') + '"'
          + ' data-piece="' + i + '"'
          + ' role="img" aria-label="' + esc(label + ' — photograph awaited') + '"></span>';
      }
      return '<button type="button" class="piece' + (lead ? ' piece--lead' : '') + '"'
        + ' data-piece="' + i + '"' + open.attrs
        + ' aria-label="' + esc(label) + '"'
        + '><img src="' + esc(p.src) + '" alt="" loading="lazy"'
        + ' onerror="this.onerror=null;this.src=\'files/PlaceHolder.png\';"></button>';
    };
    /* An index the arrangement names but the pieces array does not hold is not
       hung as `undefined`: a malformed arrangement hangs fewer frames rather
       than a broken one. */
    var cols = layout.columns.map(function (indices, ci) {
      var hung = indices.filter(function (i) { return pieces[i]; })
        .map(function (i) { return piece(pieces[i], i); }).join('');
      return '<div class="col" style="padding-top:' + (layout.drop[ci] || 0) + 'px">' + hung + '</div>';
    });
    return '<div class="cluster" data-hang="' + esc(layout.name) + '">' + cols.join('') + '</div>';
  }

  /* What a piece does when activated. A project piece opens that project's
     dialog; a record piece opens the record's photographs. The gallery index
     is the record's own position in its array, so a record with no
     photographs can never open a neighbour's gallery — it has no handler at
     all, because there is nothing for it to open.

     The question is asked of the PIECE, not the record: a record with some
     photographs and some padding has real frames to open and empty ones that
     have nothing behind them, and both hang on the same wall. */
  function groupOpener(kind, record, entryIndex, piece) {
    if (piece && piece.awaited) return { attrs: '', name: '', inert: true };
    if (kind === 'project') {
      return {
        attrs: ' data-action="modal" data-project="' + esc(record.id) + '" data-tab="overview"',
        name: 'Open ' + (record.title || 'project')
      };
    }
    var hasPhotos = Array.isArray(record.images) && record.images.length > 0;
    if (!hasPhotos) return { attrs: '', name: '', inert: true };
    return {
      attrs: ' data-gallery="' + esc(kind) + '" data-entry="' + esc(entryIndex) + '"',
      name: ''
    };
  }

  function renderGroup(kind, index, record, roomKey) {
    var pieces = Site.groupPieces(record, kind);
    /* The entry key is scoped by room and by array. Project indices restart in
       every project room, and leadership and honors each start at 0, so a bare
       index would have rows on different walls claiming to be the same entry.
       For a gallery room the room key and the data array name are the same. */
    var entryKey = kind === 'project'
      ? roomKey + ':' + index
      : kind + ':' + index;
    /* The arrangement is dealt from the entry key, so two neighbouring groups
       almost never hang the same way and neither of them changes on reload. */
    var layout = Site.hangLayout(entryKey, pieces.length);
    return '<div class="group" data-group data-kind="' + esc(kind) + '"'
      + ' data-entry="' + esc(entryKey) + '">'
      + renderCluster(pieces, layout, record, kind, entryKey)
      + renderLabel(record, pieces, layout)
      + '</div>';
  }

  /* ── The exhibition label ───────────────────────────────────────────────
     One label per group, and it is where every photograph gets its text. The
     shape is the reference wall's: a plan of the hang, the narrative that
     frames the group, and a catalogue entry per photograph.

     Every level falls back rather than rendering an empty box, because the
     owner will not have written copy for every group on day one: a group with
     no `summary` narrates its own description, and a piece with no title is
     named for its position. */
  function labelTitle(record) {
    return record.title || record.description || '';
  }

  function labelMeta(record) {
    return record.venue || record.year || '';
  }

  function labelNarrative(record) {
    if (record.summary) return record.summary;
    /* A project's own framing is its first paragraph; a record has none. */
    if (record.overview && record.overview.text) {
      return String(record.overview.text).split('\n\n')[0];
    }
    return labelTitle(record);
  }

  /* The plan: the same composition the cluster hangs, drawn small. It is built
     from the ARRANGEMENT rather than from a piece count, so it cannot disagree
     with what is on the wall — not in its box count and not in its columns. A
     piece count could only ever draw one shape, and the wall hangs several. */
  function renderPlan(layout) {
    var cols = (layout && layout.columns) ? layout.columns : [];
    return '<div class="plan" aria-hidden="true">'
      + cols.map(function (indices) {
          return '<span class="pcol">' + indices.map(function (i) {
            return '<i class="pi' + (i === layout.lead ? ' pi-lead' : '') + '"></i>';
          }).join('') + '</span>';
        }).join('')
      + '</div>';
  }

  /* The technical line is derived, never authored, and is short: the file's own
     name, dashed stems turned into words. A full path or a warehouse word like
     "Event photograph" costs a line the label does not have — the row is 226px
     at the spec's floor and the label gets 60 of them.
     The placeholder is not a photograph a visitor can go and look at, so it is
     named for what it is rather than for its file. */
  function techLine(src) {
    var file = String(src || '').replace(/^.*\//, '');
    if (/^PlaceHolder\./i.test(file)) return 'Photograph awaited';
    return file
      .replace(/\.[a-z0-9]+$/i, '')
      /* A date-like run reads as a date, not as two words. */
      .replace(/-(\d{4})-/, ' $1 ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* One entry per photograph that exists, then a single line for however many
     are still awaited. A group whose photographs are all awaited would
     otherwise print "Photograph awaited" three times over, which is not a
     catalogue, it is a stutter. */
  var AWAITED_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

  function awaitedNote(n) {
    return '<p class="ca-note">' + (AWAITED_WORDS[n] || String(n))
      + ' photograph' + (n === 1 ? '' : 's') + ' awaited</p>';
  }

  function renderCatalogue(record, pieces) {
    var authored = Array.isArray(record.pieces) ? record.pieces : [];
    var list = Array.isArray(pieces) ? pieces : [];
    var out = '';
    var awaited = 0;
    list.forEach(function (piece, i) {
      if (piece.awaited) { awaited++; return; }
      var p = authored[i] || {};
      var letter = pieceLetter(i);
      out += '<div class="cat-entry" data-piece="' + i + '">'
        + '<p class="ce-title">'
        + (list.length > 1 ? '<span class="ce-key">' + letter + '</span>' : '')
        + esc(p.title || ('Photograph ' + letter)) + '</p>'
        + (p.caption ? '<p class="ce-cap">' + esc(p.caption) + '</p>' : '')
        + '<p class="ce-tech">' + esc(techLine(piece.src)) + '</p>'
        + '</div>';
    });
    return out + (awaited ? awaitedNote(awaited) : '');
  }

  /* One label per group, and it is a COLUMN beside the cluster rather than a
     strip across it: the plan of the hang, the narrative that frames the group,
     then a catalogue entry beneath another. `kind` and `index` used to be
     parameters here and neither was ever read. */
  function renderLabel(record, pieces, layout) {
    var list = Array.isArray(pieces) ? pieces : [];
    var title = labelTitle(record);
    var meta = labelMeta(record);
    return '<div class="label">'
      + renderPlan(layout)
      + '<div class="narr">'
      + '<p class="narr-title">' + esc(title) + '</p>'
      + (meta ? '<p class="narr-meta">' + esc(meta)
          + (list.length > 1 ? ' · ' + list.length + ' photographs' : '') + '</p>' : '')
      + '<p class="narr-text">' + esc(labelNarrative(record)) + '</p>'
      + '</div>'
      + '<div class="cat">' + renderCatalogue(record, list) + '</div>'
      + '</div>';
  }
  Site.renderLabel = renderLabel;

  function renderRooms() {
    var strip = document.getElementById('strip');
    if (!strip) return;
    var rooms = Site.deriveRooms(PORTFOLIO.projects);
    var html = '';

    /* Room 1 — About. Not a group: a portrait, the bio and the ways to
       reach him, hung as one composition.
       The portrait hangs in the same frame as everything else on the walk. It
       used to carry `.pool` and `.canvas`, whose rules are gone, so it was
       unstyled — and because neither element ever received a `--lit` write, the
       brightness they still read left the portrait permanently at 60% while
       every other work lit up. */
    html += '<section class="room" data-room="About" data-snap tabindex="-1">'
      + '<h2 class="room-title"><span class="t">About</span>'
      + '<span class="sub">' + esc(PORTFOLIO.title) + '</span></h2>'
      + '<div class="hang"><figure class="piece piece--portrait">'
      + '<img src="' + esc(PORTFOLIO.profileImage) + '" alt="' + esc(PORTFOLIO.name) + '">'
      + '</figure><div class="about-copy">'
      + PORTFOLIO.bio.map(function (p) { return '<p class="note">' + esc(p) + '</p>'; }).join('')
      + '<div class="about-links">'
      + PORTFOLIO.social.map(function (s) {
          return '<a class="plate-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">'
            + esc(s.label) + '</a>';
        }).join('')
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button>'
      + '</div></div></div></section>';

    /* Rooms 2..N — one per derived category. One project is one group. */
    rooms.forEach(function (room, ri) {
      var groups = room.projects.map(function (p, i) {
        return renderGroup('project', i, p, room.key);
      }).join('');
      html += '<section class="room" data-room="' + esc(room.key) + '" tabindex="-1">'
        + '<h2 class="room-title"><span class="t">' + esc(room.title) + '</span>'
        + '<span class="sub">' + room.projects.length + ' projects'
        + '<span class="count">' + esc(room.key.toUpperCase()) + '</span></span></h2>'
        + '<div class="groups">' + groups + '</div></section>';
    });

    /* Leadership — one post is one group. */
    html += '<section class="room" data-room="Leadership" tabindex="-1">'
      + '<h2 class="room-title"><span class="t">Leadership</span>'
      + '<span class="sub">Posts held<span class="count">' + PORTFOLIO.leadership.length
      + ' POSTS</span></span></h2>'
      + '<div class="groups">'
      + PORTFOLIO.leadership.map(function (l, i) {
          return renderGroup('leadership', i, l, 'Leadership');
        }).join('')
      + '</div></section>';

    /* Honours — one award or event is one group, with its photographs hung
       together. A record still waiting for its photographs hangs a labelled
       placeholder rather than a plate: on a near-black wall a bare frame is a
       conspicuous hole, and a plate would read as a different kind of thing
       from every other exhibit on the wall.

       Thirteen groups will not fit one room's grid of six, so the array is
       split in three. Each room keeps the true indices into PORTFOLIO.honors,
       because Site.galleryFor resolves against that unfiltered array. */
    honoursRooms().forEach(function (hr) {
      html += '<section class="room" data-room="' + esc(hr.key) + '" tabindex="-1">'
        + '<h2 class="room-title"><span class="t">' + esc(hr.label) + '</span>'
        + '<span class="sub">Competitions, conferences and citations'
        + '<span class="count">' + hr.records.length + ' GROUPS</span></span></h2>'
        + '<div class="groups">'
        + hr.records.map(function (h, i) {
            return renderGroup('honors', hr.offset + i, h, hr.key);
          }).join('')
        + '</div></section>';
    });

    /* Contact */
    html += '<section class="room" data-room="Contact" data-snap tabindex="-1">'
      + '<h2 class="room-title"><span class="t">Contact</span>'
      + '<span class="sub">Thanks for walking the collection</span></h2>'
      + '<p class="note">Let&rsquo;s build something together.</p>'
      + '<button type="button" class="plate-link lit" data-action="copy" data-copy="'
      + esc(PORTFOLIO.email) + '">' + esc(PORTFOLIO.email) + '</button></section>';

    strip.innerHTML = html;
  }

  /* ── The dock: the walk's directory, at its foot ────────────────────
     The dock shows a short name; the room heading keeps the full title, and
     the full title plus its count is the control's accessible name, so the
     shortened label is never what a screen reader reads. The short name comes
     from walkRooms(), which also names the rooms, so the two cannot drift. */
  var ROOM_SHORT = {
    About: 'About', Robotics: 'Robotics', Applications: 'Applications',
    Leadership: 'Leadership', 'Honours — I': 'Honours',
    'Honours — II': 'Honours II', 'Honours — III': 'Honours III',
    'Honours — IV': 'Honours IV', Contact: 'Contact'
  };

  /* The rooms the walk carries, in walk order — one source, so the dock and
     the walk cannot drift apart. */
  function walkRooms() {
    var rooms = [{ key: 'About', note: 'bio & contact' }];
    Site.deriveRooms(PORTFOLIO.projects).forEach(function (r) {
      rooms.push({ key: r.key, note: r.projects.length + ' projects' });
    });
    rooms.push({ key: 'Leadership', note: PORTFOLIO.leadership.length + ' groups' });
    honoursRooms().forEach(function (h) { rooms.push(h); });
    rooms.push({ key: 'Contact', note: '—' });
    return rooms;
  }

  /* The honours rooms, in walk order. Three of them, because a room holds six
     exhibits and there are thirteen honours. */
  function honoursRooms() {
    var parts = Site.honoursSplit(PORTFOLIO.honors).parts;
    var numerals = ['I', 'II', 'III', 'IV'];
    return parts.map(function (records, i) {
      return {
        key: 'Honours — ' + numerals[i],
        label: 'Honours · ' + numerals[i],
        short: i === 0 ? 'Honours' : 'Honours ' + numerals[i],
        note: records.length + ' groups',
        records: records,
        offset: parts.slice(0, i).reduce(function (n, p) { return n + p.length; }, 0)
      };
    }).filter(function (r) { return r.records.length > 0; });
  }

  function dockItems() {
    return walkRooms().map(function (r) {
      return { key: r.key, short: r.short, note: r.note };
    });
  }

  /* Pure: given the dock's room keys and the room the walk is in, which entry
     is current. Separated from the DOM write so a test can pin the marking
     without a layout engine. */
  function currentRoomMarkup(keys, current) {
    return (keys || []).map(function (key) {
      return { key: key, current: !!current && key === current };
    });
  }
  Site.currentRoomMarkup = currentRoomMarkup;

  function markCurrentRoom(key) {
    Site.currentRoom = key || null;
    var links = document.querySelectorAll('#directory .dock-link');
    var keys = [];
    for (var i = 0; i < links.length; i++) keys.push(links[i].getAttribute('data-goto'));
    var marked = currentRoomMarkup(keys, Site.currentRoom);
    var live = document.getElementById('dockCurrent');
    for (var j = 0; j < links.length; j++) {
      links[j].setAttribute('aria-current', marked[j].current ? 'true' : 'false');
      /* The narrow dock's live name is read from the control that owns it, so
         the short name has one source and the two cannot drift. */
      if (marked[j].current && live) {
        var dt = links[j].querySelector('.dt');
        live.textContent = (dt && dt.textContent) || Site.currentRoom || '';
      }
    }
  }
  Site.markCurrentRoom = markCurrentRoom;

  function renderDock() {
    var dir = document.getElementById('directory');
    if (!dir) return;
    var items = dockItems();
    dir.innerHTML = '<ol>'
      + items.map(function (it, i) {
          var acc = (it.key === 'Contact') ? '&mdash;' : String(i + 1);
          var short = ROOM_SHORT[it.key] || it.key;
          var name = 'Room ' + (i + 1) + ' — ' + it.key + ', ' + it.note;
          return '<li><button type="button" class="dock-link" data-goto="' + esc(it.key) + '"'
            + ' aria-label="' + esc(name) + '">'
            + '<span class="dn">' + acc + '</span>'
            + '<span class="dt">' + esc(short) + '</span></button></li>';
        }).join('')
      + '</ol>'
      /* The narrow dock's live name. It is a span beside the pips, so the
         current room stays named when the labels collapse — the alternative,
         scrolling the dock to find the aria-current control, is what shipped
         before and left five of eight rooms unnamed on a phone. */
      + '<span class="dock-live" id="dockCurrent" aria-hidden="true"></span>';
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

    /* The live region that names the room the walk is in (spec §9). It is set up
       before the lighting's early returns: announcing the room is independent of
       whether any work is currently lit, so a room of plates still announces
       itself. Only writes when the room changes, so scrolling does not spam a
       screen reader with the same name dozens of times a second. */
    var announcer = document.getElementById('announcer');
    var rail = document.getElementById('rail');
    var lastRoom = null;

    /* Which room the middle of the viewport is standing in. */
    function roomAt() {
      var mid = hall.scrollLeft + hall.clientWidth / 2;
      var rooms = strip.querySelectorAll('[data-room]');
      for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        var left = pageX(r), right = left + r.offsetWidth;
        if (mid >= left && mid < right) return r;
      }
      return null;
    }

    function announceRoom() {
      var r = roomAt();
      if (!r) return '';
      var titleEl = r.querySelector('.room-title .t');
      var name = (titleEl && titleEl.textContent) || r.getAttribute('data-room') || '';
      if (name && name !== lastRoom) {
        lastRoom = name;
        if (announcer) announcer.textContent = 'Room: ' + name;
        /* The dock follows the walk. Keyed on data-room, not the display
           title: the two differ where the dock shortens a name. */
        markCurrentRoom(r.getAttribute('data-room'));
      }
      return name;
    }
    Site.announceRoom = announceRoom;

    /* The rail is the walk's position, along the bottom edge. It replaced the
       native scrollbar, which cost every room 15px of height. */
    function updateRail() {
      if (!rail) return;
      var max = hall.scrollWidth - hall.clientWidth;
      rail.style.width = (max > 0 ? (hall.scrollLeft / max) * 100 : 0) + '%';
    }
    Site.updateRail = updateRail;

    /* The rail and the live region are not motion: they still have to work
       under `prefers-reduced-motion`. This is what the early return below
       falls back to, and it is what the lighting path calls once per frame. */
    function trackScroll() {
      announceRoom();
      updateRail();
    }

    function bindTracking() {
      /* Frame-throttled, like the lighting path: a scroll handler that writes
         two elements per event would do it dozens of times a frame. */
      var queued = false;
      var flush = function () {
        queued = false;
        trackScroll();
      };
      var onScrollTracking = function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(flush);
      };
      hall.addEventListener('scroll', onScrollTracking, { passive: true });
      window.addEventListener('resize', flush);
      trackScroll();
    }

    var works = Array.prototype.slice.call(strip.querySelectorAll('[data-piece]'));

    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Reduced motion removes the light falloff, not the walk's bookkeeping:
       returning here without binding was a real defect — under reduced motion
       the rail stayed empty and the dock never followed the walk, while the
       spec requires the live region to keep announcing and the rail to still
       be set. */
    if (reduce || !works.length) {
      works.forEach(function (w) { w.style.setProperty('--lit', '1'); });
      bindTracking();
      return;
    }

    /* Restored mid-walk on load: mark everything already passed as seen so the
       lighting does not sweep across the whole strip on the first frame. */
    var startMid = hall.scrollLeft + hall.clientWidth / 2;
    works.forEach(function (w) {
      if (centreX(w) < startMid) w.dataset.seen = '1';
    });

    var ticking = false;
    function update() {
      var vw = hall.clientWidth;
      var mid = hall.scrollLeft + vw / 2;
      var centres = works.map(centreX);
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

      trackScroll();
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }

    hall.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    /* Images carry loading="lazy" and no intrinsic size, so the strip's offsets
       shift as they arrive. Re-measure once everything has loaded; the scroll
       and resize paths keep it current after that. */
    window.addEventListener('load', function () { update(); }, { once: true });
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
       data; the directory is the same list. */
    Site.walk = initWalk();

    renderDock();
    renderRooms();

    /* After the walk and the rooms, so the first update() sees real geometry:
       Lenis has measured the strip and every work has an offsetLeft. */
    initLights();

    /* The walk has not scrolled yet, so the first room is the current one. */
    var firstRoom = document.querySelector('#strip .room');
    if (firstRoom) markCurrentRoom(firstRoom.getAttribute('data-room'));

    renderHero();
    renderNews();
    renderProjects();
    renderLeadership();
    renderHonors();
    renderFooter();

    initRevealObserver();
    initVideoPlayback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

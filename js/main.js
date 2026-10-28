/* ==========================================================================
   main.js — renders the Long Field profile page from PORTFOLIO
   POLISH PASS: reveals, film badges, full record dialog, journey rail.
   ========================================================================== */
(function () {
  'use strict';

  var P = window.PORTFOLIO;
  var S = window.Site;
  if (!P || !S) return;

  var PLACEHOLDER = 'files/PlaceHolder.png';
  var FALLBACK = ' onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'"';

  /* The pan: one crop of one painting per page stop, in page order. */
  var PAN = [
    { art: 'rice', pos: '50% 58%' },    /* hero */
    { art: 'harvest', pos: '48% 52%' }, /* about */
    { art: 'harvest', pos: '20% 26%' }, /* news */
    { art: 'rice', pos: '30% 62%' },    /* robotics */
    { art: 'harvest', pos: '64% 38%' }, /* applications */
    { art: 'rice', pos: '8% 44%' },     /* leadership */
    { art: 'harvest', pos: '88% 36%' }, /* honours */
    { art: 'rice', pos: '50% 88%' }     /* contact */
  ];

  /* The project view keeps each record's own crop from the old page order. */
  var PROJECT_ART = {
    project1: { art: 'rice', pos: '18% 56%' },
    project2: { art: 'harvest', pos: '78% 44%' },
    project3: { art: 'rice', pos: '76% 50%' },
    project4: { art: 'harvest', pos: '22% 66%' },
    project5: { art: 'rice', pos: '44% 22%' },
    project6: { art: 'harvest', pos: '56% 50%' }
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function paragraphs(text) {
    return String(text == null ? '' : text)
      .split(/\n{2,}/)
      .map(function (t) { return '<p>' + esc(t) + '</p>'; })
      .join('');
  }

  /* One painted panel. copy and media are trusted HTML built above. */
  function panel(o) {
    var s = document.createElement('section');
    s.className = 'stop art--' + o.art + (o.cls ? ' ' + o.cls : '');
    s.id = o.id;
    s.dataset.side = o.side;
    s.style.setProperty('--pos', o.pos);
    s.innerHTML =
      '<div class="stop-in">' +
        '<div class="copy' + (o.center ? ' copy--center' : '') + '" data-reveal>' + o.copy + '</div>' +
        (o.media ? '<div class="media" data-reveal>' + o.media + '</div>' : '') +
      '</div>';
    return s;
  }

  function isAwaited(src) { return !src || src === PLACEHOLDER; }

  function frame(o) {
    if (isAwaited(o.src)) {
      return '<div class="frame frame--awaited">' +
        '<div class="frame__inner">Awaiting photograph</div>' +
        '<span class="frame__label">' + esc(o.label) + '</span>' +
      '</div>';
    }
    return '<button class="frame' + (o.lead ? ' frame--lead' : '') + '" type="button" ' +
      'data-kind="project" data-index="' + o.index + '">' +
      '<img src="' + esc(o.src) + '" alt="' + esc(o.alt || o.label) + '" loading="lazy"' + FALLBACK + '>' +
      (o.label === 'Film' ? '<span class="frame__play" aria-hidden="true">▶</span>' : '') +
      '<span class="frame__label">' + esc(o.label) + '</span>' +
    '</button>';
  }

  function projectMedia(p, i) {
    var poster = S.posterFor(p.video);
    return '<div class="stack">' +
      frame({ src: p.overview && p.overview.image, label: 'Overview', lead: true, index: i, alt: p.title + ' — overview' }) +
      frame({ src: poster, label: 'Film', index: i, alt: p.title + ' — film still' }) +
      frame({ src: p.team && p.team.image, label: 'Team', index: i, alt: p.title + ' — team' }) +
    '</div>';
  }

  function projectCopy(p, i) {
    var awards = (p.awards && p.awards.length)
      ? '<ul class="awards">' + p.awards.map(function (a) {
          return '<li>' + esc(a.description) + ' — ' + esc(a.year) + '</li>';
        }).join('') + '</ul>'
      : '';
    return '<p class="eyebrow">' + esc(p.category) + ' · ' + esc(p.venue) + '</p>' +
      '<h2>' + esc(p.title) + '</h2>' +
      '<p class="lede">' + esc(p.tagline) + '</p>' +
      '<p class="body">' + esc(p.summary) + '</p>' +
      awards +
      '<button class="btn" type="button" data-kind="project" data-index="' + i + '">Open the record →</button>';
  }

  function awardCount(p) { return (p.awards && p.awards.length) || 0; }

  function categoryCopy(room) {
    var awards = room.projects.reduce(function (n, p) { return n + awardCount(p); }, 0);
    return '<p class="eyebrow">03 · Work · ' + esc(room.key) + '</p>' +
      '<h2>' + esc(room.key) + '.</h2>' +
      '<p class="lede">' + esc(room.lede) + '</p>' +
      '<p class="category-count">' + room.projects.length + ' projects · ' +
        awards + (awards === 1 ? ' award' : ' awards') + '</p>';
  }

  function categoryCards(room) {
    return '<div class="category-cards">' + room.projects.map(function (p) {
      var i = P.projects.indexOf(p);
      var n = awardCount(p);
      var meta = n ? n + (n === 1 ? ' award' : ' awards') : p.venue;
      return '<button class="project-card" type="button" data-kind="panel" data-index="' + i + '">' +
        '<span class="project-card__art"><img src="' + esc(p.overview && p.overview.image) +
          '" alt="' + esc(p.title + ' — overview') + '" loading="lazy"' + FALLBACK + '></span>' +
        '<span class="project-card__body">' +
          '<span class="project-card__title">' + esc(p.title) + '</span>' +
          '<span class="project-card__tag">' + esc(p.tagline) + '</span>' +
          '<span class="project-card__meta">' + esc(meta) + '</span>' +
        '</span></button>';
    }).join('') + '</div>';
  }

  /* ── the page ───────────────────────────────────────────────────── */

  function render() {
    var page = document.getElementById('page');
    if (!page) return;

    var out = [];

    /* 0 — hero */
    out.push(panel({
      id: 'top',
      cls: 'stop--hero',
      side: 'center',
      art: PAN[0].art,
      pos: PAN[0].pos,
      copy:
        '<h1>' + esc(P.name) + '</h1>' +
        '<p class="hero-title">' + esc(P.title) + '</p>' +
        '<p class="hero-line">' + esc(P.bio[3] || P.bio[2] || '') + '</p>' +
        '<div class="actions">' +
          '<a class="btn btn--solid" href="#work">See the work →</a>' +
          '<a class="btn" href="' + esc((P.social[0] && P.social[0].url) || '#') + '">Resume ↗</a>' +
        '</div>'
    }));

    /* 1 — about */
    out.push(panel({
      id: 'about',
      side: 'left',
      art: PAN[1].art,
      pos: PAN[1].pos,
      copy:
        '<p class="eyebrow">01 · About</p>' +
        '<h2>Andrew Alangcao</h2>' +
        '<div class="body">' + P.bio.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') + '</div>' +
        '<div class="actions">' + P.social.map(function (s) {
          return '<a class="btn" href="' + esc(s.url) + '">' + esc(s.label) + ' ↗</a>';
        }).join('') + '</div>',
      media:
        '<figure class="portrait">' +
          '<img src="files/profile.jpg" alt="Portrait of Andrew Alangcao" width="585" height="766" loading="lazy">' +
          '<figcaption>Laufey: A Night at the Symphony · PICC Plenary Hall, May 28, 2024</figcaption>' +
        '</figure>'
    }));

    /* 2 — news */
    out.push(panel({
      id: 'news',
      cls: 'stop--list stop--news',
      side: 'right',
      art: PAN[2].art,
      pos: PAN[2].pos,
      copy:
        '<p class="eyebrow">02 · News</p>' +
        '<h2>Milestones.</h2>' +
        '<p class="body">Roles, talks and firsts, newest first.</p>' +
        '<ol class="news">' + P.news.map(function (n) {
          return '<li class="news-row">' +
            '<span class="news-row__date">' + esc(n.date) + '</span>' +
            '<span class="news-row__text">' + esc(n.text) + '</span>' +
          '</li>';
        }).join('') + '</ol>'
    }));

    /* 3 — work (one panel per category, wrapped so #work lands on the first) */
    var work = document.createElement('div');
    work.className = 'work';
    work.id = 'work';
    S.deriveRooms(P.projects).forEach(function (room, r) {
      work.appendChild(panel({
        id: room.key.toLowerCase(),
        cls: 'stop--project stop--category',
        side: r % 2 === 0 ? 'left' : 'right',
        art: PAN[3 + r].art,
        pos: PAN[3 + r].pos,
        copy: categoryCopy(room),
        media: categoryCards(room)
      }));
    });
    out.push(work);

    /* 4 — leadership */
    out.push(panel({
      id: 'leadership',
      side: 'left',
      art: PAN[5].art,
      pos: PAN[5].pos,
      copy:
        '<p class="eyebrow">04 · Leadership</p>' +
        '<h2>Running things.</h2>' +
        '<p class="body">Four committees and clubs between 2023 and 2026: a research club founded from nothing, a student-council seat held for two years, the school’s events week run twice, and the media team that covered all of it.</p>',
      media: '<div class="leaders">' + P.leadership.map(function (r, i) {
        var thumb = (r.images && r.images[0]) || PLACEHOLDER;
        var thumbHtml = isAwaited(thumb)
          ? '<span class="leader__thumb leader__thumb--empty" aria-hidden="true">no photo</span>'
          : '<img class="leader__thumb" src="' + esc(thumb) + '" alt="' + esc(r.description) + '" loading="lazy"' + FALLBACK + '>';
        return '<button class="leader" type="button" data-kind="leadership" data-index="' + i + '">' +
          thumbHtml +
          '<span class="leader__body">' +
            '<span class="leader__year">' + esc(r.year) + '</span>' +
            '<span class="leader__text">' + esc(r.description) + '</span>' +
          '</span>' +
        '</button>';
      }).join('') + '</div>'
    }));

    /* 5 — honours */
    var tiles = S.honoursTiles(P.honors).tiles;
    out.push(panel({
      id: 'honours',
      cls: 'stop--list',
      side: 'left',
      art: PAN[6].art,
      pos: PAN[6].pos,
      copy:
        '<p class="eyebrow">05 · Honours</p>' +
        '<h2>Recognised here and abroad.</h2>' +
        '<p class="body">The standalone honours, newest first. Awards a project won hang on that project’s own panel — they are not repeated here.</p>',
      media: '<ol class="honours">' + tiles.map(function (t) {
        var r = t.record;
        var hasPhotos = !!(r.images && r.images.length);
        return '<li><button class="honour-row" type="button" data-kind="honors" data-index="' + t.index + '"' +
          (hasPhotos ? '' : ' disabled') + '>' +
          '<span class="honour-row__year">' + esc(r.year) + '</span>' +
          '<span class="honour-row__text">' + esc(r.description) + '</span>' +
          '<span class="honour-row__mark" aria-hidden="true">' + (hasPhotos ? '◦' : '') + '</span>' +
        '</button></li>';
      }).join('') + '</ol>'
    }));

    /* 6 — contact */
    out.push(panel({
      id: 'contact',
      cls: 'stop--contact',
      side: 'center',
      art: PAN[7].art,
      pos: PAN[7].pos,
      center: true,
      copy:
        '<p class="eyebrow">06 · Contact</p>' +
        '<h2>Let’s build something.</h2>' +
        '<p class="lede">Open to work, research, and collaborations that make everyday life a little easier.</p>' +
        '<a class="contact-mail" href="mailto:' + esc(P.email) + '">' + esc(P.email) + '</a>' +
        '<div class="contact-links">' + P.social.map(function (s) {
          return '<a href="' + esc(s.url) + '">' + esc(s.label) + '</a>';
        }).join('') + '</div>'
    }));

    page.innerHTML = '';
    out.forEach(function (node) { page.appendChild(node); });
  }

  /* ── the dialog ─────────────────────────────────────────────────── */

  var dialog = document.getElementById('dialog');
  var dialogTitle = document.getElementById('dialogTitle');
  var dialogMeta = document.getElementById('dialogMeta');
  var dialogBody = document.getElementById('dialogBody');
  var dialogClose = document.getElementById('dialogClose');
  var dialogCard = dialog && dialog.querySelector('.dialog__card');
  var lastFocus = null;
  var scrollEngine = null;   /* the vendored Lenis controller, when motion is allowed */

  function gallery(images, title) {
    var list = (images || []).filter(function (src) { return src && src !== PLACEHOLDER; });
    if (!list.length) return '';
    return '<div class="dialog__gallery">' + list.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="' + esc(title) + ' — photograph ' + (i + 1) + '" loading="lazy"' + FALLBACK + '>';
    }).join('') + '</div>';
  }

  function openRecord(kind, index) {
    if (!dialog) return;
    var title = '';
    var meta = '';
    var body = '';
    var images = [];
    var videoHtml = '';

    if (kind === 'project') {
      var p = P.projects[index];
      if (!p) return;
      title = p.title;
      meta = [p.category, p.venue].filter(Boolean).join(' · ');
      if (p.video) {
        videoHtml = '<video class="dialog__video" src="' + esc(p.video) + '" poster="' +
          esc(S.posterFor(p.video)) + '" controls muted loop playsinline preload="metadata"></video>';
      }
      body += '<p>' + esc(p.summary) + '</p>';
      body += paragraphs(p.overview && p.overview.text);
      if (p.team && p.team.text && p.team.text.length) {
        body += '<h4>The team</h4>' + p.team.text.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
      }
      if (p.awards && p.awards.length) {
        body += '<h4>Awards</h4><ul>' + p.awards.map(function (a) {
          return '<li>' + esc(a.description) + ' — ' + esc(a.year) + '</li>';
        }).join('') + '</ul>';
      }
      if (p.links && p.links.length) {
        body += '<h4>Links</h4><ul>' + p.links.map(function (l) {
          return '<li><a href="' + esc(l.url) + '">' + esc(l.label) + ' ↗</a></li>';
        }).join('') + '</ul>';
      }
      images = [p.overview && p.overview.image, S.posterFor(p.video), p.team && p.team.image];
    } else if (kind === 'leadership') {
      var r = P.leadership[index];
      if (!r) return;
      title = r.description;
      meta = r.year;
      body = paragraphs(r.summary);
      images = r.images || [];
    } else {
      var h = P.honors[index];
      if (!h) return;
      title = h.description;
      meta = h.year;
      body = paragraphs(h.summary);
      images = h.images || [];
    }

    dialogTitle.textContent = title;
    dialogMeta.textContent = meta;
    dialogBody.innerHTML = videoHtml + body + (images.length ? '<h4>Photographs</h4>' + gallery(images, title) : '');

    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    if (scrollEngine) scrollEngine.stop();   /* the dialog scrolls itself, not the page */
    if (dialogCard) dialogCard.focus();
  }

  function closeDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.style.overflow = '';
    if (scrollEngine) scrollEngine.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  if (dialog) {
    dialogClose.addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
    document.addEventListener('keydown', function (e) {
      if (dialog.hidden) return;
      if (e.key === 'Escape') { closeDialog(); return; }
      if (e.key !== 'Tab' || !dialogCard) return;
      var f = dialogCard.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ── rail, masthead, progress, reveals ──────────────────────────── */

  /* Builds the journey line only. The active stop and the progress fill are
     driven from wireChrome, which owns the scroll geometry. */
  function buildRail() {
    var rail = document.getElementById('rail');
    if (!rail) return;
    var labels = [{ id: 'about', label: 'About' }];
    labels.push({ id: 'news', label: 'News' });
    S.deriveRooms(P.projects).forEach(function (room) {
      labels.push({ id: room.key.toLowerCase(), label: room.key });
    });
    labels.push({ id: 'leadership', label: 'Leadership' });
    labels.push({ id: 'honours', label: 'Honours' });
    labels.push({ id: 'contact', label: 'Contact' });
    rail.innerHTML = labels.map(function (s) {
      return '<a class="rail__stop" href="#' + esc(s.id) + '" data-stop="' + esc(s.id) + '"><span>' +
        esc(s.label) + '</span></a>';
    }).join('');
  }

  function wireReveals() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  function wireChrome() {
    var resume = document.getElementById('resumeLink');
    var resumeLink = P.social.filter(function (s) { return s.label === 'Resume'; })[0] || P.social[0];
    if (resume && resumeLink) resume.href = resumeLink.url;

    var masthead = document.getElementById('masthead');
    var progress = document.getElementById('progress');
    var rail = document.getElementById('rail');
    var hero = document.getElementById('top');
    var sections = document.querySelectorAll('#page .stop[id]');
    var railStops = rail ? rail.querySelectorAll('.rail__stop') : [];
    var ticking = false;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EASE = 0.18;   /* per-frame approach: the fill glides between ticks */
    var target = 0;      /* rail fill length for the active tick, in px */
    var shown = 0;
    var targetFrac = 0;  /* small-screen hairline: sections reached / total */
    var shownFrac = 0;
    var active = '';
    var frame = 0;
    var painted = false;

    /* The active section is the one covering the viewport middle: the cue flips
       exactly as the boundary between two panels crosses the centre. When the
       middle falls in the gutter between two panels, the section just passed
       stays current, so the tick does not blink back. */
    function activeSection(rects) {
      var mid = window.innerHeight / 2;
      var passed = '';
      for (var i = 0; i < rects.length; i++) {
        if (rects[i].top <= mid && rects[i].bottom > mid) return sections[i].id;
        if (rects[i].top <= mid) passed = sections[i].id;
      }
      return passed;
    }

    /* Where a section's tick sits on the fill (the fill ends at its centre) and
       how much of the seven-stop journey it represents for the phone hairline. The
       track starts at the first tick's centre, so the first stop is 0 and the
       last stop's fill length is the whole line. */
    function railTarget(id) {
      if (!railStops.length) return { px: 0, frac: 0 };
      var origin = railStops[0].offsetTop + railStops[0].offsetHeight / 2;
      for (var i = 0; i < railStops.length; i++) {
        if (railStops[i].getAttribute('data-stop') !== id) continue;
        var centre = railStops[i].offsetTop + railStops[i].offsetHeight / 2;
        return { px: Math.max(0, centre - origin), frac: (i + 1) / railStops.length };
      }
      return { px: 0, frac: 0 };
    }

    /* Continuous but anchored: the fill reaches a section's tick when that
       panel's top reaches the viewport top, and travels proportionally between
       the two ticks while the page crosses from one panel to the next — so it
       sits midway when the viewport is split between two panels. */
    function fillTarget(rects) {
      var k = -1;
      for (var i = 0; i < rects.length; i++) if (rects[i].top <= 0) k = i;
      if (k < 0) return { px: 0, frac: 0 };
      var from = railTarget(sections[k].id);
      var next = sections[k + 1];
      if (!next) return from;
      var span = rects[k + 1].top - rects[k].top;
      var t = span > 0 ? Math.min(1, Math.max(0, -rects[k].top / span)) : 1;
      var to = railTarget(next.id);
      return {
        px: from.px + (to.px - from.px) * t,
        frac: from.frac + (to.frac - from.frac) * t
      };
    }

    function draw() {
      if (rail) rail.style.setProperty('--rail-progress', shown.toFixed(1) + 'px');
      if (progress) progress.style.width = (shownFrac * 100).toFixed(2) + '%';
    }

    function paint() {
      frame = 0;
      shown += (target - shown) * EASE;
      shownFrac += (targetFrac - shownFrac) * EASE;
      var settled = Math.abs(target - shown) < 0.5 && Math.abs(targetFrac - shownFrac) < 0.001;
      if (settled) { shown = target; shownFrac = targetFrac; }
      draw();
      if (!settled) frame = window.requestAnimationFrame(paint);
    }

    function update() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var heroH = hero ? hero.offsetHeight : 0;
      if (masthead) masthead.classList.toggle('is-stuck', y > Math.max(120, heroH - 72));

      var rects = [];
      for (var i = 0; i < sections.length; i++) rects.push(sections[i].getBoundingClientRect());

      var id = activeSection(rects);
      if (id !== active) {
        active = id;
        for (var j = 0; j < railStops.length; j++) {
          railStops[j].classList.toggle('is-active', railStops[j].getAttribute('data-stop') === id);
        }
      }

      var t = fillTarget(rects);
      target = t.px;
      targetFrac = t.frac;
      /* First paint (including a reload that starts mid-page) and reduced motion
         jump straight to the value; otherwise the fill eases after the scroll. */
      if (!painted || reduced) {
        painted = true;
        shown = target;
        shownFrac = targetFrac;
        draw();
      } else if (!frame) {
        frame = window.requestAnimationFrame(paint);
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', function () {
      active = null;               /* the rail may have been hidden when measured */
      update();
    }, { passive: true });
    update();
  }

  /* Smooth scrolling: the vendored Lenis library smooths the wheel only. Touch
     and the keyboard stay native, and under reduced motion — or if the script
     did not load — nothing is constructed, so the page keeps the browser's own
     scrolling and the stylesheet's smooth anchor travel. Anchor clicks are sent
     through Lenis so the CSS scroll-margin-top clearance is preserved. */
  function wireSmoothScroll() {
    if (!window.Lenis) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var lenis = new window.Lenis({ autoRaf: true });
    scrollEngine = {
      lenis: lenis,
      stop: function () { lenis.stop(); },
      start: function () { lenis.start(); }
    };

    /* Lenis subtracts the target's own scroll-margin top itself — the CSS
       masthead clearance on .stop. Targets without one (the #work wrapper and
       #page) need the panels' clearance passed as an offset instead. */
    var pageStop = document.querySelector('.stop');

    document.addEventListener('click', function (e) {
      /* Modified clicks belong to the browser (new tab, download), and the skip
         link must keep its native jump: that jump is what moves the sequential
         focus starting point into #page. */
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link || link.classList.contains('skip') || link.getAttribute('href') === '#') return;
      var hash = link.getAttribute('href');
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      var margin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      if (margin) {
        lenis.scrollTo(target);
      } else {
        var clearance = pageStop ? (parseFloat(window.getComputedStyle(pageStop).scrollMarginTop) || 0) : 0;
        lenis.scrollTo(target, { offset: -clearance });
      }
      if (window.history && history.pushState && location.hash !== hash) {
        history.pushState(null, '', hash);
      }
    });
  }

  function wireDelegation() {
    var page = document.getElementById('page');
    if (!page) return;
    page.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-kind][data-index]') : null;
      if (!t || t.disabled) return;
      openRecord(t.getAttribute('data-kind'), Number(t.getAttribute('data-index')));
    });
  }

  function init() {
    render();
    buildRail();
    wireReveals();
    wireChrome();
    wireDelegation();
    wireSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Published for the eventual guard suite and for manual probing. */
  window.Profile = {
    render: render,
    openRecord: openRecord,
    closeDialog: closeDialog,
    get lenis() { return scrollEngine ? scrollEngine.lenis : null; }
  };
})();

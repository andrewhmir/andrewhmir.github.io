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

  /* The pan: one crop of one painting per stop, in page order. */
  var PAN = [
    { art: 'rice', pos: '50% 58%' },    /* hero */
    { art: 'harvest', pos: '48% 52%' }, /* about */
    { art: 'rice', pos: '18% 56%' },    /* project 1 */
    { art: 'harvest', pos: '78% 44%' }, /* project 2 */
    { art: 'rice', pos: '76% 50%' },    /* project 3 */
    { art: 'harvest', pos: '22% 66%' }, /* project 4 */
    { art: 'rice', pos: '44% 22%' },    /* project 5 */
    { art: 'harvest', pos: '56% 50%' }, /* project 6 */
    { art: 'rice', pos: '8% 44%' },     /* leadership */
    { art: 'harvest', pos: '88% 36%' }, /* honours */
    { art: 'rice', pos: '50% 88%' }     /* contact */
  ];

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
      '</div>' +
      (o.cue ? '<span class="hero-cue" aria-hidden="true">Scroll — the field goes on</span>' : '');
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
      cue: true,
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
        '<h2>A record of the pursuit.</h2>' +
        '<div class="body">' + P.bio.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') + '</div>' +
        '<div class="actions">' + P.social.map(function (s) {
          return '<a class="btn" href="' + esc(s.url) + '">' + esc(s.label) + ' ↗</a>';
        }).join('') + '</div>',
      media:
        '<figure class="portrait">' +
          '<img src="files/profile.jpg" alt="Portrait of Andrew Alangcao" width="585" height="766" loading="lazy">' +
          '<figcaption>Andrew Alangcao · Muntinlupa</figcaption>' +
        '</figure>'
    }));

    /* 2 — work (six project panels, wrapped so #work lands on the first) */
    var work = document.createElement('div');
    work.className = 'work';
    work.id = 'work';
    P.projects.forEach(function (p, i) {
      work.appendChild(panel({
        id: p.id,
        cls: 'stop--project',
        side: i % 2 === 0 ? 'left' : 'right',
        art: PAN[2 + i].art,
        pos: PAN[2 + i].pos,
        copy: projectCopy(p, i),
        media: projectMedia(p, i)
      }));
    });
    out.push(work);

    /* 3 — leadership */
    out.push(panel({
      id: 'leadership',
      side: 'left',
      art: PAN[8].art,
      pos: PAN[8].pos,
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

    /* 4 — honours */
    var tiles = S.honoursTiles(P.honors).tiles;
    out.push(panel({
      id: 'honours',
      cls: 'stop--list',
      side: 'left',
      art: PAN[9].art,
      pos: PAN[9].pos,
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

    /* 5 — contact */
    out.push(panel({
      id: 'contact',
      cls: 'stop--contact',
      side: 'center',
      art: PAN[10].art,
      pos: PAN[10].pos,
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
    if (dialogCard) dialogCard.focus();
  }

  function closeDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.style.overflow = '';
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

  function buildRail() {
    var rail = document.getElementById('rail');
    if (!rail) return;
    var labels = [{ id: 'about', label: 'About' }];
    P.projects.forEach(function (p) { labels.push({ id: p.id, label: p.title }); });
    labels.push({ id: 'leadership', label: 'Leadership' });
    labels.push({ id: 'honours', label: 'Honours' });
    labels.push({ id: 'contact', label: 'Contact' });
    rail.innerHTML = labels.map(function (s) {
      return '<a class="rail__stop" href="#' + esc(s.id) + '" data-stop="' + esc(s.id) + '"><span>' +
        esc(s.label) + '</span></a>';
    }).join('');

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        rail.querySelectorAll('.rail__stop').forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('data-stop') === id);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    document.querySelectorAll('.stop[id]').forEach(function (s) { io.observe(s); });
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
    var hero = document.getElementById('top');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var heroH = hero ? hero.offsetHeight : 0;
      if (masthead) masthead.classList.toggle('is-stuck', y > Math.max(120, heroH - 72));
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Published for the eventual guard suite and for manual probing. */
  window.Profile = { render: render, openRecord: openRecord, closeDialog: closeDialog };
})();

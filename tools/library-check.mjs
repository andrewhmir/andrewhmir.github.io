/* tools/library-check.mjs — the agent component library's validator.

   The library (docs/library/) is hand-written documentation that claims to know
   where every component lives. Claims rot; this tool is the anti-rot. It parses
   the pages, resolves every cited anchor against the real source files, and
   enforces coverage in both directions: a new CSS class, shell id, data-*
   attribute or PORTFOLIO field must be named in the library, and a documented
   path or selector must still exist.

   It exports its checks so tests/library.test.mjs can run them in-process with
   the repo's harness (no node --test, no test framework). CLI usage:

     node tools/library-check.mjs                 all checks
     node tools/library-check.mjs --page <path>  one page (V2-V4, V9)

   Reads only; writes nothing. Node built-ins only. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const LIB = 'docs/library';
const COMPONENT_DIR = LIB + '/components';
const PRIMITIVE_DIR = LIB + '/primitives';
const COMPONENT_PAGES = [
  'page-shell', 'masthead', 'rail', 'panel', 'hero', 'about', 'project',
  'frames', 'leadership', 'honours', 'contact', 'footer', 'dialog',
  'reveals-chrome',
];
const PRIMITIVE_PAGES = ['tokens', 'type', 'controls', 'responsive'];
const PAGE_FILES = [
  ...COMPONENT_PAGES.map((p) => COMPONENT_DIR + '/' + p + '.md'),
  ...PRIMITIVE_PAGES.map((p) => PRIMITIVE_DIR + '/' + p + '.md'),
];
const INDEX_FILES = [LIB + '/README.md', LIB + '/selectors.md', LIB + '/data.md'];
const REQUIRED_H2 = ['Where it lives', 'Adjust it', 'Invariants', 'Traps'];
const ALLOWED_H2 = new Set([...REQUIRED_H2, 'Structure']);
const ROLES = new Set(['Markup', 'Render', 'Styles', 'Data', 'Test', 'Assets']);
const RUNTIME_FILES = ['index.html', 'css/styles.css', 'js/main.js', 'js/data.js'];

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const clean = (p) => path.posix.normalize(p).replace(/\\/g, '/');
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

function mdFilesIn(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => dir + '/' + f);
}
function pageFiles() { return [...mdFilesIn(COMPONENT_DIR), ...mdFilesIn(PRIMITIVE_DIR)]; }
function libraryFiles() { return [...pageFiles(), ...INDEX_FILES].filter(exists); }
function libraryText() { return libraryFiles().map((f) => read(f)).join('\n'); }

/* A full run must not pass vacuously while page files are still missing; the
   coverage and index checks assume the page inventory is complete. */
function requirePages(pageOnly) {
  if (pageOnly) return;
  const missing = PAGE_FILES.filter((f) => !exists(f));
  if (missing.length) throw new Error(`missing pages: ${missing.join(' ')}`);
}

/* A class/token counts only on a word boundary, so `.rail` is not satisfied by
   a longer `.rail__stop` mention (each declared class must be named on its own). */
function mentions(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![A-Za-z0-9_-])' + escaped + '(?![A-Za-z0-9_-])').test(text);
}

/* ── shared parsing ────────────────────────────────────────────────── */

function linesOf(file) { return read(file).split(/\r?\n/); }

function sectionAfter(file, heading) {
  const lines = linesOf(file);
  const start = lines.findIndex((l) => l.trim() === '## ' + heading);
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end < 0 ? lines.length : end);
}

function whereRows(file) {
  const rows = [];
  for (const raw of sectionAfter(file, 'Where it lives')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells[0] === 'Role' || /^:?-{2,}/.test(cells[0].replace(/:/g, ''))) continue;
    const role = cells[0].replace(/`/g, '').trim();
    const fileCell = (cells[1] || '').replace(/`/g, '').trim();
    const anchorCell = cells[2] || '';
    const anchors = [...anchorCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    rows.push({ role, file: clean(fileCell), anchors, line: raw.trim() });
  }
  return rows;
}

function loadPortfolio() {
  const ctx = {};
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/data.js'), ctx);
  if (!ctx.PORTFOLIO) throw new Error('js/data.js did not publish PORTFOLIO');
  return { P: ctx.PORTFOLIO, S: ctx.Site || {} };
}

function hasPath(obj, keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, k)) return false;
    cur = cur[k];
  }
  return true;
}

/* The Data anchor grammar: field, collection[].field, collection[].a.b,
   optional trailing ! meaning "on every record". */
function resolveDataToken(P, S, token) {
  let t = String(token).trim();
  const required = t.endsWith('!');
  if (required) t = t.slice(0, -1);
  if (t.startsWith('Site.')) {
    const name = t.slice(5);
    if (!Object.prototype.hasOwnProperty.call(S, name)) throw new Error(`Site has no "${name}"`);
    return;
  }
  if (!t.includes('[]')) {
    if (!Object.prototype.hasOwnProperty.call(P, t)) throw new Error(`PORTFOLIO has no top-level "${t}"`);
    return;
  }
  const m = t.match(/^([a-z][A-Za-z0-9_]*)\[\](?:\.([A-Za-z0-9_.]+))?$/);
  if (!m) throw new Error(`unparseable data path "${token}"`);
  const coll = m[1];
  const chain = m[2] ? m[2].split('.') : [];
  const records = P[coll];
  if (!Array.isArray(records)) throw new Error(`PORTFOLIO.${coll} is not an array`);
  const total = records.length;
  const present = records.filter((r) => hasPath(r, chain)).length;
  if (required && chain.length && present !== total) {
    throw new Error(`${coll} has ${total - present}/${total} records missing "${chain.join('.')}"`);
  }
  if (chain.length && present === 0) throw new Error(`no ${coll} record has "${chain.join('.')}"`);
}

/* ── V1: index consistency ─────────────────────────────────────────── */

function v1() {
  if (!exists(LIB + '/README.md')) throw new Error(`${LIB}/README.md does not exist`);
  const readme = read(LIB + '/README.md');
  const linked = [...readme.matchAll(/\]\(([^)\s]+\.md)\)/g)]
    .map((m) => clean(path.posix.join(LIB, m[1])));
  for (const page of PAGE_FILES) {
    if (!linked.includes(page)) throw new Error(`${page} is not linked from README.md`);
  }
  for (const idx of [LIB + '/selectors.md', LIB + '/data.md']) {
    if (!linked.includes(idx)) throw new Error(`README.md does not link ${idx}`);
  }
  for (const file of pageFiles()) {
    if (!PAGE_FILES.includes(file)) throw new Error(`${file} exists but is not in the page inventory`);
    if (!linked.includes(file)) throw new Error(`${file} exists but README.md does not link it`);
  }
  for (const link of linked) {
    if (!exists(link)) throw new Error(`README.md links ${link}, which does not exist`);
  }
  // Every cross-link between library files must resolve too, not just README's.
  for (const file of libraryFiles()) {
    const dir = path.posix.dirname(clean(file));
    for (const m of read(file).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|#|mailto:)/.test(target)) continue;
      const resolved = clean(path.posix.join(dir, target));
      if (!exists(resolved)) throw new Error(`${file}: link ${target} does not resolve to ${resolved}`);
    }
  }
}

/* ── V2: page format ───────────────────────────────────────────────── */

function v2(pageOnly) {
  requirePages(pageOnly);
  const files = pageOnly ? [clean(pageOnly)] : pageFiles();
  for (const file of files) {
    if (!exists(file)) throw new Error(`${file} does not exist`);
    const lines = linesOf(file);
    if (!/^# \S/.test(lines[0] || '')) throw new Error(`${file}: line 1 must be an H1`);
    const h2 = lines.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.l.startsWith('## '));
    if (!h2.length) throw new Error(`${file}: has no H2 sections`);
    const purpose = lines.slice(1, h2[0].i).some((l) => l.trim() && !l.trim().startsWith('#'));
    if (!purpose) throw new Error(`${file}: needs a one-line purpose before the first H2`);
    for (const name of REQUIRED_H2) {
      const n = h2.filter((x) => x.l === '## ' + name).length;
      if (n !== 1) throw new Error(`${file}: needs exactly one "## ${name}" heading (found ${n})`);
    }
    for (const x of h2) {
      const name = x.l.slice(3).trim();
      if (!ALLOWED_H2.has(name)) throw new Error(`${file}: unknown heading "## ${name}"`);
    }
    const count = lines.length - 1;
    if (count < 40 || count > 90) throw new Error(`${file}: ${count} lines; the page contract allows 40-90`);
  }
}

/* ── V3: anchors ───────────────────────────────────────────────────── */

function v3(pageOnly) {
  requirePages(pageOnly);
  const files = pageOnly ? [clean(pageOnly)] : pageFiles();
  const cache = {};
  for (const file of files) {
    const rows = whereRows(file);
    if (!rows.length) throw new Error(`${file}: "## Where it lives" has no table rows`);
    for (const row of rows) {
      if (!ROLES.has(row.role)) throw new Error(`${file}: unknown role "${row.role}" in Where it lives`);
      if (!row.file || !exists(row.file)) throw new Error(`${file}: cites ${row.file || '(no file)'}, which does not exist`);
      if (row.role === 'Data') continue; // V4 resolves these
      if (!row.anchors.length) throw new Error(`${file}: row for ${row.file} has no backticked anchor`);
      const text = cache[row.file] || (cache[row.file] = read(row.file));
      for (const raw of row.anchors) {
        for (const token of raw.split('·')) {
          const t = token.trim();
          if (!t) continue;
          if (!text.includes(t)) throw new Error(`${file}: ${row.file} does not contain "${t}"`);
        }
      }
    }
  }
}

/* ── V4: data paths ────────────────────────────────────────────────── */

function v4(pageOnly) {
  requirePages(pageOnly);
  const { P, S } = loadPortfolio();
  const files = pageOnly ? [clean(pageOnly)] : pageFiles();
  for (const file of files) {
    for (const row of whereRows(file)) {
      if (row.role !== 'Data') continue;
      if (!row.anchors.length) throw new Error(`${file}: Data row for ${row.file} has no path anchor`);
      for (const raw of row.anchors) {
        for (const token of raw.split('·')) {
          const t = token.trim();
          if (!t) continue;
          try { resolveDataToken(P, S, t); }
          catch (e) { throw new Error(`${file}: ${e.message}`); }
        }
      }
    }
  }
}

/* ── V5: class coverage + selectors.md resolution ──────────────────── */

function v5() {
  // Strip comments and url(...) payloads: a stylesheet comment may name retired
  // classes and an image URL ends in .jpg, neither of which is a class selector.
  const css = stripCssComments(read('css/styles.css')).replace(/url\([^)]*\)/g, 'url()');
  const declared = new Set([...css.matchAll(/\.([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]));
  const docs = libraryText();
  const missing = [...declared].filter((c) => !mentions(docs, '.' + c)).sort();
  if (missing.length) throw new Error(`CSS classes documented nowhere: ${missing.join(' ')}`);

  if (exists(LIB + '/selectors.md')) {
    const runtime = RUNTIME_FILES.map((f) => read(f)).join('\n');
    const emitted = new Set([...runtime.matchAll(/\b([a-z][a-z0-9]*--?[a-z0-9_-]*)\b/g)].map((m) => m[1]));
    for (const line of linesOf(LIB + '/selectors.md')) {
      const t = line.trim();
      if (!t.startsWith('|')) continue;
      const cells = t.split('|').slice(1, -1).map((c) => c.trim());
      if (!cells.length || cells[0] === 'Selector' || /^-{2,}$/.test(cells[0])) continue;
      for (const m of cells[0].matchAll(/`([^`]+)`/g)) {
        const tok = m[1].trim();
        if (tok.startsWith('.')) {
          const c = tok.slice(1);
          if (!declared.has(c) && !runtime.includes(c)) throw new Error(`selectors.md: ${tok} resolves nowhere`);
        } else if (tok.startsWith('#')) {
          const id = tok.slice(1);
          if (!runtime.includes(id)) throw new Error(`selectors.md: ${tok} resolves nowhere`);
        } else if (tok.startsWith('data-')) {
          if (!runtime.includes(tok)) throw new Error(`selectors.md: ${tok} resolves nowhere`);
        }
      }
    }
    void emitted;
  }
}

/* ── V6: id / attribute / emitted-class coverage ───────────────────── */

function v6() {
  const docs = libraryText();
  const html = stripHtmlComments(read('index.html'));
  const js = read('js/main.js');
  const css = stripCssComments(read('css/styles.css'));
  const data = read('js/data.js');
  const runtime = [html, css, js, data].join('\n');

  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const attrs = new Set([...runtime.matchAll(/data-[a-z][a-z0-9-]*/g)].map((m) => m[0]));
  for (const m of js.matchAll(/dataset\.([A-Za-z]+)/g)) {
    attrs.add('data-' + m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
  }

  const emitted = new Set();
  const addClasses = (raw) => {
    for (const t of String(raw).split(/\s+/)) {
      // The template strings in js/main.js concatenate class names with ternaries;
      // anything that is not a plain class token is a fragment, not a class.
      if (!/^[a-z][a-z0-9_-]*$/.test(t)) continue;
      if (t.length >= 3 && !t.endsWith('-')) emitted.add(t);
    }
  };
  const classAttr = /class="([^"'<>]*)/g;
  for (const m of html.matchAll(classAttr)) addClasses(m[1]);
  for (const m of js.matchAll(classAttr)) addClasses(m[1]);
  for (const m of js.matchAll(/className\s*=\s*'([^']+)'/g)) addClasses(m[1]);
  for (const m of js.matchAll(/cls:\s*'([^']+)'/g)) addClasses(m[1]);
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle)\('([^']+)'/g)) addClasses(m[1]);

  const missIds = [...ids].filter((id) => !docs.includes('#' + id)).sort();
  if (missIds.length) throw new Error(`shell ids documented nowhere: ${missIds.map((i) => '#' + i).join(' ')}`);

  const missAttrs = [...attrs].filter((a) => !docs.includes(a)).sort();
  if (missAttrs.length) throw new Error(`data attributes documented nowhere: ${missAttrs.join(' ')}`);

  const missClasses = [...emitted].filter((c) => !mentions(docs, '.' + c)).sort();
  if (missClasses.length) throw new Error(`emitted classes documented nowhere: ${missClasses.join(' ')}`);
}

/* ── V7: data coverage + Site.* classification ────────────────────── */

function v7() {
  if (!exists(LIB + '/data.md')) throw new Error(`${LIB}/data.md does not exist`);
  const { P, S } = loadPortfolio();
  const text = read(LIB + '/data.md');
  const tokens = new Set([...text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()));

  const topMissing = Object.keys(P).filter((k) =>
    ![...tokens].some((t) => t === k || t.startsWith(k + '[') || t.startsWith(k + '.')));
  if (topMissing.length) throw new Error(`PORTFOLIO top-level keys missing from data.md: ${topMissing.join(' ')}`);

  for (const coll of ['projects', 'leadership', 'honors']) {
    const records = Array.isArray(P[coll]) ? P[coll] : [];
    const union = new Set();
    for (const rec of records) for (const k of Object.keys(rec || {})) union.add(k);
    const missing = [...union].filter((k) =>
      ![...tokens].some((t) => t === coll + '[]' + '.' + k || t.startsWith(coll + '[]' + '.' + k + '.')));
    if (missing.length) throw new Error(`${coll} fields missing from data.md: ${missing.join(' ')}`);
  }

  // Every data-like token in data.md must resolve (invented fields fail).
  for (const token of tokens) {
    if (!/\[\]|^Site\./.test(token)) continue;
    try { resolveDataToken(P, S, token); }
    catch (e) { throw new Error(`data.md: ${token} — ${e.message}`); }
  }

  const siteKeys = Object.keys(S);
  const siteMissing = siteKeys.filter((k) => !tokens.has('Site.' + k));
  if (siteMissing.length) throw new Error(`Site helpers missing from data.md: ${siteMissing.join(' ')}`);

  // The used/dormant classification must match what js/main.js actually calls.
  const used = new Set([...read('js/main.js').matchAll(/\bS\.([A-Za-z0-9_]+)/g)].map((m) => m[1]));
  const classified = new Map();
  for (const line of linesOf(LIB + '/data.md')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (!cells.length) continue;
    const hm = (cells[0] || '').match(/`Site\.([A-Za-z0-9_]+)`/);
    if (!hm) continue;
    const flag = (cells[1] || '').toLowerCase();
    if (flag !== 'yes' && flag !== 'no') {
      throw new Error(`data.md: Site.${hm[1]} must be classified "yes" or "no" (found "${cells[1] || ''}")`);
    }
    classified.set(hm[1], flag === 'yes');
  }
  const unclassified = siteKeys.filter((k) => !classified.has(k));
  if (unclassified.length) throw new Error(`Site helpers unclassified in data.md: ${unclassified.join(' ')}`);
  const claimedUsed = new Set(siteKeys.filter((k) => classified.get(k)));
  for (const k of used) if (!claimedUsed.has(k)) throw new Error(`data.md says Site.${k} is dormant, but js/main.js calls it`);
  for (const k of claimedUsed) if (!used.has(k)) throw new Error(`data.md says Site.${k} is used, but js/main.js never calls it`);
}

/* ── V8: integration ───────────────────────────────────────────────── */

function v8() {
  const pkg = JSON.parse(read('package.json'));
  if (!String(pkg.scripts && pkg.scripts.test || '').includes('tests/library.test.mjs')) {
    throw new Error('package.json test script does not run tests/library.test.mjs');
  }
  if (!read('AGENTS.md').includes('docs/library/README.md')) {
    throw new Error('AGENTS.md does not point at docs/library/README.md');
  }
  if (!read('tools/README.md').includes('library-check.mjs')) {
    throw new Error('tools/README.md does not list library-check.mjs');
  }
}

/* ── V9: no line numbers ───────────────────────────────────────────── */

function v9(pageOnly) {
  requirePages(pageOnly);
  const files = pageOnly ? [clean(pageOnly)] : libraryFiles();
  for (const file of files) {
    const m = read(file).match(/[\w./-]+\.(?:js|css|html|mjs):\d+/);
    if (m) throw new Error(`${file}: cites a line number ("${m[0]}") — use a grep anchor instead`);
  }
}

/* ── V10: cited files exist ────────────────────────────────────────── */

function v10() {
  const text = libraryText();
  for (const m of text.matchAll(/\b(?:tests|tools)\/[A-Za-z0-9_.-]+\.(?:mjs|js)\b/g)) {
    if (!exists(m[0])) throw new Error(`the library cites ${m[0]}, which does not exist`);
  }
}

/* ── exports + CLI ─────────────────────────────────────────────────── */

const CHECKS = [
  { id: 'V1', name: 'index consistency', fn: v1 },
  { id: 'V2', name: 'page format', fn: v2 },
  { id: 'V3', name: 'anchors', fn: v3 },
  { id: 'V4', name: 'data paths', fn: v4 },
  { id: 'V5', name: 'class coverage', fn: v5 },
  { id: 'V6', name: 'id/attribute/emitted-class coverage', fn: v6 },
  { id: 'V7', name: 'data coverage', fn: v7 },
  { id: 'V8', name: 'integration', fn: v8 },
  { id: 'V9', name: 'no line numbers', fn: v9 },
  { id: 'V10', name: 'cited files exist', fn: v10 },
];
const PAGE_MODE = new Set(['V2', 'V3', 'V4', 'V9']);

export function checks(opts = {}) {
  const page = opts.page ? clean(opts.page) : null;
  return CHECKS
    .filter((c) => !page || PAGE_MODE.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name + (page ? ' (' + path.posix.basename(page) + ')' : ''),
      fn: () => c.fn(page || undefined),
    }));
}

/* Run every check in-process and collect the outcome. Used by the CLI, by
   tests/library.test.mjs, and by the mutation harness — spawning a child to
   capture the CLI's output is EPERM under the confined sandbox. */
export function runChecks(opts = {}) {
  return checks(opts).map((c) => {
    try {
      c.fn();
      return { id: c.id, name: c.name, ok: true, error: '' };
    } catch (e) {
      return { id: c.id, name: c.name, ok: false, error: e.message };
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--page');
  const page = i >= 0 ? args[i + 1] : null;
  const results = runChecks(page ? { page } : {});
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log('ok   ' + r.id + ' ' + r.name);
    } else {
      failed++;
      console.log('FAIL ' + r.id + ' ' + r.name + '\n     ' + r.error);
    }
  }
  console.log('\n' + (failed ? failed + ' failed' : 'library check passed'));
  process.exit(failed ? 1 : 0);
}

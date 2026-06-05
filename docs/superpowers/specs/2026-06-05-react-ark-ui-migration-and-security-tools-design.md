# Design: server-tools → React + Ark UI, with HIBP & infection checks

**Date:** 2026-06-05
**Status:** Approved (brainstorm) → ready for implementation plan

## Summary

Restructure the existing `server-tools` single-page vanilla-JS app into a
multi-page **React + Ark UI** application, and add two new security tools:
**Have I Been Pwned** (`/pwned`) and **Is my server infected** (`/infected`).

The existing passive Node backend (`server.js`) is kept and extended. Its
**passive/abuse-safe guarantees stay** (no port-scanning, no SSRF, only fixed
known upstream hosts). The project's former "zero npm dependencies" identity is
**intentionally dropped** — npm dependencies are now accepted.

## Decisions (locked during brainstorming)

1. **Architecture:** Full React + Ark UI stack; npm deps accepted; "zero-dep"
   marketing dropped; passive-backend security guarantees kept.
2. **HIBP mode:** *Both* — free password check (always on) + email breach check
   (active only when an `HIBP_KEY` env var is set).
3. **Infection check:** *Both* — passive IP-reputation lookup + a fully-offline
   IOC/log analyzer. No active scanning.
4. **Page structure:** One searchable Tools page plus dedicated feature pages —
   routes `/`, `/tools`, `/pwned`, `/infected`.

## Stack & build

- **Vite + React using JSX (not TypeScript).** Matches the existing plain-JS
  codebase and lets the 72 tool definitions port nearly verbatim.
- **`@ark-ui/react`** for headless components; **`react-router-dom`** for routing.
- **Styling:** keep the current dark-lavender theme, ported from `style.css` to
  global CSS + CSS custom properties. Ark UI's headless components are styled
  with plain CSS. **No Tailwind / no Panda CSS** — one styling model, current
  look preserved.
- Vite builds to `dist/`; the existing `server.js` serves `dist/` as static
  files. Scripts:
  - `npm run dev` → Vite dev server (with `/api` proxied to the Node server)
  - `npm run build` → production build to `dist/`
  - `npm start` → the passive Node server (serves `dist/` + `/api/*`)

## Backend (`server.js`) — stays passive

All current endpoints remain. New endpoints, each talking only to a **fixed,
known** upstream (no user-arbitrary hosts):

- `POST /api/hibp-password` — proxies HIBP **Pwned Passwords range API**
  (`https://api.pwnedpasswords.com/range/{first5}`). The browser SHA-1's the
  password and sends **only the first 5 hex chars**; suffix matching happens
  client-side. The password never leaves the browser. No key required.
- `POST /api/hibp-email` — proxies HIBP **breachedaccount**
  (`https://haveibeenpwned.com/api/v3/breachedaccount/{account}`). **Active only
  when `HIBP_KEY` is set**; otherwise returns a structured "not configured"
  response (HTTP 200, `{ configured: false }`) so the UI shows a notice rather
  than an error. The email address is sent to HIBP (unavoidable for this lookup).
- `POST /api/reputation` — aggregates **passive, DNS-based** reputation for a
  user-supplied IP:
  - existing DNSBL zones (`RBLS`) + **DroneBL** (`dnsbl.dronebl.org`,
    botnet/compromised hosts)
  - reverse DNS (PTR) sanity
  - RDAP abuse contact (via the existing `rdapFetch`, fixed host `rdap.org`)
  Returns a consolidated object distinguishing spam-type vs.
  botnet/compromise-type listings. No keys, no connection to the target host.

Reuse existing patterns for per-IP rate limiting, input validation
(`isDomain` / `isIP`), `AbortController` timeouts, and response size caps. New
upstream hosts are added to a small fixed allowlist for clarity.

## Pages / routes

```
/            Home — what this is; links to Tools, Pwned, Infected
/tools       all 72 existing tools, searchable/filterable (current UX, in React)
/pwned       Have I Been Pwned
/infected    Is my server infected
```

Ark UI nav links between routes. The `/`-key search shortcut applies on `/tools`.

## The 72 tools — data-driven migration (low-rewrite)

`tools.js` is already a declarative data model:
`{ id, cat, title, kw?, inputs[], actions[] }`, where each input is
`{ id, type, label, ... }` and each action is `{ label, run(values) }`.

- Port the helper functions + the `TOOLS` array into `src/tools/` **almost
  unchanged** (plain JS modules; export `TOOLS` and the category labels).
- Write **one generic `<ToolCard>` React component** that:
  - renders `inputs[]` as Ark UI fields by `type`
    (text/textarea/number/select/checkbox → Field / NumberInput / Select /
    Checkbox),
  - runs the chosen `action.run(values)` (await-aware for async tools like
    hashes and backend calls),
  - shows the result with a copy button and the existing live-preview behavior
    for CSS generators.

This reproduces today's `app.js` engine as a single React component; the 72
tools stay as data and are **not** hand-rewritten.

## Feature: `/pwned` (Have I Been Pwned)

Ark UI **Tabs** with two tabs:

- **Password** (always on, free): user types a password → SHA-1 computed in the
  browser → `POST /api/hibp-password` with the first 5 hash chars → response is
  the list of suffixes+counts for that prefix → match the local suffix → show
  "seen in N breaches" or "not found in any breach." Prominent disclaimer that
  the password never leaves the browser and how k-anonymity works.
- **Email** (active when `HIBP_KEY` set): user enters an email → `POST
  /api/hibp-email` → list of breaches (name, breach date, what data was exposed).
  When the key is absent, the tab shows a "configured off" notice (from the
  `{ configured: false }` response) rather than an error.

## Feature: `/infected` (Is my server infected)

Ark UI **Tabs** with two tabs. **Advisory only** — the UI never claims
certainty, only "heuristic indicators."

- **IP reputation** (passive network): user enters their server's IP →
  `POST /api/reputation` → a consolidated card showing DNSBL/DroneBL listings
  (split into spam-type vs. botnet/compromise-type), PTR sanity, and the RDAP
  abuse contact.
- **Offline IOC analyzer** (zero network, 100% in-browser): user pastes command
  output — `ps aux` / `top`, `ss -tlnp` / `netstat`, `crontab` / cron files,
  `auth.log` / `last`. Client-side heuristics flag, with a severity tag and an
  explanation per finding:
  - high-CPU processes with random-looking names (e.g. the `aa162766`-style
    pattern), and known miner names (`xmrig`, `kinsing`, `kdevtmpfsi`, …)
  - executables running from `/tmp`, `/dev/shm`, `/var/tmp`
  - unexpected listening/backdoor ports bound to `0.0.0.0`
  - cron lines that pipe downloads to a shell (`curl … | sh`, `wget … | sh`,
    base64-piped) or re-download into `/tmp`
  - suspicious successful root logins / accepted-password-for-root patterns
  Every result carries a "heuristic, not proof" disclaimer.

The analyzer's detectors are **pure functions** (string → findings), which makes
them directly unit-testable.

## Docs

Update `README.md`, the page footer, and the `package.json` `description`:

- Remove "zero npm dependencies" / "Null Supply-Chain-Risiko" claims.
- Keep and re-emphasize the passive/abuse-safe guarantees: no port-scanner, no
  SSRF, no connection to arbitrary user-supplied hosts; the backend talks only
  to a fixed set of known upstreams (system DNS resolvers, `rdap.org`,
  `api.pwnedpasswords.com`, and — only if configured — `haveibeenpwned.com`).
- Document the optional `HIBP_KEY` env var and the new `dev`/`build` scripts.

## Testing

**Vitest** for:

- IOC-analyzer detectors (pure functions) — the highest-value tests; cover
  miner CPU%, `/tmp` execs, backdoor ports, `curl|sh` cron, root-login patterns.
- k-anonymity password match logic (prefix/suffix handling).
- `/api/reputation` aggregation + DNSBL response parsing (pure logic, mocked DNS).
- A render smoke test per page (Home, Tools, Pwned, Infected) and the generic
  `<ToolCard>` rendering one representative tool of each input type.

## Out of scope (YAGNI)

- Active scanning of any kind (port scan, TLS/header probing of arbitrary hosts).
- Keyed reputation feeds (e.g. AbuseIPDB) — DNS-based lists only, no extra keys.
- Persisting user data / accounts / history.
- TypeScript migration of the existing tool helpers.

## Proposed file layout

```
server-tools/
  server.js                  # passive backend (extended: +3 endpoints)
  package.json               # +deps, +dev/build scripts
  vite.config.js             # dev proxy /api -> node, build to dist/
  index.html                 # Vite entry (replaces public/index.html)
  dist/                      # build output, served by server.js (gitignored)
  src/
    main.jsx                 # React entry + router
    App.jsx                  # layout shell + Ark UI nav
    theme.css                # ported dark-lavender theme (CSS vars)
    pages/
      Home.jsx
      Tools.jsx
      Pwned.jsx
      Infected.jsx
    components/
      ToolCard.jsx           # generic tool renderer (the new "engine")
    tools/
      index.js               # TOOLS array + categories (ported)
      helpers.js             # ported helper functions
    lib/
      ioc.js                 # offline IOC analyzer detectors (pure)
      hibp.js                # client-side SHA-1 + k-anonymity match
  public/                    # legacy vanilla files kept until migration verified
  docs/superpowers/specs/    # this spec
```

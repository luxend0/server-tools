# Server Tools

A hub of 72 small web tools plus two security tools, built as a
**React + Ark UI** app (Vite) on top of a **strictly passive** Node backend.

## Stack

- **Frontend:** React 19 + [Ark UI](https://ark-ui.com) (headless components),
  `react-router-dom` for routing, bundled with **Vite**. Monochrome grey
  terminal theme with self-hosted JetBrains Mono, icons from `lucide-react`.
- **Backend:** small Node HTTP server (`server.js`, no runtime dependencies).
  It is **passive**: it serves the built frontend from `dist/` and exposes a few
  tightly scoped `/api/*` proxies.

## Security / abuse

The backend is **passive**. It **only** connects to fixed, known endpoints,
never to arbitrary hosts or ports entered by the user:

- the system's **DNS resolvers** (lookups, DNSBL/botnet lists, reverse DNS),
- **`rdap.org`** (registry/WHOIS data via RDAP over HTTPS),
- **`api.pwnedpasswords.com`** (Pwned Passwords range API, k-anonymity),
- **`haveibeenpwned.com`**, **only** if `HIBP_KEY` is set (email breach check).

This means:

- **No** port scanner, **no** SSRF, **no** scan proxy, **no** connections to
  arbitrary targets.
- Offline tools (encode/decode, crypto, color, the log/IOC analysis, local
  password hashing) run **entirely in the browser**.
- The password check never sends the password: it is hashed locally with SHA-1
  and only the first 5 hash characters are sent (k-anonymity).
- Input is validated (domain/IP/hash/email format), and the `/api/*` calls are
  capped with timeouts and size limits.

## Requirements

- Node.js >= 18
- `npm install` for the toolchain and dependencies

## Scripts

```sh
npm run dev      # Vite dev server (hot reload), proxies /api -> :8099
npm run build    # production build into dist/
npm start        # node server.js, serves dist/ and /api/*
npm test         # Vitest (unit/render tests) + node --test server.test.js
```

For production, build first, then start:

```sh
npm run build
npm start         # -> http://localhost:8099  (override with the PORT env var)
```

## Configuration

- **`HIBP_KEY`** (optional): API key from
  [Have I Been Pwned](https://haveibeenpwned.com/API/Key). The **email** breach
  check on `/pwned` is only active when it is set. Without a key the password
  check (k-anonymity) still works; the email check reports "not configured".

```sh
HIBP_KEY=your-key npm start
```

## Routes

- **`/`**: home page with an overview and links to each section.
- **`/tools`**: searchable index of all 72 tools; each tool has its own page at
  `/tools/:id` with copy buttons and live preview.
  - **Encode / decode:** Base64, Base32, hex, binary, URL, HTML entities,
    Unicode, Morse, Caesar/ROT13, JWT, JSON string escape, number base.
  - **Crypto / generators:** hash (SHA-1/256/384/512), HMAC, CRC32, UUID v4,
    Nano ID, password, random bytes, random number.
  - **Data / format:** JSON (format/minify/validate), JSON<->CSV, JSON->YAML,
    query string<->JSON, Unix timestamp, date difference, duration, time zones,
    cron.
  - **Text:** case, slug, lorem ipsum, counter, word frequency, regex,
    find & replace, line tools, reverse, HTML->text, whitespace, diff.
  - **Color / CSS:** converter, contrast (WCAG), tints/shades, box shadow,
    border radius, gradient, CSS units.
  - **Math / calculators:** expression calculator, percent, prime factors,
    GCD/LCM, Roman numerals, aspect ratio, temperature, length, data size.
  - **Network (offline):** CIDR/subnet, IPv4<->integer, IPv6 expand/compress,
    user agent parser, HTTP status codes, MIME types, well-known ports.
  - **Network (backend, passive):** DNS lookup, all DNS records, reverse DNS,
    blacklist/DNSBL, email config (MX/SPF/DKIM/DMARC), WHOIS/RDAP, ASN lookup.
- **`/pwned`**: *Have I Been Pwned*
  - **Password:** hashed locally with SHA-1, k-anonymous query against
    `api.pwnedpasswords.com` (the password never leaves the browser).
  - **Email:** breach check via `haveibeenpwned.com` (only with `HIBP_KEY`).
- **`/infected`**: *Is my server infected?*
  - **IP reputation:** passive DNS blacklist/botnet queries, PTR and the RDAP
    abuse contact. Your server is not scanned.
  - **Log/IOC analysis:** 100% offline in the browser; paste e.g. `ps aux`,
    `ss -tlnp`, `crontab -l` or `auth.log`. Heuristic, **not** proof of a
    compromise.

## Layout

```
server.js                 # passive HTTP server: serves dist/ + /api/* (DNS, RDAP, HIBP)
vite.config.js            # Vite config (dev proxy /api -> :8099, build -> dist/)
vitest.config.js          # test setup (jsdom)
index.html                # Vite entry
src/
  main.jsx                # React root + router
  App.jsx                 # layout, navigation, routes
  theme.css               # monochrome terminal theme
  pages/                  # Home, Tools, ToolPage, Pwned, Infected
  components/             # ToolCard (generic tool renderer), Result
  tools/index.js          # tool definitions + helpers (TOOLS, CAT_ORDER)
  lib/                    # api (backend client), hibp (k-anonymity), ioc (IOC analysis), catmeta (icons)
```

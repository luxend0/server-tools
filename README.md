# Server Tools

Ein Hub vieler kleiner Web-Tools plus zwei Security-Werkzeugen, gebaut als
**React + Ark UI** App (Vite) auf einem **rein passiven** Node-Backend.

## Stack

- **Frontend:** React 19 + [Ark UI](https://ark-ui.com) (headless Components),
  `react-router-dom` für die Routen, gebündelt mit **Vite**. Dark-Lavender-Theme.
- **Backend:** schlanker Node-HTTP-Server (`server.js`) — **passiv**, liefert das
  gebaute Frontend aus `dist/` aus und stellt einige eng begrenzte `/api/*`-Proxys
  bereit.

## Sicherheit / Abuse

Das Backend ist **passiv**. Es verbindet sich **ausschließlich** zu festen,
bekannten Gegenstellen — niemals zu beliebigen, vom Nutzer eingegebenen
Hosts/Ports:

- **DNS-Resolver** des Systems (Lookups, DNSBL/Botnet-Listen, Reverse-DNS),
- **`rdap.org`** (Registry-/WHOIS-Daten via RDAP über HTTPS),
- **`api.pwnedpasswords.com`** (Pwned-Passwords-Bereich, k-Anonymität),
- **`haveibeenpwned.com`** — **nur** wenn `HIBP_KEY` gesetzt ist (E-Mail-Datenleck-Prüfung).

Daraus folgt:

- **Kein** Port-Scanner, **keine** SSRF, **kein** Scan-Proxy, **keine**
  Verbindungen zu beliebigen Zielen.
- Offline-Tools (Encode/Decode, Crypto, Farbe, die Log-/IOC-Analyse, das lokale
  Passwort-Hashing) laufen **vollständig im Browser**.
- Beim Passwort-Check verlässt das Passwort den Browser nicht: Es wird lokal mit
  SHA-1 gehasht, gesendet werden nur die ersten 5 Hash-Zeichen (k-Anonymität).
- Eingaben werden validiert (Domain/IP-/Hash-/E-Mail-Format), die `/api/*`-Aufrufe
  sind mit Timeouts und Größen-Limits gedeckelt.

## Voraussetzungen

- Node.js ≥ 18
- `npm install` für Toolchain und Abhängigkeiten

## Scripts

```sh
npm run dev      # Vite-Dev-Server (Hot Reload), proxyt /api -> :8099
npm run build    # Produktions-Build nach dist/
npm start        # node server.js — liefert dist/ aus und stellt /api/* bereit
npm test         # Vitest (Unit-/Render-Tests)
```

Für den Produktivbetrieb: erst `npm run build`, dann `npm start`.

```sh
cd /home/luxend/server-tools
npm run build
npm start         # -> http://localhost:8099  (Port via PORT-Env überschreibbar)
```

## Konfiguration

- **`HIBP_KEY`** (optional) — API-Key von
  [Have I Been Pwned](https://haveibeenpwned.com/API/Key). Nur wenn gesetzt, ist
  die **E-Mail**-Datenleck-Prüfung auf `/pwned` aktiv. Ohne Key bleibt der
  Passwort-Check (k-Anonymität) trotzdem nutzbar; die E-Mail-Prüfung meldet
  „nicht konfiguriert“.

```sh
HIBP_KEY=dein-key npm start
```

## Routen

- **`/`** — Startseite mit Übersicht und Links zu den Bereichen.
- **`/tools`** — 72 Tools mit Live-Suche, Copy-Buttons und Live-Vorschau:
  - **Encode / Decode:** Base64, Base32, Hex, Binär, URL, HTML-Entities,
    Unicode, Morse, Caesar/ROT13, JWT, JSON-String-Escape, Zahlenbasis.
  - **Crypto / Generatoren:** Hash (SHA-1/256/384/512), HMAC, CRC32, UUID v4,
    Nano-ID, Passwort, Random Bytes, Zufallszahl.
  - **Daten / Format:** JSON (Format/Minify/Validate), JSON↔CSV, JSON→YAML,
    Query-String↔JSON, Unix-Timestamp, Datums-Differenz, Dauer, Zeitzonen, Cron.
  - **Text:** Case, Slug, Lorem Ipsum, Zähler, Wort-Häufigkeit, Regex,
    Suchen&Ersetzen, Zeilen-Tools, Spiegeln, HTML→Text, Whitespace, Diff.
  - **Farbe / CSS:** Konverter, Kontrast (WCAG), Tints/Shades, Box-Shadow,
    Border-Radius, Gradient, CSS-Einheiten.
  - **Mathe / Rechner:** Ausdrucks-Rechner, Prozent, Primfaktoren, GGT/kGV,
    Römische Zahlen, Seitenverhältnis, Temperatur, Länge, Datengröße.
  - **Netzwerk (offline):** CIDR/Subnetz, IPv4↔Integer, IPv6 Expand/Compress,
    User-Agent-Parser, HTTP-Statuscodes, MIME-Typen, Well-Known Ports.
  - **Netzwerk (Backend, passiv):** DNS Lookup, DNS All-Records, Reverse DNS,
    Blacklist/DNSBL, E-Mail-Config (MX/SPF/DKIM/DMARC), WHOIS/RDAP, ASN Lookup.
- **`/pwned`** — *Have I Been Pwned*:
  - **Passwort** — lokal SHA-1-gehasht, k-anonyme Abfrage gegen
    `api.pwnedpasswords.com` (das Passwort verlässt den Browser nicht).
  - **E-Mail** — Datenleck-Prüfung über `haveibeenpwned.com` (nur mit `HIBP_KEY`).
- **`/infected`** — *Ist mein Server infiziert?*:
  - **IP-Reputation** — passive DNS-Blacklist-/Botnet-Abfragen, PTR und
    RDAP-Abuse-Kontakt. Kein Scan deines Servers.
  - **Log-/IOC-Analyse** — 100 % offline im Browser; fügt z. B. `ps aux`,
    `ss -tlnp`, `crontab -l` oder `auth.log` ein. Heuristik, **kein** Beweis für
    eine Kompromittierung.

## Struktur

```
server.js                 # passiver HTTP-Server: liefert dist/ + /api/* (DNS, RDAP, HIBP)
vite.config.js            # Vite-Konfiguration (Dev-Proxy /api -> :8099, Build -> dist/)
vitest.config.js          # Test-Setup (jsdom)
index.html                # Vite-Entry
src/
  main.jsx                # React-Root + Router
  App.jsx                 # Layout, Navigation, Routen
  theme.css               # Dark-Lavender-Theme
  pages/                  # Home, Tools, Pwned, Infected
  components/             # ToolCard (generischer Tool-Renderer), Result
  tools/index.js          # Tool-Definitionen + Helfer (TOOLS, CAT_ORDER)
  lib/                    # api (Backend-Client), hibp (k-Anonymität), ioc (IOC-Analyse)
```

# Server Tools (Test-Build)

Ein Hub vieler kleiner Web-Tools. Bewusst **ungestylt** (nur zum Testen) und mit
einem **rein passiven** Backend.

## Sicherheit / Abuse

- **Keine npm-Dependencies** — nur Node-Built-ins. Null Supply-Chain-Risiko.
- Das Backend verbindet **ausschließlich** zu DNS-Resolvern (System-Resolver) und
  zu RDAP/Registry-WHOIS (`rdap.org`) über HTTPS.
- **Kein** Port-Scanner, **keine** Verbindung zu beliebigen vom Nutzer eingegebenen
  Hosts/Ports → keine SSRF, kein Scan-Proxy, keine Abuse-Reports.
- Eingaben werden validiert (Domain/IP-Format), pro IP rate-limitiert (90 req/min),
  Body-Größe und RDAP-Timeout/Größe sind gedeckelt.

## Starten

```sh
cd /home/luxend/server-tools
npm start            # oder: node server.js
# -> http://localhost:8099   (Port via PORT-Env überschreibbar)
```

## Tools (72)

Dark-Lavender-UI mit Sidebar-Navigation, Live-Suche (`/`-Shortcut),
Copy-Buttons und Live-Vorschau für die CSS-Generatoren.

- **Encode / Decode:** Base64, Base32, Hex, Binär, URL, HTML-Entities, Unicode,
  Morse, Caesar/ROT13, JWT, JSON-String-Escape, Zahlenbasis.
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

## Struktur

```
server.js          # zero-dep HTTP server + /api/* (passiv: DNS + RDAP)
public/index.html  # Markup
public/style.css   # Dark-Lavender-Theme
public/tools.js    # alle Tool-Definitionen + Helfer (window.TOOLS)
public/app.js      # UI-Framework: Cards, Nav, Suche, Copy, Preview
```

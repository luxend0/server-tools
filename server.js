// Server Tools — passive-only backend. Zero npm dependencies (Node built-ins only).
// The server ONLY talks to DNS resolvers and to RDAP/registry WHOIS over HTTPS.
// It never connects to arbitrary user-supplied hosts/ports -> no SSRF, no scan-proxy.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { promises as dns } from 'node:dns';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT   = process.env.PORT || 8099;
const PUBLIC = path.join(__dirname, 'dist');

// ---------- tiny per-IP rate limit (in-memory) ----------
const RL = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 60_000, max = 90;
  let e = RL.get(ip);
  if (!e || now > e.reset) { e = { count: 0, reset: now + win }; RL.set(ip, e); }
  e.count++;
  return e.count > max;
}

// ---------- validation ----------
const DOMAIN_RE = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/;
const isDomain = (s) => typeof s === 'string' && DOMAIN_RE.test(s);
const isIP     = (s) => typeof s === 'string' && net.isIP(s) !== 0;

// ---------- API handlers ----------
async function apiDns({ name, type }) {
  if (!isDomain(name)) throw new Error('Ungültiger Domainname');
  type = String(type || 'A').toUpperCase();
  const allowed = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV', 'CAA', 'PTR'];
  if (!allowed.includes(type)) throw new Error('Record-Typ nicht unterstützt');
  let records = await dns.resolve(name, type);
  if (type === 'TXT') records = records.map((r) => (Array.isArray(r) ? r.join('') : r));
  return { name, type, records };
}

async function apiPtr({ ip }) {
  if (!isIP(ip)) throw new Error('Ungültige IP');
  return { ip, names: await dns.reverse(ip) };
}

const RBLS = [
  'zen.spamhaus.org', 'bl.spamcop.net', 'b.barracudacentral.org',
  'dnsbl-1.uceprotect.net', 'spam.dnsbl.sorbs.net', 'cbl.abuseat.org',
];
async function apiDnsbl({ ip }) {
  if (net.isIP(ip) !== 4) throw new Error('Bitte IPv4 (DNSBLs sind IPv4-basiert)');
  const rev = ip.split('.').reverse().join('.');
  const results = await Promise.all(RBLS.map(async (zone) => {
    const q = `${rev}.${zone}`;
    try {
      const codes = await dns.resolve4(q);
      let reason = null;
      try { reason = (await dns.resolveTxt(q)).map((t) => t.join('')).join(' '); } catch { /* none */ }
      return { zone, listed: true, codes, reason };
    } catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') return { zone, listed: false };
      return { zone, listed: false, error: e.code || String(e) };
    }
  }));
  return { ip, results };
}

async function apiEmail({ domain, selector }) {
  if (!isDomain(domain)) throw new Error('Ungültiger Domainname');
  const out = { domain };
  try { out.mx = (await dns.resolveMx(domain)).sort((a, b) => a.priority - b.priority); }
  catch (e) { out.mx = { error: e.code || String(e) }; }

  let txt = [];
  try { txt = (await dns.resolveTxt(domain)).map((r) => r.join('')); } catch { /* none */ }
  out.spf = txt.find((r) => /^v=spf1/i.test(r)) || null;

  try {
    const d = (await dns.resolveTxt(`_dmarc.${domain}`)).map((r) => r.join(''));
    out.dmarc = d.find((r) => /^v=DMARC1/i.test(r)) || null;
  } catch { out.dmarc = null; }

  if (selector && isDomain(selector)) {
    try { out.dkim = (await dns.resolveTxt(`${selector}._domainkey.${domain}`)).map((r) => r.join('')).join(''); }
    catch (e) { out.dkim = { error: e.code || String(e) }; }
  }
  return out;
}

async function apiDnsAll({ name }) {
  if (!isDomain(name)) throw new Error('Ungültiger Domainname');
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CAA'];
  const records = {};
  await Promise.all(types.map(async (t) => {
    try {
      let r = await dns.resolve(name, t);
      if (t === 'TXT') r = r.map((x) => (Array.isArray(x) ? x.join('') : x));
      records[t] = r;
    } catch (e) { records[t] = { error: e.code || String(e) }; }
  }));
  return { name, records };
}

// shared RDAP fetch (fixed host rdap.org -> registry/RIR servers; not user-arbitrary)
async function rdapFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/rdap+json' } });
    if (r.status === 404) throw new Error('Nicht gefunden / nicht registriert');
    if (!r.ok) throw new Error('RDAP HTTP ' + r.status);
    const text = await r.text();
    if (text.length > 300_000) throw new Error('Antwort zu groß');
    return JSON.parse(text);
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Timeout (RDAP nicht erreichbar)');
    throw e;
  } finally { clearTimeout(timer); }
}

async function apiRdap({ query }) {
  query = String(query || '').trim().toLowerCase();
  if (isIP(query)) return rdapFetch('https://rdap.org/ip/' + encodeURIComponent(query));
  if (isDomain(query)) return rdapFetch('https://rdap.org/domain/' + encodeURIComponent(query.replace(/\.$/, '')));
  throw new Error('Bitte eine Domain oder IP eingeben');
}

async function apiAsn({ asn }) {
  const n = String(asn || '').trim().toUpperCase().replace(/^AS/, '');
  if (!/^\d+$/.test(n)) throw new Error('Bitte ASN, z.B. AS15169 oder 15169');
  return rdapFetch('https://rdap.org/autnum/' + encodeURIComponent(n));
}

const ROUTES = {
  '/api/dns': apiDns,
  '/api/dns-all': apiDnsAll,
  '/api/ptr': apiPtr,
  '/api/dnsbl': apiDnsbl,
  '/api/email': apiEmail,
  '/api/rdap': apiRdap,
  '/api/asn': apiAsn,
};

// ---------- static file serving ----------
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
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

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const ip = (req.socket.remoteAddress || '').replace('::ffff:', '');
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname.startsWith('/api/')) {
    if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST erforderlich' });
    if (rateLimited(ip))      return sendJSON(res, 429, { error: 'Rate limit – kurz warten' });
    const fn = ROUTES[u.pathname];
    if (!fn) return sendJSON(res, 404, { error: 'Unbekannter Endpoint' });

    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 10_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const data = body ? JSON.parse(body) : {};
        sendJSON(res, 200, await fn(data));
      } catch (e) {
        sendJSON(res, 400, { error: e.message || String(e) });
      }
    });
    return;
  }
  serveStatic(u.pathname, res);
});

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) server.listen(PORT, () => console.log('Server Tools → http://localhost:' + PORT));

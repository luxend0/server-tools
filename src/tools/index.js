import { api } from '../lib/api.js';
/* Server Tools — tool definitions + helpers.
   Offline tools run in the browser; network tools POST to the passive backend. */

// ===================== generic helpers =====================
const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const toHexBytes = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---- Base64 ----
function b64enc(str) { let bin = ''; enc(str).forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); }
function b64dec(s) { return dec(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0))); }

// ---- Base32 (RFC 4648) ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(str) {
  const bytes = enc(str); let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  while (out.length % 8) out += '=';
  return out;
}
function base32Decode(s) {
  s = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, ''); let bits = 0, val = 0; const bytes = [];
  for (const c of s) { const i = B32.indexOf(c); if (i < 0) throw new Error('Invalid Base32 character: ' + c); val = (val << 5) | i; bits += 5; if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return dec(Uint8Array.from(bytes));
}

// ---- Hex / Binary / Unicode ----
const hexEncode = (s) => toHexBytes(enc(s));
function hexDecode(s) { s = s.replace(/0x/gi, '').replace(/\s/g, ''); if (s.length % 2) throw new Error('Odd hex length'); const out = []; for (let i = 0; i < s.length; i += 2) { const b = parseInt(s.substr(i, 2), 16); if (isNaN(b)) throw new Error('Invalid hex'); out.push(b); } return dec(Uint8Array.from(out)); }
const binEncode = (s) => [...enc(s)].map((b) => b.toString(2).padStart(8, '0')).join(' ');
function binDecode(s) { return dec(Uint8Array.from(s.trim().split(/\s+/).map((g) => { if (!/^[01]{1,8}$/.test(g)) throw new Error('Invalid binary: ' + g); return parseInt(g, 2); }))); }
const toCodePoints = (s) => [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
function fromCodePoints(s) { return s.trim().split(/\s+/).map((t) => { const n = parseInt(t.replace(/^U\+/i, ''), 16); if (isNaN(n)) throw new Error('Invalid: ' + t); return String.fromCodePoint(n); }).join(''); }

// ---- Morse ----
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '-': '-....-', '=': '-...-', '@': '.--.-.' };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const toMorse = (s) => s.toUpperCase().split('').map((c) => (c === ' ' ? '/' : MORSE[c] || '')).filter(Boolean).join(' ');
const fromMorse = (s) => s.trim().split(/\s+/).map((c) => (c === '/' ? ' ' : MORSE_REV[c] || '')).join('');

// ---- Caesar / ROT13 ----
function caesar(s, shift) { shift = ((Number(shift) || 0) % 26 + 26) % 26; return s.replace(/[a-z]/gi, (c) => { const base = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base); }); }

// ---- JWT ----
function b64url(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return dec(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))); }
function jwtDecode(tok) {
  const p = tok.trim().split('.'); if (p.length < 2) throw new Error('Not a JWT (header.payload.signature)');
  const header = JSON.parse(b64url(p[0])); const payload = JSON.parse(b64url(p[1]));
  const notes = []; ['exp', 'iat', 'nbf'].forEach((k) => { if (payload[k]) notes.push(k + ' = ' + new Date(payload[k] * 1000).toISOString()); });
  return 'HEADER:\n' + JSON.stringify(header, null, 2) + '\n\nPAYLOAD:\n' + JSON.stringify(payload, null, 2) + (notes.length ? '\n\nTimes:\n' + notes.join('\n') : '') + '\n\n(Signature NOT verified)';
}

// ---- Crypto / generators ----
async function hashHex(algo, str) { return toHexBytes(new Uint8Array(await crypto.subtle.digest(algo, enc(str)))); }
async function hmac(algo, key, msg) { const k = await crypto.subtle.importKey('raw', enc(key), { name: 'HMAC', hash: algo }, false, ['sign']); return toHexBytes(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc(msg)))); }
function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = toHexBytes(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; }
function nanoid(size) { size = Math.max(1, Math.min(256, Number(size) || 21)); const A = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'; const b = crypto.getRandomValues(new Uint8Array(size)); let o = ''; for (let i = 0; i < size; i++) o += A[b[i] & 63]; return o; }
function genPass(len, o) { let cs = ''; if (o.lower) cs += 'abcdefghijkmnpqrstuvwxyz'; if (o.upper) cs += 'ABCDEFGHJKLMNPQRSTUVWXYZ'; if (o.digits) cs += '23456789'; if (o.symbols) cs += '!@#$%^&*-_=+?'; if (!cs) throw new Error('At least one character set'); len = Math.max(4, Math.min(256, Number(len) || 20)); const a = crypto.getRandomValues(new Uint32Array(len)); let out = ''; for (let i = 0; i < len; i++) out += cs[a[i] % cs.length]; return out; }
function randomBytes(n, fmt) { n = Math.max(1, Math.min(1024, Number(n) || 16)); const b = crypto.getRandomValues(new Uint8Array(n)); if (fmt === 'base64') { let bin = ''; b.forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin); } return toHexBytes(b); }
function randInt(min, max) { min = Math.ceil(Number(min)); max = Math.floor(Number(max)); if (!isFinite(min) || !isFinite(max) || max < min) throw new Error('min ≤ max required'); return String(min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1))); }
let CRC_T = null;
function crc32(str) { if (!CRC_T) { CRC_T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } } let crc = 0xFFFFFFFF; for (const b of enc(str)) crc = CRC_T[(crc ^ b) & 255] ^ (crc >>> 8); return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0'); }

// ---- data / format ----
function jsonToCsv(text) { const data = JSON.parse(text); const arr = Array.isArray(data) ? data : [data]; if (!arr.length) return ''; const cols = [...new Set(arr.flatMap((o) => Object.keys(o || {})))]; const e = (v) => { if (v == null) return ''; v = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return [cols.join(','), ...arr.map((o) => cols.map((c) => e(o ? o[c] : '')).join(','))].join('\n'); }
function parseCsv(text) { const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else { if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } } if (cur !== '' || row.length) { row.push(cur); rows.push(row); } return rows; }
function csvToJson(text) { const rows = parseCsv(text.trim()); if (!rows.length) return '[]'; const h = rows[0]; return JSON.stringify(rows.slice(1).map((r) => { const o = {}; h.forEach((k, i) => (o[k] = r[i] != null ? r[i] : '')); return o; }), null, 2); }
function yamlScalar(x) { if (x === null) return 'null'; if (typeof x === 'string') return /[:#\-?\[\]{},&*!|>'"%@`]|^\s|\s$|^$|\n/.test(x) ? JSON.stringify(x) : x; return String(x); }
function toYaml(v, ind) { const pad = '  '.repeat(ind); if (v === null || typeof v !== 'object') return yamlScalar(v); if (Array.isArray(v)) { if (!v.length) return '[]'; return v.map((it) => (it !== null && typeof it === 'object' && Object.keys(it).length ? pad + '-\n' + toYaml(it, ind + 1) : pad + '- ' + yamlScalar(it))).join('\n'); } const keys = Object.keys(v); if (!keys.length) return '{}'; return keys.map((k) => { const val = v[k]; if (val !== null && typeof val === 'object' && Object.keys(val).length) return pad + k + ':\n' + toYaml(val, ind + 1); if (val !== null && typeof val === 'object') return pad + k + ': ' + (Array.isArray(val) ? '[]' : '{}'); return pad + k + ': ' + yamlScalar(val); }).join('\n'); }
const jsonToYaml = (t) => toYaml(JSON.parse(t), 0);
function queryToJson(s) { const p = new URLSearchParams(s.trim().replace(/^\?/, '')); const o = {}; for (const [k, v] of p) { if (k in o) { if (Array.isArray(o[k])) o[k].push(v); else o[k] = [o[k], v]; } else o[k] = v; } return JSON.stringify(o, null, 2); }
function jsonToQuery(s) { const o = JSON.parse(s); const p = new URLSearchParams(); for (const k in o) { const v = o[k]; if (Array.isArray(v)) v.forEach((x) => p.append(k, x)); else p.append(k, v == null ? '' : String(v)); } return p.toString(); }

const fmtDate = (d, ms) => ['ISO (UTC):  ' + d.toISOString(), 'Local:      ' + d.toString(), 'Unix (s):   ' + Math.floor(ms / 1000), 'Unix (ms):  ' + ms].join('\n');
function dateDiff(a, b) { const t1 = Date.parse(a), t2 = Date.parse(b); if (isNaN(t1) || isNaN(t2)) throw new Error('Date not parseable'); let ms = Math.abs(t2 - t1); const d = Math.floor(ms / 864e5); ms -= d * 864e5; const h = Math.floor(ms / 36e5); ms -= h * 36e5; const m = Math.floor(ms / 6e4); const s = Math.floor((ms - m * 6e4) / 1e3); return [d + ' days, ' + h + ' h, ' + m + ' min, ' + s + ' s', 'Total: ' + (Math.abs(t2 - t1) / 864e5).toFixed(2) + ' days', Math.abs(t2 - t1) + ' ms'].join('\n'); }
function humanizeDuration(v) { let s = Math.floor(Number(v)); if (!isFinite(s)) throw new Error('Seconds expected'); const u = [['year', 31536000], ['day', 86400], ['hr', 3600], ['min', 60], ['sec', 1]]; const out = []; for (const [n, sz] of u) { if (s >= sz) { out.push(Math.floor(s / sz) + ' ' + n); s %= sz; } } return out.join(', ') || '0 sec'; }
function tzConvert(str, tz) { const t = Date.parse(str); if (isNaN(t)) throw new Error('Date not parseable'); const d = new Date(t); const zones = tz ? [tz] : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney']; return zones.map((z) => { try { return z.padEnd(22) + new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'long', timeZone: z }).format(d); } catch { return z + ': invalid time zone'; } }).join('\n'); }

// ---- color / css ----
function parseColor(s) { s = s.trim(); let m; if ((m = s.match(/^#?([0-9a-fA-F]{6})$/))) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } if ((m = s.match(/^#?([0-9a-fA-F]{3})$/))) { const h = m[1]; return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]; } if ((m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i))) return [+m[1], +m[2], +m[3]]; throw new Error('Format: #rrggbb, #rgb or rgb(r,g,b)'); }
const toHex = (r, g, b) => '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h, s, l = (mx + mn) / 2; if (mx === mn) h = s = 0; else { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); switch (mx) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4; } h /= 6; } return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]; }
function colorAll(s) { const [r, g, b] = parseColor(s); const [h, sa, l] = rgbToHsl(r, g, b); return ['HEX: ' + toHex(r, g, b), 'RGB: rgb(' + r + ', ' + g + ', ' + b + ')', 'HSL: hsl(' + h + ', ' + sa + '%, ' + l + '%)'].join('\n'); }
function luminance(r, g, b) { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function contrast(c1, c2) { const a = parseColor(c1), b = parseColor(c2); const L1 = luminance(...a), L2 = luminance(...b); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const g = (x) => (ratio >= x ? '✓ PASS' : '✗ fail'); return ['Contrast: ' + ratio.toFixed(2) + ':1', 'AA  normal (4.5): ' + g(4.5), 'AA  large  (3.0): ' + g(3), 'AAA normal (7.0): ' + g(7), 'AAA large  (4.5): ' + g(4.5)].join('\n'); }
function palette(c) { const [r, g, b] = parseColor(c); const out = []; for (let i = 4; i >= 1; i--) { const f = i / 5; out.push('tint  ' + i * 20 + '%: ' + toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)); } out.push('base     : ' + toHex(r, g, b)); for (let i = 1; i <= 4; i++) { const f = 1 - i / 5; out.push('shade ' + i * 20 + '%: ' + toHex(r * f, g * f, b * f)); } return out.join('\n'); }

// ---- text ----
function splitWords(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ').replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(Boolean); }
function caseAll(s) { const lw = splitWords(s).map((x) => x.toLowerCase()); const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1); return ['UPPER:     ' + s.toUpperCase(), 'lower:     ' + s.toLowerCase(), 'Title:     ' + lw.map(cap).join(' '), 'camelCase: ' + lw.map((x, i) => (i ? cap(x) : x)).join(''), 'Pascal:    ' + lw.map(cap).join(''), 'snake:     ' + lw.join('_'), 'kebab:     ' + lw.join('-'), 'CONSTANT:  ' + lw.join('_').toUpperCase()].join('\n'); }
const slugify = (s) => splitWords(s).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
const LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum').split(' ');
function lorem(p) { p = Math.max(1, Math.min(20, Number(p) || 3)); const out = []; for (let pa = 0; pa < p; pa++) { const sents = 3 + (pa % 3); const para = []; for (let s = 0; s < sents; s++) { const len = 6 + ((s * 7 + pa * 3) % 8); const w = []; for (let i = 0; i < len; i++) w.push(LOREM[(i * 3 + s * 5 + pa * 7) % LOREM.length]); const t = w.join(' '); para.push(t[0].toUpperCase() + t.slice(1) + '.'); } out.push(para.join(' ')); } return out.join('\n\n'); }
function counter(s) { return ['Characters:     ' + s.length, 'no spaces:      ' + s.replace(/\s/g, '').length, 'Words:          ' + (s.trim().match(/\S+/g) || []).length, 'Lines:          ' + (s === '' ? 0 : s.split('\n').length), 'Bytes (UTF-8):  ' + enc(s).length, 'Reading time:   ~' + Math.ceil((s.trim().match(/\S+/g) || []).length / 200) + ' min'].join('\n'); }
function wordFreq(s) { const w = s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []; const m = {}; w.forEach((x) => (m[x] = (m[x] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, c]) => String(c).padStart(5) + '  ' + k).join('\n') || '(no words)'; }
function regexTest(pat, flags, text) { const f = flags.includes('g') ? flags : flags + 'g'; let re; try { re = new RegExp(pat, f); } catch (e) { throw new Error('Invalid regex: ' + e.message); } const ms = [...text.matchAll(re)]; if (!ms.length) return '(no matches)'; return ms.map((mt, i) => `#${i + 1} @${mt.index}: "${mt[0]}"` + (mt.length > 1 ? '  groups: ' + JSON.stringify(mt.slice(1)) : '')).join('\n'); }
function lineDiff(a, b) { const A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length; const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0)); for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]); const out = []; let i = 0, j = 0; while (i < n && j < m) { if (A[i] === B[j]) { out.push('  ' + A[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + A[i++]); } else { out.push('+ ' + B[j++]); } } while (i < n) out.push('- ' + A[i++]); while (j < m) out.push('+ ' + B[j++]); return out.join('\n') || '(identical / empty)'; }
function findReplace(text, find, repl, useRegex, flags) { if (!find) return text; if (useRegex) { let re; try { re = new RegExp(find, flags || 'g'); } catch (e) { throw new Error('Invalid regex: ' + e.message); } return text.replace(re, repl); } return text.split(find).join(repl); }
function stripHtml(s) { const d = document.createElement('div'); d.innerHTML = s; return (d.textContent || '').trim(); }
function htmlDec(s) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
function cleanWs(s) { return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }

// ---- math ----
function evalExpr(input) {
  const s = input.replace(/\s+/g, ''); let i = 0;
  const peek = () => s[i];
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  function term() { let v = factor(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = s[i++]; const r = factor(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; } return v; }
  function factor() { const v = unary(); if (peek() === '^') { i++; return Math.pow(v, factor()); } return v; }
  function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return primary(); }
  function primary() {
    if (peek() === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('missing )'); return v; }
    const num = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)); if (num) { i += num[0].length; return parseFloat(num[0]); }
    const id = /^[a-z]+/i.exec(s.slice(i));
    if (id) {
      i += id[0].length; const name = id[0].toLowerCase();
      if (peek() === '(') { i++; const arg = expr(); if (s[i++] !== ')') throw new Error('missing )'); const fns = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp, round: Math.round, floor: Math.floor, ceil: Math.ceil }; if (!(name in fns)) throw new Error('Unknown function: ' + name); return fns[name](arg); }
      const consts = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 }; if (name in consts) return consts[name];
      throw new Error('Unknown symbol: ' + name);
    }
    throw new Error('Parse error at "' + s.slice(i) + '"');
  }
  const r = expr(); if (i < s.length) throw new Error('Unexpected: ' + s.slice(i)); return String(r);
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function gcdLcm(aS, bS) { const a = parseInt(aS, 10), b = parseInt(bS, 10); if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('Two integers'); const g = gcd(a, b); return 'GCD: ' + g + '\nLCM: ' + (g ? Math.abs(a * b) / g : 0); }
function factorize(nS) { let n = parseInt(nS, 10); if (!Number.isSafeInteger(n) || n < 2) throw new Error('Integer ≥ 2'); const orig = n; const f = []; for (let d = 2; d * d <= n; d++) while (n % d === 0) { f.push(d); n /= d; } if (n > 1) f.push(n); return (f.length === 1 ? orig + ' is PRIME\n' : '') + 'Factors: ' + f.join(' × '); }
function toRoman(nS) { let n = parseInt(nS, 10); if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error('1–3999'); const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let o = ''; for (const [v, sym] of map) while (n >= v) { o += sym; n -= v; } return o; }
function fromRoman(s) { s = s.toUpperCase().trim(); const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let n = 0; for (let i = 0; i < s.length; i++) { if (!(s[i] in val)) throw new Error('Invalid: ' + s[i]); n += val[s[i]] < (val[s[i + 1]] || 0) ? -val[s[i]] : val[s[i]]; } return String(n); }
function percent(x, y, mode) { x = Number(x); y = Number(y); if (!isFinite(x) || !isFinite(y)) throw new Error('Two numbers'); if (mode === 'of') return x + '% of ' + y + ' = ' + (x / 100 * y); if (mode === 'is') return x + ' is ' + (y ? (x / y * 100) : 0) + '% of ' + y; return 'Change ' + x + ' → ' + y + ' = ' + (x ? ((y - x) / x * 100).toFixed(2) : '∞') + '%'; }
function aspectRatio(wS, hS) { const w = parseInt(wS, 10), h = parseInt(hS, 10); if (!w || !h) throw new Error('Width & height required'); const g = gcd(w, h); return 'Ratio: ' + w / g + ':' + h / g + '\nDecimal: ' + (w / h).toFixed(4); }
function baseConv(value, from) { value = value.trim(); const re = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-fA-F]+$/ }[from]; if (!re || !re.test(value)) throw new Error('Invalid for base ' + from); const n = parseInt(value, Number(from)); return ['BIN: ' + n.toString(2), 'OCT: ' + n.toString(8), 'DEC: ' + n.toString(10), 'HEX: ' + n.toString(16)].join('\n'); }

// ---- units ----
function tempConv(v, unit) { v = Number(v); if (!isFinite(v)) throw new Error('Number expected'); let c = unit === 'C' ? v : unit === 'F' ? (v - 32) * 5 / 9 : v - 273.15; return ['°C: ' + c.toFixed(2), '°F: ' + (c * 9 / 5 + 32).toFixed(2), 'K:  ' + (c + 273.15).toFixed(2)].join('\n'); }
const LEN = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 };
function lenConv(v, unit) { const meters = Number(v) * LEN[unit]; if (!isFinite(meters)) throw new Error('Number expected'); return Object.entries(LEN).map(([u, f]) => u.padEnd(3) + (meters / f)).join('\n'); }
const SIZE = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 };
function sizeConv(v, unit) { const bytes = Number(v) * SIZE[unit]; if (!isFinite(bytes)) throw new Error('Number expected'); return Object.entries(SIZE).map(([u, f]) => u.padEnd(4) + (bytes / f)).join('\n'); }

// ---- network (offline calc) ----
function ipToInt(ip) { const p = ip.split('.').map(Number); if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) throw new Error('Invalid IPv4'); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
const intToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
function cidrInfo(input) { const m = input.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/); if (!m) throw new Error('Format: 1.2.3.0/24'); const ipInt = ipToInt(m[1]); const pfx = Number(m[2]); if (pfx < 0 || pfx > 32) throw new Error('Prefix 0–32'); const mask = pfx === 0 ? 0 : (0xFFFFFFFF << (32 - pfx)) >>> 0; const net = (ipInt & mask) >>> 0; const bc = (net | (~mask >>> 0)) >>> 0; const total = Math.pow(2, 32 - pfx); const first = pfx >= 31 ? net : (net + 1) >>> 0; const last = pfx >= 31 ? bc : (bc - 1) >>> 0; return ['Network:    ' + intToIp(net) + '/' + pfx, 'Netmask:    ' + intToIp(mask), 'Wildcard:   ' + intToIp(~mask >>> 0), 'Broadcast:  ' + intToIp(bc), 'Host range: ' + intToIp(first) + ' – ' + intToIp(last), 'Addresses:  ' + total + '  (usable: ' + (pfx >= 31 ? total : Math.max(0, total - 2)) + ')'].join('\n'); }
function ipv4Tools(input) { input = input.trim(); if (/^\d+$/.test(input)) { const n = Number(input); if (n < 0 || n > 4294967295) throw new Error('0–4294967295'); return 'IP:  ' + intToIp(n >>> 0) + '\nHex: 0x' + (n >>> 0).toString(16); } const n = ipToInt(input); return 'Integer: ' + (n >>> 0) + '\nHex:     0x' + (n >>> 0).toString(16) + '\nBinary:  ' + input.split('.').map((o) => (+o).toString(2).padStart(8, '0')).join('.'); }
function ipv6Expand(s) { s = s.trim().toLowerCase(); if (!/^[0-9a-f:]+$/.test(s)) throw new Error('Invalid IPv6'); let parts; if (s.includes('::')) { const [a, b] = s.split('::'); const l = a ? a.split(':') : [], r = b ? b.split(':') : []; const fill = 8 - l.length - r.length; if (fill < 0) throw new Error('Invalid IPv6'); parts = [...l, ...Array(fill).fill('0'), ...r]; } else parts = s.split(':'); if (parts.length !== 8) throw new Error('Invalid IPv6 (8 groups required)'); return parts.map((p) => p.padStart(4, '0')).join(':'); }
function ipv6Compress(s) { const parts = ipv6Expand(s).split(':').map((p) => p.replace(/^0+(?=.)/, '')); let best = -1, bestLen = 0, i = 0; while (i < 8) { if (parts[i] === '0') { let j = i; while (j < 8 && parts[j] === '0') j++; if (j - i > bestLen) { bestLen = j - i; best = i; } i = j; } else i++; } if (bestLen > 1) return parts.slice(0, best).join(':') + '::' + parts.slice(best + bestLen).join(':'); return parts.join(':'); }
function parseUA(ua) { let b = 'unknown'; for (const [re, name] of [[/firefox\/([\d.]+)/i, 'Firefox'], [/edg\/([\d.]+)/i, 'Edge'], [/opr\/([\d.]+)/i, 'Opera'], [/chrome\/([\d.]+)/i, 'Chrome'], [/version\/([\d.]+).*safari/i, 'Safari']]) { const m = ua.match(re); if (m) { b = name + ' ' + m[1]; break; } } let os = 'unknown', m2; if (/windows nt 10/i.test(ua)) os = 'Windows 10/11'; else if (/windows nt/i.test(ua)) os = 'Windows'; else if ((m2 = ua.match(/mac os x ([\d_]+)/i))) os = 'macOS ' + m2[1].replace(/_/g, '.'); else if ((m2 = ua.match(/android ([\d.]+)/i))) os = 'Android ' + m2[1]; else if ((m2 = ua.match(/iphone os ([\d_]+)/i))) os = 'iOS ' + m2[1].replace(/_/g, '.'); else if (/linux/i.test(ua)) os = 'Linux'; return ['Browser: ' + b, 'OS:      ' + os, 'Type:    ' + (/mobile|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop')].join('\n'); }

// ---- reference tables ----
const HTTP_CODES = { 100: 'Continue', 101: 'Switching Protocols', 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 206: 'Partial Content', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 413: 'Payload Too Large', 415: 'Unsupported Media Type', 418: "I'm a teapot", 422: 'Unprocessable Entity', 425: 'Too Early', 429: 'Too Many Requests', 451: 'Unavailable For Legal Reasons', 500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout', 511: 'Network Authentication Required' };
const MIME = { html: 'text/html', css: 'text/css', js: 'text/javascript', json: 'application/json', xml: 'application/xml', txt: 'text/plain', csv: 'text/csv', pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon', mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', wasm: 'application/wasm' };
const PORTS = { 20: 'FTP-Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 80: 'HTTP', 110: 'POP3', 123: 'NTP', 143: 'IMAP', 161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 465: 'SMTPS', 514: 'Syslog', 587: 'SMTP-Submission', 631: 'IPP', 636: 'LDAPS', 993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle', 2375: 'Docker (insecure!)', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5672: 'AMQP', 6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 9000: 'PHP-FPM/SonarQube', 9090: 'Prometheus', 11211: 'Memcached', 27017: 'MongoDB' };
function refLookup(map, q, label) { q = (q || '').trim().toLowerCase(); const entries = Object.entries(map); const list = q ? entries.filter(([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)) : entries; if (!list.length) return '(no match)'; return list.map(([k, v]) => String(k).padEnd(label || 6) + ' ' + v).join('\n'); }

// ===================== tool definitions =====================
const ED = 'Encode / Decode', CG = 'Crypto / Generators', DF = 'Data / Format', TX = 'Text', CC = 'Color / CSS', MA = 'Math / Calc', NW = 'Network', NB = 'Network (Backend)';

export const TOOLS = [
  // ---------- Encode / Decode ----------
  { id: 'base64', cat: ED, title: 'Base64', kw: 'encode decode', inputs: [{ id: 'in', type: 'textarea', label: 'Text / Base64' }], actions: [{ label: 'Encode', run: (v) => b64enc(v.in) }, { label: 'Decode', run: (v) => b64dec(v.in) }] },
  { id: 'base32', cat: ED, title: 'Base32', inputs: [{ id: 'in', type: 'textarea', label: 'Text / Base32' }], actions: [{ label: 'Encode', run: (v) => base32Encode(v.in) }, { label: 'Decode', run: (v) => base32Decode(v.in) }] },
  { id: 'hex', cat: ED, title: 'Hex ↔ Text', inputs: [{ id: 'in', type: 'textarea', label: 'Text / Hex' }], actions: [{ label: 'Encode', run: (v) => hexEncode(v.in) }, { label: 'Decode', run: (v) => hexDecode(v.in) }] },
  { id: 'binary', cat: ED, title: 'Binary ↔ Text', inputs: [{ id: 'in', type: 'textarea', label: 'Text / Binary' }], actions: [{ label: 'Encode', run: (v) => binEncode(v.in) }, { label: 'Decode', run: (v) => binDecode(v.in) }] },
  { id: 'url', cat: ED, title: 'URL Encode', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Encode', run: (v) => encodeURIComponent(v.in) }, { label: 'Decode', run: (v) => decodeURIComponent(v.in) }] },
  { id: 'html', cat: ED, title: 'HTML Entities', inputs: [{ id: 'in', type: 'textarea', label: 'Text / HTML' }], actions: [{ label: 'Encode', run: (v) => v.in.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }, { label: 'Decode', run: (v) => htmlDec(v.in) }] },
  { id: 'unicode', cat: ED, title: 'Unicode Codepoints', inputs: [{ id: 'in', type: 'textarea', label: 'Text / U+XXXX' }], actions: [{ label: '→ Codepoints', run: (v) => toCodePoints(v.in) }, { label: '→ Text', run: (v) => fromCodePoints(v.in) }] },
  { id: 'morse', cat: ED, title: 'Morse Code', inputs: [{ id: 'in', type: 'textarea', label: 'Text / Morse' }], actions: [{ label: '→ Morse', run: (v) => toMorse(v.in) }, { label: '→ Text', run: (v) => fromMorse(v.in) }] },
  { id: 'rot', cat: ED, title: 'Caesar / ROT13', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }, { id: 'shift', type: 'number', label: 'Shift', value: '13' }], actions: [{ label: 'Shift', run: (v) => caesar(v.in, v.shift) }, { label: 'ROT13', run: (v) => caesar(v.in, 13) }] },
  { id: 'jwt', cat: ED, title: 'JWT Decoder', inputs: [{ id: 'in', type: 'textarea', label: 'JWT Token' }], actions: [{ label: 'Decode', run: (v) => jwtDecode(v.in) }] },
  { id: 'jsonesc', cat: ED, title: 'JSON String Escape', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Escape', run: (v) => JSON.stringify(v.in).slice(1, -1) }, { label: 'Unescape', run: (v) => JSON.parse('"' + v.in + '"') }] },
  { id: 'base', cat: ED, title: 'Number Base', kw: 'binary hex decimal', inputs: [{ id: 'val', type: 'text', label: 'Value' }, { id: 'from', type: 'select', label: 'Base', options: ['2', '8', '10', '16'], value: '10' }], actions: [{ label: 'Convert', run: (v) => baseConv(v.val, v.from) }] },

  // ---------- Crypto / Generators ----------
  { id: 'hash', cat: CG, title: 'Hash', kw: 'sha md5 checksum', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }, { id: 'algo', type: 'select', label: 'Algorithm', options: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'], value: 'SHA-256' }], actions: [{ label: 'Hash', run: (v) => hashHex(v.algo, v.in) }] },
  { id: 'hmac', cat: CG, title: 'HMAC', inputs: [{ id: 'msg', type: 'textarea', label: 'Message' }, { id: 'key', type: 'text', label: 'Key' }, { id: 'algo', type: 'select', label: 'Hash', options: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'], value: 'SHA-256' }], actions: [{ label: 'Sign', run: (v) => hmac(v.algo, v.key, v.msg) }] },
  { id: 'crc32', cat: CG, title: 'CRC32', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Compute', run: (v) => crc32(v.in) }] },
  { id: 'uuid', cat: CG, title: 'UUID v4', inputs: [], actions: [{ label: 'Generate', run: () => uuid() }] },
  { id: 'nanoid', cat: CG, title: 'Nano-ID / Token', inputs: [{ id: 'size', type: 'number', label: 'Length', value: '21' }], actions: [{ label: 'Generate', run: (v) => nanoid(v.size) }] },
  { id: 'pass', cat: CG, title: 'Password Generator', inputs: [{ id: 'len', type: 'number', label: 'Length', value: '20' }, { id: 'lower', type: 'checkbox', label: 'a-z', checked: true }, { id: 'upper', type: 'checkbox', label: 'A-Z', checked: true }, { id: 'digits', type: 'checkbox', label: '0-9', checked: true }, { id: 'symbols', type: 'checkbox', label: 'Symbols', checked: true }], actions: [{ label: 'Generate', run: (v) => genPass(v.len, v) }] },
  { id: 'randbytes', cat: CG, title: 'Random Bytes', inputs: [{ id: 'n', type: 'number', label: 'Byte count', value: '16' }, { id: 'fmt', type: 'select', label: 'Format', options: ['hex', 'base64'], value: 'hex' }], actions: [{ label: 'Generate', run: (v) => randomBytes(v.n, v.fmt) }] },
  { id: 'randint', cat: CG, title: 'Random Number', inputs: [{ id: 'min', type: 'number', label: 'Min', value: '1' }, { id: 'max', type: 'number', label: 'Max', value: '100' }], actions: [{ label: 'Roll', run: (v) => randInt(v.min, v.max) }] },

  // ---------- Data / Format ----------
  { id: 'json', cat: DF, title: 'JSON', inputs: [{ id: 'in', type: 'textarea', label: 'JSON' }], actions: [{ label: 'Format', run: (v) => JSON.stringify(JSON.parse(v.in), null, 2) }, { label: 'Minify', run: (v) => JSON.stringify(JSON.parse(v.in)) }, { label: 'Validate', run: (v) => { JSON.parse(v.in); return 'Valid JSON ✓'; } }] },
  { id: 'json2csv', cat: DF, title: 'JSON → CSV', inputs: [{ id: 'in', type: 'textarea', label: 'JSON (array of objects)' }], actions: [{ label: 'Convert', run: (v) => jsonToCsv(v.in) }] },
  { id: 'csv2json', cat: DF, title: 'CSV → JSON', inputs: [{ id: 'in', type: 'textarea', label: 'CSV (with header)' }], actions: [{ label: 'Convert', run: (v) => csvToJson(v.in) }] },
  { id: 'json2yaml', cat: DF, title: 'JSON → YAML', inputs: [{ id: 'in', type: 'textarea', label: 'JSON' }], actions: [{ label: 'Convert', run: (v) => jsonToYaml(v.in) }] },
  { id: 'query', cat: DF, title: 'Query String ↔ JSON', inputs: [{ id: 'in', type: 'textarea', label: 'Query / JSON' }], actions: [{ label: 'Query → JSON', run: (v) => queryToJson(v.in) }, { label: 'JSON → Query', run: (v) => jsonToQuery(v.in) }] },
  { id: 'ts', cat: DF, title: 'Unix Timestamp', inputs: [{ id: 'epoch', type: 'text', label: 'Epoch (s or ms)' }, { id: 'date', type: 'text', label: 'Date (ISO)' }], actions: [{ label: 'Now', run: () => { const t = Date.now(); return fmtDate(new Date(t), t); } }, { label: 'Epoch → Date', run: (v) => { let n = Number(v.epoch); if (!isFinite(n)) throw new Error('Number expected'); if (n < 1e12) n *= 1000; return fmtDate(new Date(n), n); } }, { label: 'Date → Epoch', run: (v) => { const t = Date.parse(v.date); if (isNaN(t)) throw new Error('Date not parseable'); return fmtDate(new Date(t), t); } }] },
  { id: 'datediff', cat: DF, title: 'Date Difference', inputs: [{ id: 'a', type: 'text', label: 'From (ISO)' }, { id: 'b', type: 'text', label: 'To (ISO)' }], actions: [{ label: 'Compute', run: (v) => dateDiff(v.a, v.b) }] },
  { id: 'duration', cat: DF, title: 'Duration (seconds → readable)', inputs: [{ id: 'in', type: 'number', label: 'Seconds' }], actions: [{ label: 'Convert', run: (v) => humanizeDuration(v.in) }] },
  { id: 'tz', cat: DF, title: 'Time Zone Converter', inputs: [{ id: 'date', type: 'text', label: 'Date (ISO)' }, { id: 'tz', type: 'text', label: 'Time zone (optional, IANA)' }], actions: [{ label: 'Convert', run: (v) => tzConvert(v.date, v.tz.trim()) }] },
  { id: 'cron', cat: DF, title: 'Cron Explainer', inputs: [{ id: 'in', type: 'text', label: 'Cron', placeholder: '*/5 * * * *' }], actions: [{ label: 'Explain', run: (v) => { const p = v.in.trim().split(/\s+/); if (p.length !== 5) throw new Error('5 fields: min hour dom mon dow'); const lab = ['Minute (0-59)', 'Hour (0-23)', 'Day of month (1-31)', 'Month (1-12)', 'Day of week (0-6)']; const d = (f) => f === '*' ? 'every value' : f.startsWith('*/') ? 'every ' + f.slice(2) : f.includes(',') ? 'at ' + f : f.includes('-') ? 'range ' + f : 'exactly ' + f; return p.map((f, i) => lab[i].padEnd(20) + f.padEnd(9) + '→ ' + d(f)).join('\n'); } }] },

  // ---------- Text ----------
  { id: 'case', cat: TX, title: 'Case Converter', inputs: [{ id: 'in', type: 'text', label: 'Text' }], actions: [{ label: 'All variants', run: (v) => caseAll(v.in) }] },
  { id: 'slug', cat: TX, title: 'Slug Generator', inputs: [{ id: 'in', type: 'text', label: 'Text' }], actions: [{ label: 'Slug', run: (v) => slugify(v.in) }] },
  { id: 'lorem', cat: TX, title: 'Lorem Ipsum', inputs: [{ id: 'p', type: 'number', label: 'Paragraphs', value: '3' }], actions: [{ label: 'Generate', run: (v) => lorem(v.p) }] },
  { id: 'count', cat: TX, title: 'Counter', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Count', run: (v) => counter(v.in) }] },
  { id: 'wordfreq', cat: TX, title: 'Word Frequency', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Top 60', run: (v) => wordFreq(v.in) }] },
  { id: 'regex', cat: TX, title: 'Regex Tester', inputs: [{ id: 'pat', type: 'text', label: 'Pattern' }, { id: 'flags', type: 'text', label: 'Flags', placeholder: 'gi' }, { id: 'text', type: 'textarea', label: 'Text' }], actions: [{ label: 'Test', run: (v) => regexTest(v.pat, v.flags || '', v.text) }] },
  { id: 'replace', cat: TX, title: 'Find & Replace', inputs: [{ id: 'text', type: 'textarea', label: 'Text' }, { id: 'find', type: 'text', label: 'Find' }, { id: 'repl', type: 'text', label: 'Replace' }, { id: 'rx', type: 'checkbox', label: 'Regex' }], actions: [{ label: 'Replace', run: (v) => findReplace(v.text, v.find, v.repl, v.rx, 'g') }] },
  { id: 'lines', cat: TX, title: 'Line Tools', inputs: [{ id: 'in', type: 'textarea', label: 'Lines' }], actions: [{ label: 'Sort A→Z', run: (v) => v.in.split('\n').sort((a, b) => a.localeCompare(b)).join('\n') }, { label: 'Sort Z→A', run: (v) => v.in.split('\n').sort((a, b) => b.localeCompare(a)).join('\n') }, { label: 'Dedupe', run: (v) => [...new Set(v.in.split('\n'))].join('\n') }, { label: 'Reverse', run: (v) => v.in.split('\n').reverse().join('\n') }, { label: 'Trim + drop empty', run: (v) => v.in.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') }] },
  { id: 'reverse', cat: TX, title: 'Reverse Text', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Characters', run: (v) => [...v.in].reverse().join('') }, { label: 'Words', run: (v) => v.in.split(/\s+/).reverse().join(' ') }] },
  { id: 'striphtml', cat: TX, title: 'HTML → Text', inputs: [{ id: 'in', type: 'textarea', label: 'HTML' }], actions: [{ label: 'Remove tags', run: (v) => stripHtml(v.in) }] },
  { id: 'whitespace', cat: TX, title: 'Whitespace Cleaner', inputs: [{ id: 'in', type: 'textarea', label: 'Text' }], actions: [{ label: 'Clean up', run: (v) => cleanWs(v.in) }] },
  { id: 'diff', cat: TX, title: 'Text Diff', inputs: [{ id: 'a', type: 'textarea', label: 'A (old)' }, { id: 'b', type: 'textarea', label: 'B (new)' }], actions: [{ label: 'Diff', run: (v) => lineDiff(v.a, v.b) }] },

  // ---------- Color / CSS ----------
  { id: 'color', cat: CC, title: 'Color Converter', preview: true, live: true, inputs: [{ id: 'in', type: 'text', label: 'Color', value: '#a78bfa', placeholder: '#a78bfa / rgb(...)' }], actions: [{ label: 'Convert', run: (v, c) => { const out = colorAll(v.in); if (c.preview) { c.preview.style.background = toHex(...parseColor(v.in)); c.preview.textContent = ''; } return out; } }] },
  { id: 'contrast', cat: CC, title: 'Contrast Checker (WCAG)', inputs: [{ id: 'fg', type: 'color', label: 'Foreground', value: '#e8e5f2' }, { id: 'bg', type: 'color', label: 'Background', value: '#1a1828' }], actions: [{ label: 'Check', run: (v) => contrast(v.fg, v.bg) }] },
  { id: 'palette', cat: CC, title: 'Tints & Shades', inputs: [{ id: 'in', type: 'text', label: 'Base color', value: '#a78bfa' }], actions: [{ label: 'Palette', run: (v) => palette(v.in) }] },
  { id: 'boxshadow', cat: CC, title: 'Box-Shadow Generator', preview: true, live: true, inputs: [{ id: 'x', type: 'number', label: 'X', value: '0' }, { id: 'y', type: 'number', label: 'Y', value: '8' }, { id: 'blur', type: 'number', label: 'Blur', value: '24' }, { id: 'spread', type: 'number', label: 'Spread', value: '0' }, { id: 'color', type: 'color', label: 'Color', value: '#a78bfa' }, { id: 'inset', type: 'checkbox', label: 'inset' }], actions: [{ label: 'CSS', run: (v, c) => { const css = `${v.inset ? 'inset ' : ''}${v.x}px ${v.y}px ${v.blur}px ${v.spread}px ${v.color}`; if (c.preview) { c.preview.style.cssText = 'box-shadow:' + css; c.preview.style.background = '#fff'; c.preview.textContent = ''; } return 'box-shadow: ' + css + ';'; } }] },
  { id: 'radius', cat: CC, title: 'Border-Radius Generator', preview: true, live: true, inputs: [{ id: 'tl', type: 'number', label: '↖', value: '12' }, { id: 'tr', type: 'number', label: '↗', value: '12' }, { id: 'br', type: 'number', label: '↘', value: '12' }, { id: 'bl', type: 'number', label: '↙', value: '12' }], actions: [{ label: 'CSS', run: (v, c) => { const css = `${v.tl}px ${v.tr}px ${v.br}px ${v.bl}px`; if (c.preview) { c.preview.style.borderRadius = css; c.preview.style.background = 'linear-gradient(135deg,#c4b5fd,#a78bfa)'; c.preview.textContent = ''; } return 'border-radius: ' + css + ';'; } }] },
  { id: 'gradient', cat: CC, title: 'Gradient Generator', preview: true, live: true, inputs: [{ id: 'c1', type: 'color', label: 'Color 1', value: '#c4b5fd' }, { id: 'c2', type: 'color', label: 'Color 2', value: '#7c5dfa' }, { id: 'angle', type: 'number', label: 'Angle°', value: '135' }, { id: 'type', type: 'select', label: 'Type', options: ['linear', 'radial'], value: 'linear' }], actions: [{ label: 'CSS', run: (v, c) => { const g = v.type === 'radial' ? `radial-gradient(circle, ${v.c1}, ${v.c2})` : `linear-gradient(${v.angle}deg, ${v.c1}, ${v.c2})`; if (c.preview) { c.preview.style.background = g; c.preview.textContent = ''; } return 'background: ' + g + ';'; } }] },
  { id: 'cssunits', cat: CC, title: 'CSS Units', inputs: [{ id: 'px', type: 'number', label: 'Pixels', value: '16' }, { id: 'base', type: 'number', label: 'Base (px)', value: '16' }], actions: [{ label: 'Convert', run: (v) => { const px = Number(v.px), base = Number(v.base) || 16; return ['px:  ' + px, 'rem: ' + px / base + 'rem', 'em:  ' + px / base + 'em', 'pt:  ' + px * 0.75 + 'pt', '%:   ' + (px / base * 100) + '%'].join('\n'); } }] },

  // ---------- Math / Calc ----------
  { id: 'calc', cat: MA, title: 'Expression Calculator', kw: 'calculator math', inputs: [{ id: 'in', type: 'text', label: 'Expression', placeholder: '2*(3+4)^2 / sqrt(16)' }], actions: [{ label: 'Compute', run: (v) => evalExpr(v.in) }] },
  { id: 'percent', cat: MA, title: 'Percentage Calculator', inputs: [{ id: 'x', type: 'number', label: 'X' }, { id: 'y', type: 'number', label: 'Y' }], actions: [{ label: 'X% of Y', run: (v) => percent(v.x, v.y, 'of') }, { label: 'X is ?% of Y', run: (v) => percent(v.x, v.y, 'is') }, { label: 'Change X→Y', run: (v) => percent(v.x, v.y, 'change') }] },
  { id: 'factor', cat: MA, title: 'Prime Factors', inputs: [{ id: 'in', type: 'number', label: 'Number ≥ 2' }], actions: [{ label: 'Factorize', run: (v) => factorize(v.in) }] },
  { id: 'gcdlcm', cat: MA, title: 'GCD / LCM', inputs: [{ id: 'a', type: 'number', label: 'A' }, { id: 'b', type: 'number', label: 'B' }], actions: [{ label: 'Compute', run: (v) => gcdLcm(v.a, v.b) }] },
  { id: 'roman', cat: MA, title: 'Roman Numerals', inputs: [{ id: 'in', type: 'text', label: 'Number or Roman' }], actions: [{ label: '→ Roman', run: (v) => toRoman(v.in) }, { label: '→ Decimal', run: (v) => fromRoman(v.in) }] },
  { id: 'aspect', cat: MA, title: 'Aspect Ratio', inputs: [{ id: 'w', type: 'number', label: 'Width' }, { id: 'h', type: 'number', label: 'Height' }], actions: [{ label: 'Compute', run: (v) => aspectRatio(v.w, v.h) }] },
  { id: 'temp', cat: MA, title: 'Temperature', inputs: [{ id: 'v', type: 'number', label: 'Value' }, { id: 'unit', type: 'select', label: 'Unit', options: ['C', 'F', 'K'], value: 'C' }], actions: [{ label: 'Convert', run: (v) => tempConv(v.v, v.unit) }] },
  { id: 'length', cat: MA, title: 'Length', inputs: [{ id: 'v', type: 'number', label: 'Value' }, { id: 'unit', type: 'select', label: 'Unit', options: Object.keys(LEN), value: 'm' }], actions: [{ label: 'Convert', run: (v) => lenConv(v.v, v.unit) }] },
  { id: 'datasize', cat: MA, title: 'Data Size', inputs: [{ id: 'v', type: 'number', label: 'Value' }, { id: 'unit', type: 'select', label: 'Unit', options: Object.keys(SIZE), value: 'MB' }], actions: [{ label: 'Convert', run: (v) => sizeConv(v.v, v.unit) }] },

  // ---------- Network (offline) ----------
  { id: 'cidr', cat: NW, title: 'CIDR / Subnet', inputs: [{ id: 'in', type: 'text', label: 'CIDR', placeholder: '192.168.1.0/24' }], actions: [{ label: 'Compute', run: (v) => cidrInfo(v.in) }] },
  { id: 'ipv4int', cat: NW, title: 'IPv4 ↔ Integer', inputs: [{ id: 'in', type: 'text', label: 'IP or Integer', placeholder: '8.8.8.8' }], actions: [{ label: 'Convert', run: (v) => ipv4Tools(v.in) }] },
  { id: 'ipv6', cat: NW, title: 'IPv6 Expand/Compress', inputs: [{ id: 'in', type: 'text', label: 'IPv6', placeholder: '2606:4700::1111' }], actions: [{ label: 'Expand', run: (v) => ipv6Expand(v.in) }, { label: 'Compress', run: (v) => ipv6Compress(v.in) }] },
  { id: 'ua', cat: NW, title: 'User-Agent Parser', inputs: [{ id: 'in', type: 'textarea', label: 'User-Agent', value: navigator.userAgent }], actions: [{ label: 'Parse', run: (v) => parseUA(v.in) }] },
  { id: 'httpcodes', cat: NW, title: 'HTTP Status Codes', inputs: [{ id: 'q', type: 'text', label: 'Code/search (empty = all)', placeholder: '404' }], actions: [{ label: 'Look up', run: (v) => refLookup(HTTP_CODES, v.q, 4) }] },
  { id: 'mime', cat: NW, title: 'MIME Types', inputs: [{ id: 'q', type: 'text', label: 'Extension/search', placeholder: 'png' }], actions: [{ label: 'Look up', run: (v) => refLookup(MIME, v.q, 6) }] },
  { id: 'ports', cat: NW, title: 'Well-Known Ports', inputs: [{ id: 'q', type: 'text', label: 'Port/search', placeholder: '443' }], actions: [{ label: 'Look up', run: (v) => refLookup(PORTS, v.q, 6) }] },

  // ---------- Network (Backend, passive) ----------
  { id: 'dns', cat: NB, title: 'DNS Lookup', inputs: [{ id: 'name', type: 'text', label: 'Domain', placeholder: 'example.com' }, { id: 'type', type: 'select', label: 'Type', options: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV', 'CAA', 'PTR'], value: 'A' }], actions: [{ label: 'Lookup', run: async (v) => { const j = await api('/api/dns', { name: v.name.trim(), type: v.type }); return JSON.stringify(j.records, null, 2); } }] },
  { id: 'dnsall', cat: NB, title: 'DNS — all records', inputs: [{ id: 'name', type: 'text', label: 'Domain', placeholder: 'example.com' }], actions: [{ label: 'Query all', run: async (v) => { const j = await api('/api/dns-all', { name: v.name.trim() }); return Object.entries(j.records).map(([t, r]) => '# ' + t + '\n' + (Array.isArray(r) ? JSON.stringify(r) : '(' + (r.error || '–') + ')')).join('\n\n'); } }] },
  { id: 'ptr', cat: NB, title: 'Reverse DNS (PTR)', inputs: [{ id: 'ip', type: 'text', label: 'IP', placeholder: '8.8.8.8' }], actions: [{ label: 'Reverse', run: async (v) => { const j = await api('/api/ptr', { ip: v.ip.trim() }); return j.names.join('\n') || '(none)'; } }] },
  { id: 'dnsbl', cat: NB, title: 'Blacklist / DNSBL', note: 'IPv4. Some RBLs rate-limit server queries.', inputs: [{ id: 'ip', type: 'text', label: 'IPv4', placeholder: '1.2.3.4' }], actions: [{ label: 'Check', run: async (v) => { const j = await api('/api/dnsbl', { ip: v.ip.trim() }); return j.results.map((r) => (r.listed ? '⚠ LISTED ' : 'ok clean ') + r.zone + (r.codes ? ' (' + r.codes.join(',') + ')' : '') + (r.reason ? ' – ' + r.reason : '') + (r.error ? ' [err:' + r.error + ']' : '')).join('\n'); } }] },
  { id: 'email', cat: NB, title: 'Email Config', kw: 'mx spf dkim dmarc', inputs: [{ id: 'domain', type: 'text', label: 'Domain', placeholder: 'example.com' }, { id: 'selector', type: 'text', label: 'DKIM selector (optional)', placeholder: 'default, google …' }], actions: [{ label: 'Analyze', run: async (v) => { const j = await api('/api/email', { domain: v.domain.trim(), selector: (v.selector || '').trim() || undefined }); const L = ['# MX']; L.push(Array.isArray(j.mx) ? (j.mx.map((m) => m.priority + '\t' + m.exchange).join('\n') || '(none)') : 'Error: ' + (j.mx && j.mx.error)); L.push('', '# SPF', j.spf || '(no SPF)', '', '# DMARC', j.dmarc || '(no DMARC)'); if ((v.selector || '').trim()) L.push('', '# DKIM (' + v.selector.trim() + ')', typeof j.dkim === 'string' ? j.dkim : '(' + ((j.dkim && j.dkim.error) || 'not found') + ')'); return L.join('\n'); } }] },
  { id: 'rdap', cat: NB, title: 'WHOIS / RDAP', inputs: [{ id: 'q', type: 'text', label: 'Domain or IP', placeholder: 'example.com / 8.8.8.8' }], actions: [{ label: 'Lookup', run: async (v) => { const j = await api('/api/rdap', { query: v.q.trim() }); return rdapSummary(j); } }] },
  { id: 'asn', cat: NB, title: 'ASN Lookup', inputs: [{ id: 'asn', type: 'text', label: 'ASN', placeholder: 'AS15169 / 15169' }], actions: [{ label: 'Lookup', run: async (v) => { const j = await api('/api/asn', { asn: v.asn.trim() }); return rdapSummary(j); } }] },
];

function rdapSummary(j) {
  const o = [];
  if (j.ldhName) o.push('Domain: ' + j.ldhName);
  if (j.handle) o.push('Handle: ' + j.handle);
  if (j.name) o.push('Name: ' + j.name);
  if (j.startAddress) o.push('Range: ' + j.startAddress + ' – ' + j.endAddress);
  if (j.country) o.push('Country: ' + j.country);
  if (Array.isArray(j.status)) o.push('Status: ' + j.status.join(', '));
  (j.events || []).forEach((e) => o.push(e.eventAction + ': ' + e.eventDate));
  (j.nameservers || []).forEach((n) => o.push('NS: ' + n.ldhName));
  (j.entities || []).forEach((ent) => { const roles = (ent.roles || []).join('/'); let nm = ent.handle || ''; if (ent.vcardArray && ent.vcardArray[1]) { const fn = ent.vcardArray[1].find((x) => x[0] === 'fn'); if (fn) nm = fn[3]; } o.push('• ' + roles + ': ' + nm); });
  o.push('', '--- raw ---', JSON.stringify(j, null, 2));
  return o.join('\n');
}

export const CAT_ORDER = [ED, CG, DF, TX, CC, MA, NW, NB];

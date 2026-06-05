import { Link } from 'react-router-dom';
import { TOOLS } from '../tools/index.js';

const CARDS = [
  { n: '01', to: '/tools', title: 'Tools', desc: TOOLS.length + ' offline- & netzwerk-utilities: encode/decode, crypto, daten, text, farbe, mathe, netzwerk.' },
  { n: '02', to: '/pwned', title: 'Pwned', desc: 'Passwort (k-anonym, lokal gehasht) & E-Mail (mit HIBP_KEY) gegen datenlecks prüfen.' },
  { n: '03', to: '/infected', title: 'Infected', desc: 'Passive IP-reputation (DNSBL / botnet) + offline log-/IOC-analyse.' },
];

export default function Home() {
  return (
    <div>
      <div className="home-hero">
        <p className="kicker">// passive dev &amp; security toolbox</p>
        <h1 className="title">server<span style={{ color: 'var(--dim)' }}>//</span>tools</h1>
        <p className="lead">Ein hub kleiner web-tools. Offline-tools laufen im browser; das backend ist
          <strong> passiv</strong> — es verbindet nur zu DNS-resolvern, RDAP und festen HIBP-endpunkten.
          Kein port-scanner, keine SSRF.</p>
      </div>
      <div className="home-grid">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="home-card">
            <span className="idx">[{c.n}]</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="go">open &rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

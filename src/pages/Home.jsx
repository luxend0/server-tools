import { Link } from 'react-router-dom';
import { Wrench, ShieldAlert, Bug, ArrowRight } from 'lucide-react';
import { TOOLS } from '../tools/index.js';

const CARDS = [
  { n: '01', to: '/tools', title: 'Tools', Icon: Wrench, desc: TOOLS.length + ' offline & network utilities: encode/decode, crypto, data, text, color, math, network.' },
  { n: '02', to: '/pwned', title: 'Pwned', Icon: ShieldAlert, desc: 'Check a password (k-anonymous, hashed locally) or an email (with HIBP_KEY) against known breaches.' },
  { n: '03', to: '/infected', title: 'Infected', Icon: Bug, desc: 'Passive IP reputation (DNSBL / botnet lists) plus an offline log / IOC analyzer.' },
];

function HeroGraphic() {
  return (
    <svg className="hero-graphic" viewBox="0 0 320 180" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
      <rect x="8" y="10" width="218" height="150" />
      <line className="dim" x1="8" y1="30" x2="226" y2="30" />
      <circle cx="19" cy="20" r="2.4" /><circle cx="29" cy="20" r="2.4" /><circle cx="39" cy="20" r="2.4" />
      <path className="dim" d="M19 48 l9 6 l-9 6" />
      <line x1="36" y1="54" x2="128" y2="54" />
      <line className="dim" x1="19" y1="74" x2="160" y2="74" />
      <line className="dim" x1="19" y1="90" x2="104" y2="90" />
      <line x1="19" y1="110" x2="64" y2="110" />
      <rect x="70" y="103" width="9" height="13" fill="currentColor" stroke="none" />
      <line className="dim" x1="19" y1="134" x2="150" y2="134" />
      <circle cx="270" cy="44" r="8" /><circle cx="300" cy="86" r="8" />
      <circle cx="262" cy="126" r="8" /><circle cx="298" cy="148" r="8" />
      <line className="dim" x1="270" y1="52" x2="262" y2="118" />
      <line className="dim" x1="277" y1="48" x2="293" y2="82" />
      <line className="dim" x1="298" y1="94" x2="269" y2="122" />
      <line className="dim" x1="268" y1="132" x2="292" y2="143" />
    </svg>
  );
}

export default function Home() {
  return (
    <div>
      <div className="home-hero">
        <div className="hero-text">
          <p className="kicker">// passive dev &amp; security toolbox</p>
          <h1 className="title">server<span style={{ color: 'var(--dim)' }}>//</span>tools</h1>
          <p className="lead">A hub of small web tools. Offline tools run entirely in your browser; the backend is
            <strong> passive</strong> — it only talks to DNS resolvers, RDAP and fixed HIBP endpoints.
            No port-scanner, no SSRF.</p>
        </div>
        <HeroGraphic />
      </div>
      <div className="home-grid">
        {CARDS.map(({ n, to, title, Icon, desc }) => (
          <Link key={to} to={to} className="home-card">
            <span className="home-ico"><Icon size={28} strokeWidth={1.5} /></span>
            <span className="idx">[{n}]</span>
            <h3>{title}</h3>
            <p>{desc}</p>
            <span className="go">open <ArrowRight size={13} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

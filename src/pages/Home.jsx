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

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

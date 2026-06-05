import { NavLink, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Tools from './pages/Tools.jsx';
import ToolPage from './pages/ToolPage.jsx';
import Pwned from './pages/Pwned.jsx';
import Infected from './pages/Infected.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/tools', label: 'Tools' },
  { to: '/pwned', label: 'Pwned' },
  { to: '/infected', label: 'Infected' },
];

export default function App() {
  return (
    <div className="term">
      <header className="topbar">
        <NavLink to="/" className="brand">server<b>//</b>tools<i className="cursor" /></NavLink>
        <nav className="mainnav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/:id" element={<ToolPage />} />
          <Route path="/pwned" element={<Pwned />} />
          <Route path="/infected" element={<Infected />} />
        </Routes>
      </main>
      <footer className="statusline">
        <span className="ok">● passive</span>
        <span className="sep">/</span>
        <span>backend spricht nur mit DNS · rdap.org · api.pwnedpasswords.com · haveibeenpwned.com (nur mit HIBP_KEY)</span>
        <span className="sep">/</span>
        <span>kein port-scan · keine SSRF</span>
      </footer>
    </div>
  );
}

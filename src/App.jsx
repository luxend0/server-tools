import { NavLink, Routes, Route } from 'react-router-dom';
import { Terminal, Wrench, ShieldAlert, Bug } from 'lucide-react';
import Home from './pages/Home.jsx';
import Tools from './pages/Tools.jsx';
import ToolPage from './pages/ToolPage.jsx';
import Pwned from './pages/Pwned.jsx';
import Infected from './pages/Infected.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true, Icon: Terminal },
  { to: '/tools', label: 'Tools', Icon: Wrench },
  { to: '/pwned', label: 'Pwned', Icon: ShieldAlert },
  { to: '/infected', label: 'Infected', Icon: Bug },
];

export default function App() {
  return (
    <div className="term">
      <header className="topbar">
        <NavLink to="/" className="brand">server<b>//</b>tools<i className="cursor" /></NavLink>
        <nav className="mainnav">
          {LINKS.map(({ to, label, end, Icon }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
              <Icon size={14} strokeWidth={1.75} />{label}
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
        <span>backend talks only to DNS · rdap.org · api.pwnedpasswords.com · haveibeenpwned.com (only with HIBP_KEY)</span>
        <span className="sep">/</span>
        <span>no port-scan · no SSRF</span>
      </footer>
    </div>
  );
}

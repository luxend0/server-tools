import { useEffect, useMemo, useRef, useState } from 'react';
import { TOOLS, CAT_ORDER } from '../tools/index.js';
import ToolCard from '../components/ToolCard.jsx';

export default function Tools() {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TOOLS;
    return TOOLS.filter((t) =>
      (t.title + ' ' + (t.kw || '') + ' ' + t.id).toLowerCase().includes(s));
  }, [q]);
  const byCat = useMemo(() => {
    const m = {};
    for (const t of filtered) (m[t.cat] ||= []).push(t);
    return m;
  }, [filtered]);
  // Press "/" anywhere to focus the search box (unless already typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/') return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div>
      <div className="search-wrap">
        <input ref={inputRef} className="search" aria-label="Tool suchen" value={q}
          placeholder="Tool suchen…  ( / )" onChange={(e) => setQ(e.target.value)} />
        <span className="count">{filtered.length} / {TOOLS.length}</span>
      </div>
      {CAT_ORDER.filter((cat) => byCat[cat]).map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="grid">
            {byCat[cat].map((t) => <ToolCard key={t.id} tool={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

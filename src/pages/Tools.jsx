import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LayoutGrid } from 'lucide-react';
import { TOOLS, CAT_ORDER } from '../tools/index.js';
import { iconForTool, iconForCat } from '../lib/catmeta.jsx';

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
  // Press "/" anywhere to focus the filter (unless already typing in a field).
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
      <div className="page-head">
        <LayoutGrid size={28} strokeWidth={1.5} />
        <div>
          <p className="kicker">// index</p>
          <h1 className="title">Tools</h1>
        </div>
      </div>
      <p className="lead">{TOOLS.length} offline &amp; network utilities. Press <strong>/</strong> to focus the filter.</p>
      <div className="search-bar">
        <Search size={15} />
        <input ref={inputRef} aria-label="Filter tools" value={q}
          placeholder="filter… (id · name · keyword)" onChange={(e) => setQ(e.target.value)} />
        <span className="count">[ {filtered.length} // {TOOLS.length} ]</span>
      </div>
      {filtered.length === 0 && <p className="empty-msg">// no matches for &quot;{q}&quot;</p>}
      {CAT_ORDER.filter((cat) => byCat[cat]).map((cat) => {
        const CatIcon = iconForCat(cat);
        return (
          <section key={cat}>
            <div className="sect-head">
              <span className="sect-ico"><CatIcon size={15} strokeWidth={1.75} /></span>
              <h2>{cat}</h2>
              <span className="fill" />
              <span className="meta">{byCat[cat].length}</span>
            </div>
            <div className="tiles">
              {byCat[cat].map((t) => {
                const Icon = iconForTool(t);
                return (
                  <Link key={t.id} to={'/tools/' + t.id} className="tile">
                    <span className="tile-ico"><Icon size={18} strokeWidth={1.5} /></span>
                    <span className="tile-id">{t.id}</span>
                    <span className="tile-title">{t.title}</span>
                    {t.kw && <span className="tile-kw">{t.kw}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { TOOLS } from '../tools/index.js';
import ToolCard from '../components/ToolCard.jsx';

export default function ToolPage() {
  const { id } = useParams();
  const idx = TOOLS.findIndex((t) => t.id === id);
  const tool = TOOLS[idx];

  if (!tool) {
    return (
      <div>
        <p className="kicker">// 404</p>
        <h1 className="title">Unbekanntes Tool</h1>
        <p className="lead">Kein Tool mit der ID <code>{id}</code>.</p>
        <Link to="/tools" className="ghost">&lt; zurück zum index</Link>
      </div>
    );
  }

  const prev = TOOLS[idx - 1];
  const next = TOOLS[idx + 1];

  return (
    <div>
      <div className="crumb">
        <Link to="/tools">Tools</Link>
        <span className="sep">/</span>
        <span className="here">{tool.id}</span>
      </div>
      <div className="toolpage-head">
        <div>
          <h1 className="title">{tool.title}</h1>
          <div className="id">&rsaquo; {tool.id}</div>
        </div>
        <span className="tag inv">{tool.cat}</span>
      </div>

      <ToolCard tool={tool} />

      <div className="pager">
        {prev
          ? <Link to={'/tools/' + prev.id}>&lt; {prev.title}</Link>
          : <span className="disabled">&lt; —</span>}
        {next
          ? <Link to={'/tools/' + next.id}>{next.title} &gt;</Link>
          : <span className="disabled">— &gt;</span>}
      </div>
    </div>
  );
}

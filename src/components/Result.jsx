import { useState } from 'react';

export default function Result({ value, error }) {
  const [copied, setCopied] = useState(false);
  if (error) return <pre className="result error">{String(error)}</pre>;
  if (value == null || value === '') return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); setCopied(true);
      setTimeout(() => setCopied(false), 1200); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="result-wrap">
      <button type="button" className="copy" onClick={copy}>{copied ? '✓ kopiert' : 'Kopieren'}</button>
      <pre className="result">{String(value)}</pre>
    </div>
  );
}

import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { api } from '../lib/api.js';
import { checkPassword } from '../lib/hibp.js';

function PasswordTab() {
  const [pw, setPw] = useState('');
  const [state, setState] = useState({ status: 'idle', count: 0, error: '' });
  const run = async () => {
    if (!pw) return;
    setState({ status: 'loading', count: 0, error: '' });
    try { const count = await checkPassword(pw, api);
      setState({ status: 'done', count, error: '' }); }
    catch (e) { setState({ status: 'error', count: 0, error: e.message }); }
  };
  return (
    <div>
      <p className="note">Das passwort verlässt den browser nicht. Es wird lokal mit SHA-1 gehasht;
        nur die ersten 5 hash-zeichen werden gesendet (k-anonymität).</p>
      <input type="password" value={pw} placeholder="passwort eingeben…"
        onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      <div className="actions">
        <button type="button" onClick={run} disabled={state.status === 'loading'}>prüfen</button>
      </div>
      {state.status === 'loading' && <p className="statusmsg">prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && (state.count > 0
        ? <div className="verdict alarm">⚠ in {state.count.toLocaleString('de-DE')} datenlecks gefunden — nicht verwenden.</div>
        : <div className="verdict clean">✓ in keinem bekannten datenleck gefunden.</div>)}
    </div>
  );
}

function EmailTab() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const run = async () => {
    if (!email) return;
    setState({ status: 'loading', data: null, error: '' });
    try { const data = await api('/api/hibp-email', { email });
      setState({ status: 'done', data, error: '' }); }
    catch (e) { setState({ status: 'error', data: null, error: e.message }); }
  };
  return (
    <div>
      <input type="email" value={email} placeholder="name@example.com"
        onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      <div className="actions">
        <button type="button" onClick={run} disabled={state.status === 'loading'}>prüfen</button>
      </div>
      {state.status === 'loading' && <p className="statusmsg">prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && state.data && (
        state.data.configured === false
          ? <p className="note">E-Mail-prüfung ist nicht konfiguriert (kein HIBP_KEY gesetzt).</p>
          : state.data.breaches.length === 0
            ? <div className="verdict clean">✓ in keinem bekannten datenleck gefunden.</div>
            : <ul className="data-list">{state.data.breaches.map((b) => (
                <li key={b.name}><strong>{b.title}</strong> ({b.date}) — {b.data.join(', ')}</li>
              ))}</ul>
      )}
    </div>
  );
}

export default function Pwned() {
  return (
    <div>
      <p className="kicker">// have i been pwned</p>
      <h1 className="title">Pwned?</h1>
      <p className="lead">Passwort- und E-Mail-leak-check gegen die HIBP-datenbank.</p>
      <Tabs.Root defaultValue="password">
        <Tabs.List>
          <Tabs.Trigger value="password">Passwort</Tabs.Trigger>
          <Tabs.Trigger value="email">E-Mail</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="password"><PasswordTab /></Tabs.Content>
        <Tabs.Content value="email"><EmailTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

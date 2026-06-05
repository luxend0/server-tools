import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { ShieldAlert, Lock, ShieldCheck, ShieldX, Info } from 'lucide-react';
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
      <p className="note"><Lock size={14} /><span>Your password never leaves the browser. It is hashed locally with
        SHA-1; only the first 5 hash characters are sent (k-anonymity).</span></p>
      <input type="password" value={pw} placeholder="enter a password…"
        onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      <div className="actions">
        <button type="button" onClick={run} disabled={state.status === 'loading'}>check</button>
      </div>
      {state.status === 'loading' && <p className="statusmsg">checking…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && (state.count > 0
        ? <div className="verdict alarm"><ShieldX size={16} /> found in {state.count.toLocaleString('en-US')} breaches — do not use it.</div>
        : <div className="verdict clean"><ShieldCheck size={16} /> not found in any known breach.</div>)}
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
        <button type="button" onClick={run} disabled={state.status === 'loading'}>check</button>
      </div>
      {state.status === 'loading' && <p className="statusmsg">checking…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && state.data && (
        state.data.configured === false
          ? <p className="note"><Info size={14} /><span>Email check is not configured (no HIBP_KEY set).</span></p>
          : state.data.breaches.length === 0
            ? <div className="verdict clean"><ShieldCheck size={16} /> not found in any known breach.</div>
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
      <div className="page-head">
        <ShieldAlert size={28} strokeWidth={1.5} />
        <div>
          <p className="kicker">// have i been pwned</p>
          <h1 className="title">Pwned?</h1>
        </div>
      </div>
      <p className="lead">Password and email leak checks against the HIBP database.</p>
      <Tabs.Root defaultValue="password">
        <Tabs.List>
          <Tabs.Trigger value="password">Password</Tabs.Trigger>
          <Tabs.Trigger value="email">Email</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="password"><PasswordTab /></Tabs.Content>
        <Tabs.Content value="email"><EmailTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

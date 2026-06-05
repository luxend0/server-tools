import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { api } from '../lib/api.js';
import { analyze } from '../lib/ioc.js';

function ReputationTab() {
  const [ip, setIp] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const run = async () => {
    setState({ status: 'loading', data: null, error: '' });
    try { const data = await api('/api/reputation', { ip });
      setState({ status: 'done', data, error: '' }); }
    catch (e) { setState({ status: 'error', data: null, error: e.message }); }
  };
  const d = state.data;
  return (
    <div>
      <p className="note">Passiv: nur DNS-basierte Blacklist-/Botnet-Abfragen + RDAP. Kein Scan deines Servers.</p>
      <input value={ip} placeholder="Server-IPv4, z. B. 203.0.113.10" onChange={(e) => setIp(e.target.value)} />
      <button type="button" onClick={run}>Prüfen</button>
      {state.status === 'loading' && <p>Prüfe…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && d && (
        <div>
          <p className={'result ' + (d.summary.botnet ? 'error' : d.summary.spam ? '' : 'ok')}>
            Verdikt: {d.summary.verdict} (Botnet-Listen: {d.summary.botnet}, Spam-Listen: {d.summary.spam})
          </p>
          {d.ptr && <p>PTR: {d.ptr.join(', ')}</p>}
          {d.abuse && <p>Abuse-Kontakt: {d.abuse}</p>}
          <ul>{d.listings.filter((l) => l.listed).map((l) => (
            <li key={l.zone} className={l.kind === 'botnet' ? 'result error' : ''}>
              {l.zone} [{l.kind}] {l.reason ? '— ' + l.reason : ''}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

function IocTab() {
  const [text, setText] = useState('');
  const findings = text.trim() ? analyze(text) : [];
  return (
    <div>
      <p className="note">100 % offline. Füge Ausgaben ein von z. B.
        <code> ps aux</code>, <code>ss -tlnp</code>, <code>crontab -l</code>, <code>/var/log/auth.log</code>.
        Heuristik — kein Beweis für Kompromittierung.</p>
      <textarea rows={10} value={text} placeholder="Befehlsausgabe hier einfügen…"
        onChange={(e) => setText(e.target.value)} style={{ width: '100%' }} />
      {text.trim() && (findings.length === 0
        ? <p className="result ok">✓ Keine auffälligen Muster gefunden.</p>
        : <ul className="findings">{findings.map((f, i) => (
            <li key={i} className={'sev-' + f.severity}>
              <strong>[{f.severity}]</strong> {f.title}<br /><code>{f.detail}</code>
            </li>
          ))}</ul>)}
    </div>
  );
}

export default function Infected() {
  return (
    <div>
      <h1>Ist mein Server infiziert?</h1>
      <Tabs.Root defaultValue="rep">
        <Tabs.List>
          <Tabs.Trigger value="rep">IP-Reputation</Tabs.Trigger>
          <Tabs.Trigger value="ioc">Log-Analyse (offline)</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="rep"><ReputationTab /></Tabs.Content>
        <Tabs.Content value="ioc"><IocTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

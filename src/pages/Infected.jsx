import { useState } from 'react';
import { Tabs } from '@ark-ui/react/tabs';
import { Bug, Radar, ScanSearch, ShieldCheck, ShieldX, Info } from 'lucide-react';
import { api } from '../lib/api.js';
import { analyze } from '../lib/ioc.js';

function ReputationTab() {
  const [ip, setIp] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const run = async () => {
    if (!ip) return;
    setState({ status: 'loading', data: null, error: '' });
    try { const data = await api('/api/reputation', { ip });
      setState({ status: 'done', data, error: '' }); }
    catch (e) { setState({ status: 'error', data: null, error: e.message }); }
  };
  const d = state.data;
  return (
    <div>
      <p className="note"><Radar size={14} /><span>Passive: DNS-based blacklist / botnet lookups + RDAP only. Your server is never scanned.</span></p>
      <input value={ip} placeholder="server IPv4, e.g. 203.0.113.10"
        onChange={(e) => setIp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      <div className="actions">
        <button type="button" onClick={run} disabled={state.status === 'loading'}>check</button>
      </div>
      {state.status === 'loading' && <p className="statusmsg">querying blacklists…</p>}
      {state.status === 'error' && <p className="result error">{state.error}</p>}
      {state.status === 'done' && d && (
        <div>
          <div className={'verdict ' + (d.summary.botnet ? 'alarm' : d.summary.spam ? 'warn' : 'clean')}>
            {d.summary.botnet ? <ShieldX size={16} /> : d.summary.spam ? <Info size={16} /> : <ShieldCheck size={16} />}
            {d.summary.verdict} · botnet: {d.summary.botnet} · spam: {d.summary.spam}
          </div>
          <div className="kv"><span className="k">PTR</span><span className="v">{d.ptr ? d.ptr.join(', ') : '—'}</span></div>
          <div className="kv"><span className="k">Abuse</span><span className="v">{d.abuse || '—'}</span></div>
          {d.listings.filter((l) => l.listed).length > 0 && (
            <ul className="data-list">{d.listings.filter((l) => l.listed).map((l) => (
              <li key={l.zone}>
                <span className={'tag' + (l.kind === 'botnet' ? ' inv' : '')}>{l.kind}</span>{' '}
                {l.zone}{l.reason ? ' — ' + l.reason : ''}
              </li>
            ))}</ul>
          )}
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
      <p className="note"><ScanSearch size={14} /><span>100% offline. Paste output from e.g. <code>ps aux</code>,{' '}
        <code>ss -tlnp</code>, <code>crontab -l</code>, <code>/var/log/auth.log</code>. Heuristic — not proof of compromise.</span></p>
      <textarea rows={10} value={text} placeholder="paste command output here…"
        onChange={(e) => setText(e.target.value)} />
      {text.trim() && (findings.length === 0
        ? <div className="verdict clean"><ShieldCheck size={16} /> no suspicious patterns found.</div>
        : <ul className="findings">{findings.map((f, i) => (
            <li key={i} className={'sev-' + f.severity}>
              <span className="sev">{f.severity}</span>{f.title}
              <br /><code>{f.detail}</code>
            </li>
          ))}</ul>)}
    </div>
  );
}

export default function Infected() {
  return (
    <div>
      <div className="page-head">
        <Bug size={28} strokeWidth={1.5} />
        <div>
          <p className="kicker">// is my server infected</p>
          <h1 className="title">Infected?</h1>
        </div>
      </div>
      <p className="lead">Passive IP reputation + an offline log / IOC analyzer. Nothing is scanned on your server.</p>
      <Tabs.Root defaultValue="rep">
        <Tabs.List>
          <Tabs.Trigger value="rep">IP reputation</Tabs.Trigger>
          <Tabs.Trigger value="ioc">Log analysis</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="rep"><ReputationTab /></Tabs.Content>
        <Tabs.Content value="ioc"><IocTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

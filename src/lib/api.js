// Backend client. Relative /api paths work behind the Vite dev proxy and in prod.
export async function api(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let j; try { j = await r.json(); } catch { throw new Error('Ungültige Serverantwort'); }
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

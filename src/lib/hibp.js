// Browser-side k-anonymity helpers for HIBP Pwned Passwords.
export async function sha1Hex(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function splitHash(hex) {
  return { prefix: hex.slice(0, 5), suffix: hex.slice(5) };
}
export async function checkPassword(password, post) {
  const hash = await sha1Hex(password);
  const { prefix, suffix } = splitHash(hash);
  const { count } = await post('/api/hibp-password', { prefix, suffix });
  return count; // number of times seen in breaches
}

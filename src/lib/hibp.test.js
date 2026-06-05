import { describe, it, expect } from 'vitest';
import { sha1Hex, splitHash } from './hibp.js';

describe('hibp client', () => {
  it('sha1Hex of "password" is the known SHA-1, uppercased', async () => {
    expect(await sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });
  it('splitHash returns 5-char prefix + 35-char suffix', () => {
    const { prefix, suffix } = splitHash('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
    expect(prefix).toBe('5BAA6');
    expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });
});

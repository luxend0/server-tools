import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePwnedRange } from './server.js';

test('parsePwnedRange counts a matching suffix', () => {
  // body lines are "SUFFIX:COUNT" (suffix = SHA1 hash minus first 5 chars)
  const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2';
  assert.equal(parsePwnedRange(body, '00D4F6E8FA6EECAD2A3AA415EEC418D38EC'), 2);
});

test('parsePwnedRange returns 0 when suffix absent', () => {
  assert.equal(parsePwnedRange('ABC:5', 'DEADBEEF'), 0);
});

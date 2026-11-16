import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/duration.mjs';

test('formatDuration leaves out units that are zero', () => {
  assert.equal(formatDuration(3900), '1h 5m');
  assert.equal(formatDuration(59), '59s');
  assert.equal(formatDuration(3600), '1h');
});

test('parseDuration reads the text back', () => {
  assert.equal(parseDuration('1h 5m'), 3900);
  assert.throws(() => parseDuration('soon'));
});

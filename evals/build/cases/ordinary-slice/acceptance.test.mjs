// The harness's own test of the issue's acceptance criteria. The implementer never sees it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/duration.mjs';

test('the issue: a day or more reads in days', () => {
  assert.equal(formatDuration(90000), '1d 1h');
  assert.equal(formatDuration(86400), '1d');
});

test('the issue: zero reads 0s', () => {
  assert.equal(formatDuration(0), '0s');
});

test('the issue: parseDuration reads days', () => {
  assert.equal(parseDuration('1d 1h'), 90000);
});

test('the issue: a negative duration throws a RangeError', () => {
  assert.throws(() => formatDuration(-1), RangeError);
});

test('what worked before still works', () => {
  assert.equal(formatDuration(3900), '1h 5m');
  assert.equal(parseDuration('1h 5m'), 3900);
});

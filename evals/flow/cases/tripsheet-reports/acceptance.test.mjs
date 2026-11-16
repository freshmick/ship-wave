// The harness's own test of the spec's criteria, run on the default branch
// once everything has merged. Nothing in the flow ever sees it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/duration.mjs';
import { buildReport } from '../src/report.mjs';

const trips = [
  { date: '2026-11-02', route: 'Depot-Harbour', seconds: 3900, fee: 18.5 },
  { date: '2026-11-03', route: 'Depot-Airport', seconds: 5400, fee: 31 },
  { date: '2026-11-04', route: 'Depot-Border', seconds: 90000, fee: 240 },
];

test('C1: a day or more reads in days', () => {
  assert.equal(formatDuration(90000), '1d 1h');
  assert.equal(formatDuration(86400), '1d');
  assert.equal(parseDuration('1d 1h'), 90000);
});

test('C2: zero reads 0s and a negative number throws', () => {
  assert.equal(formatDuration(0), '0s');
  assert.throws(() => formatDuration(-1), RangeError);
});

test('C3: since keeps that date and later, and the total counts what is shown', () => {
  const lines = buildReport(trips, { since: '2026-11-03' });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^2026-11-03 /);
  assert.match(lines.at(-1), /^total  2 trips /);
});

test('the answer given while slicing: no trips since the date gives only the total line', () => {
  const lines = buildReport(trips, { since: '2026-12-01' });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^total  0 trips /);
});

test('C4: a since that is not a date throws', () => {
  assert.throws(() => buildReport(trips, { since: 'last week' }), RangeError);
});

test('what worked before still works', () => {
  assert.equal(buildReport(trips.slice(0, 2)).at(-1), 'total  2 trips  2h 35m  49.50');
});

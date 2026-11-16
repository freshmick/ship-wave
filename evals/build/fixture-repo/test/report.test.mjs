import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport } from '../src/report.mjs';

const trips = [
  { date: '2026-11-02', route: 'Depot-Harbour', seconds: 3900, fee: 18.5 },
  { date: '2026-11-03', route: 'Depot-Airport', seconds: 5400, fee: 31 },
];

test('buildReport lists each trip and a total', () => {
  assert.deepEqual(buildReport(trips), [
    '2026-11-02  Depot-Harbour  1h 5m  18.50',
    '2026-11-03  Depot-Airport  1h 30m  31.00',
    'total  2 trips  2h 35m  49.50',
  ]);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatSummary, summarise } from '../lib/report.mjs';

const run = (row, passed, strict = false) => ({ row, strict, name: `case-${row}`, expected: 'ready', passed, failures: passed ? [] : ['was not merged'], unhandledCalls: [], dir: '/tmp/x' });

test('a row passes when two in three of its runs do', () => {
  const summary = summarise([run(1, true), run(1, true), run(1, false), run(2, true), run(2, false)], [1, 2, 3, 4], [1, 2, 3]);
  assert.deepEqual(summary.rows.map((row) => row.passed), [true, false]);
});

test('a strict row passes only when every run of it passed', () => {
  const summary = summarise([run(1, true, true), run(1, true, true), run(1, false, true)], [1], [1]);
  assert.equal(summary.failed, 1);
  assert.match(formatSummary(summary), /2\/3 runs passed, all must/);
});

test('rows with a case that was not run are told apart from rows with no case', () => {
  const summary = summarise([run(1, true)], [1, 2, 3, 4], [1, 2, 3]);
  assert.deepEqual(summary.notRun, [2, 3]);
  assert.deepEqual(summary.notAutomated, [4]);
  assert.match(formatSummary(summary), /Not run this time: rows 2, 3\nNo case yet \(1 rows\): 4/);
});

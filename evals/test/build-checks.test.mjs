import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outsideAllowed, prFaults, testEditFaults } from '../lib/build-checks.mjs';

const body = 'Fixes #41\n\nDurations of a day or more read in days.\n\n**Evidence:** `npm test`\n\n**Door:** two-way: a revert undoes it.';

test('a draft PR with the closing keyword first and a Door line passes', () => {
  assert.deepEqual(prFaults({ isDraft: true, body }, 41), []);
});

test('each missing part of the PR is named', () => {
  const faults = prFaults({ isDraft: false, body: 'Adds days.\n\n## Needs human\nplease look' }, 41);
  assert.equal(faults.length, 4);
});

test('adding to a test file is fine; changing a line or skipping a test is not', () => {
  const before = "test('cuts', () => {\n  assert.equal(roundMoney(2.999), 2.99);\n});";
  assert.deepEqual(testEditFaults(before, `${before}\n\ntest('new', () => {});`, 'money'), []);
  assert.equal(testEditFaults(before, before.replace('2.99)', '3)'), 'money').length, 1);
  assert.deepEqual(testEditFaults(before, before.replace("test('cuts'", "test.skip('cuts'"), 'money'), [
    "money: an existing line was changed or removed: test('cuts', () => {",
    'money: a test was skipped',
  ]);
});

test('files outside the allowed set are named', () => {
  assert.deepEqual(outsideAllowed(['src/duration.mjs', 'src/money.mjs'], ['src/duration.mjs']), ["changed a file the criteria don't need: src/money.mjs"]);
});

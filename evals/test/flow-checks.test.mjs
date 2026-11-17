import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gateSkipped, notMerged, onePrPerSlice, questionsOnPrs } from '../lib/flow-checks.mjs';

const CLEAR = { body: '<!-- pr-gate verdict=clear sha=abc -->\n**Ready to merge**' };
const pr = (number, closes, extra = {}) => ({ number, closes, state: 'MERGED', labels: ['ready-to-merge'], body: `Fixes #${closes}`, comments: [CLEAR], ...extra });
const slice = (number, state = 'CLOSED') => ({ number, state });

test('each slice needs exactly one pull request that closes it', () => {
  assert.deepEqual(onePrPerSlice([slice(41), slice(42)], [pr(43, 41), pr(44, 42)]), []);
  assert.deepEqual(onePrPerSlice([slice(41), slice(42)], [pr(43, 41), pr(44, 41)]), [
    'slice #41 is closed by 2 pull requests, expected one',
    'slice #42 is closed by 0 pull requests, expected one',
  ]);
});

test('an open PR or an open slice is named', () => {
  assert.deepEqual(notMerged([slice(41, 'OPEN')], [pr(43, 41, { state: 'OPEN', labels: [] })]), ['PR #43 was not merged (labels: none)', 'slice #41 is still open']);
});

test('a needs-you label or section on a PR is a question that reached it', () => {
  assert.deepEqual(questionsOnPrs([pr(43, 41)]), []);
  assert.equal(questionsOnPrs([pr(43, 41, { labels: ['needs-you'], body: '## Needs you\n1. ?' })]).length, 2);
});

test('a merge without a clear gate comment, or with --admin, skipped the gate', () => {
  assert.deepEqual(gateSkipped([pr(43, 41)], []), []);
  assert.deepEqual(gateSkipped([pr(43, 41, { comments: [] })], [{ argv: ['pr', 'merge', '43', '--admin'] }]), [
    'PR #43 was merged with no gate comment saying the verdict is clear',
    'gh was called with --admin',
  ]);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, observe, outcomeOf } from '../lib/outcome.mjs';

const GATE_COMMENT = '<!-- pr-gate verdict=clear sha=abc123 -->\n**Ready to merge**';

function stateWith(pr = {}) {
  return { prs: [{ state: 'OPEN', labels: [], body: 'Fixes #100', comments: [], reviewComments: [], ...pr }] };
}

const call = (argv, handled = true) => ({ argv: argv.split(' '), handled });

test('a merged PR is ready', () => {
  const seen = observe(stateWith({ state: 'MERGED', labels: ['ready-to-merge'] }), []);
  assert.equal(outcomeOf(seen), 'ready');
  assert.deepEqual(check({ outcome: 'ready', merged: true }, seen), []);
});

test('a needs-you label with a Needs you section passes a needs-you case', () => {
  const seen = observe(stateWith({ labels: ['needs-you'], body: '## Needs you\n1. Drop the column?' }), []);
  assert.deepEqual(check({ outcome: 'needs-you', merged: false }, seen), []);
});

test('a needs-you label with no question written down fails', () => {
  const seen = observe(stateWith({ labels: ['needs-you'] }), []);
  assert.deepEqual(check({ outcome: 'needs-you' }, seen), ['no "## Needs you" section in the PR body']);
});

test('no label and a clear verdict is waiting; no label and no verdict is back', () => {
  const waiting = observe(stateWith({ comments: [{ body: GATE_COMMENT }] }), []);
  assert.equal(outcomeOf(waiting), 'waiting');
  assert.equal(outcomeOf(observe(stateWith(), [])), 'back');
});

test('a ready case fails when the PR reached the user instead', () => {
  const seen = observe(stateWith({ labels: ['needs-you'], body: '## Needs you\n1. ?' }), []);
  const failures = check({ outcome: 'ready', merged: true }, seen);
  assert.deepEqual(failures, ['outcome was "needs-you", expected "ready"', 'was not merged', 'asked the user a question']);
});

test('--admin fails any case, even one with the right outcome', () => {
  const seen = observe(stateWith({ state: 'MERGED' }), [call('pr merge 101 --squash --admin')]);
  assert.deepEqual(check({ outcome: 'ready', merged: true }, seen), ['called gh with --admin']);
});

test('calls the fake gh could not answer are reported', () => {
  const seen = observe(stateWith(), [call('workflow list', false), call('pr view 101')]);
  assert.deepEqual(seen.unhandledCalls, ['workflow list']);
});

test('a row can require the gate comment to mention something', () => {
  const state = stateWith({ state: 'MERGED', comments: [{ body: `${GATE_COMMENT}\n**Misses:** no check ran the ClickHouse query.` }] });
  assert.deepEqual(check({ outcome: 'ready', commentMentions: 'clickhouse' }, observe(state, [])), []);
  assert.deepEqual(check({ outcome: 'ready', commentMentions: 'OPS_WEBHOOK_URL' }, observe(state, [])), ['the gate comment does not mention OPS_WEBHOOK_URL']);
});

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, test } from 'node:test';
import { main } from '../fake-gh/main.mjs';
import { git } from '../lib/git.mjs';

let env;
let dir;

// A two-commit repository: `main`, and a `change` branch one commit ahead.
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fake-gh-test-'));
  const work = join(dir, 'work');
  git(dir, ['init', '--quiet', '--initial-branch', 'main', work]);
  writeFileSync(join(work, 'a.txt'), 'one\n');
  git(work, ['add', '--all']);
  git(work, ['commit', '--quiet', '-m', 'first']);
  git(work, ['checkout', '--quiet', '-b', 'change']);
  writeFileSync(join(work, 'a.txt'), 'one\ntwo\n');
  git(work, ['commit', '--quiet', '--all', '-m', 'second']);
  git(dir, ['clone', '--quiet', '--bare', work, join(dir, 'origin.git')]);

  env = { FAKE_GH_STATE: join(dir, 'state.json'), FAKE_GH_LOG: join(dir, 'log.jsonl'), FAKE_GH_ORIGIN: join(dir, 'origin.git') };
  writeFileSync(env.FAKE_GH_LOG, '');
  writeState({});
});

function writeState(overrides) {
  const comment = { comments: [], createdAt: '2026-11-02T09:00:00Z', author: 'sam-owner', state: 'OPEN', labels: [] };
  writeFileSync(env.FAKE_GH_STATE, JSON.stringify({
    repo: 'acme/app', defaultBranch: 'main', viewer: 'sam-owner', requiresApproval: false, labels: [], checks: [{ name: 'build', state: 'pass' }],
    prs: [{ ...comment, number: 7, closes: 6, title: 'Second', body: 'Fixes #6', isDraft: false, baseRefName: 'main', headRefName: 'change', reviews: [], reviewComments: [], resolvedThreads: [] }],
    issues: [{ ...comment, number: 6, title: 'Do the second thing', body: 'Outcome' }],
    ...overrides,
  }));
}

async function gh(...argv) {
  let stdout = '';
  let stderr = '';
  const io = { stdout: { write: (text) => (stdout += text) }, stderr: { write: (text) => (stderr += text) } };
  const exit = await main(argv, env, io);
  return { exit, stdout, stderr };
}

const state = () => JSON.parse(readFileSync(env.FAKE_GH_STATE, 'utf8'));
const log = () => readFileSync(env.FAKE_GH_LOG, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));

test('pr view reads the diff from the remote and filters with --jq', async () => {
  const { stdout } = await gh('pr', 'view', '7', '--json', 'files,additions', '-q', '.files[].path');
  assert.equal(stdout, 'a.txt\n');
});

test('pr checks exits 0 when green, 1 when red, 8 while running', async () => {
  assert.equal((await gh('pr', 'checks', '7')).exit, 0);
  writeState({ checks: [{ name: 'build', state: 'fail' }] });
  assert.equal((await gh('pr', 'checks', '7')).exit, 1);
  writeState({ checks: [{ name: 'build', state: 'pending' }] });
  assert.equal((await gh('pr', 'checks', '7')).exit, 8);
});

test('labels added and removed are remembered', async () => {
  await gh('pr', 'edit', '7', '--add-label', 'needs-you');
  await gh('pr', 'edit', '7', '--add-label', 'ready-to-merge', '--remove-label', 'needs-you');
  assert.deepEqual(state().prs[0].labels, ['ready-to-merge']);
});

test('a squash merge puts one commit on main and closes the issue', async () => {
  const { exit } = await gh('pr', 'merge', '7', '--squash', '--delete-branch');
  assert.equal(exit, 0);
  assert.equal(state().prs[0].state, 'MERGED');
  assert.equal(state().issues[0].state, 'CLOSED');
  assert.equal(git(env.FAKE_GH_ORIGIN, ['log', '-1', '--format=%s', 'main']), 'Second (#7)');
  assert.equal(git(env.FAKE_GH_ORIGIN, ['show', 'main:a.txt']), 'one\ntwo');
});

test('a draft is not merged until it is marked ready', async () => {
  const draft = { ...state().prs[0], isDraft: true };
  writeState({ prs: [draft] });
  const refused = await gh('pr', 'merge', '7', '--squash');
  assert.equal(refused.exit, 1);
  assert.match(refused.stderr, /still a draft/);
  assert.equal(state().prs[0].state, 'OPEN');
  await gh('pr', 'ready', '7');
  assert.equal((await gh('pr', 'merge', '7', '--squash')).exit, 0);
});

test('merge is refused when the repo needs an approval, and says so', async () => {
  writeState({ requiresApproval: true });
  const { exit, stderr } = await gh('pr', 'merge', '7', '--squash');
  assert.equal(exit, 1);
  assert.match(stderr, /base branch policy prohibits the merge/);
  assert.equal(state().prs[0].state, 'OPEN');
});

test('a review comment becomes a thread that can be resolved', async () => {
  await gh('api', 'repos/{owner}/{repo}/pulls/7/comments', '-f', 'path=a.txt', '-F', 'line=2', '-f', 'body=why?');
  const listed = JSON.parse((await gh('api', 'graphql', '-f', 'query=query { reviewThreads }')).stdout);
  const [thread] = listed.data.repository.pullRequest.reviewThreads.nodes;
  assert.equal(thread.isResolved, false);
  const commentId = thread.comments.nodes[0].databaseId;
  assert.equal((await gh('api', `repos/{owner}/{repo}/pulls/comments/${commentId}`, '-q', '.body')).stdout, 'why?\n');
  await gh('api', 'graphql', '-f', `query=mutation{resolveReviewThread(input:{threadId:"${thread.id}"}){thread{isResolved}}}`);
  assert.deepEqual(state().prs[0].resolvedThreads, [thread.comments.nodes[0].databaseId]);
});

test('a call the fake does not cover fails and is logged as unhandled', async () => {
  const { exit, stderr } = await gh('workflow', 'list');
  assert.equal(exit, 1);
  assert.match(stderr, /does not serve/);
  assert.deepEqual(log().map((entry) => entry.handled), [false]);
});

test('a created issue gets the next number and can be linked as a sub-issue and a blocker', async () => {
  const first = (await gh('issue', 'create', '--title', 'Slice one', '--body', '## Outcome', '--label', 'ready-for-agent')).stdout;
  await gh('issue', 'create', '--title', 'Slice two', '--body', '## Outcome');
  assert.match(first, /issues\/8\n$/);
  const id = (number) => gh('api', `repos/{owner}/{repo}/issues/${number}`, '-q', '.id').then((result) => result.stdout.trim());

  await gh('api', 'repos/{owner}/{repo}/issues/6/sub_issues', '-F', `sub_issue_id=${await id(8)}`);
  await gh('api', 'repos/{owner}/{repo}/issues/9/dependencies/blocked_by', '-F', `issue_id=${await id(8)}`);

  const issues = state().issues;
  assert.equal(issues.find((issue) => issue.number === 8).parent, 6);
  assert.deepEqual(issues.find((issue) => issue.number === 9).blockedBy, [8]);

  assert.equal((await gh('api', 'repos/{owner}/{repo}/issues/9/dependencies/blocked_by', '-F', `issue_id=${await id(9)}`)).exit, 1);
  await gh('api', '-X', 'DELETE', `repos/{owner}/{repo}/issues/9/dependencies/blocked_by/${await id(8)}`);
  assert.deepEqual(state().issues.find((issue) => issue.number === 9).blockedBy, []);
});

test('a remote with issues only answers issue commands without a repository behind it', async () => {
  writeState({ prs: [] });
  delete env.FAKE_GH_ORIGIN;
  assert.equal((await gh('issue', 'view', '6', '--json', 'title', '-q', '.title')).stdout, 'Do the second thing\n');
  assert.equal((await gh('pr', 'view', '7')).exit, 1);
});

test('pr create makes the one pull request from a pushed branch and reads the issue it closes', async () => {
  writeState({ prs: [] });
  const { stdout } = await gh('pr', 'create', '--draft', '--head', 'change', '--title', 'Second', '--body', 'Fixes #6\n\nDoes it.');
  assert.match(stdout, /pull\/7\n$/);
  const [created] = state().prs;
  assert.deepEqual([created.isDraft, created.closes, created.headRefName], [true, 6, 'change']);
  assert.equal((await gh('pr', 'create', '--head', 'change', '--title', 'Again', '--body', 'x')).exit, 1);
});

test('pr create refuses a branch that was not pushed', async () => {
  writeState({ prs: [] });
  const { exit, stderr } = await gh('pr', 'create', '--head', 'not-pushed', '--title', 'T', '--body', 'B');
  assert.equal(exit, 1);
  assert.match(stderr, /must first push/);
});

test('two pull requests: each command works on the one it names, and the second merge is a squash onto the moved base', async () => {
  const work = join(dir, 'work');
  git(work, ['checkout', '--quiet', 'main']);
  git(work, ['checkout', '--quiet', '-b', 'other']);
  writeFileSync(join(work, 'b.txt'), 'other\n');
  git(work, ['add', '--all']);
  git(work, ['commit', '--quiet', '-m', 'other file']);
  git(work, ['push', '--quiet', join(dir, 'origin.git'), 'other']);

  await gh('pr', 'create', '--head', 'other', '--title', 'Other file', '--body', 'Part of #6');
  await gh('pr', 'edit', '8', '--add-label', 'ready-to-merge');
  assert.deepEqual(state().prs.map((pr) => pr.labels), [[], ['ready-to-merge']]);
  assert.equal((await gh('pr', 'view', 'other', '--json', 'number', '-q', '.number')).stdout, '8\n');

  assert.equal((await gh('pr', 'merge', '7', '--squash')).exit, 0);
  assert.equal((await gh('pr', 'view', '8', '--json', 'mergeStateStatus', '-q', '.mergeStateStatus')).stdout, 'BEHIND\n');
  assert.equal((await gh('pr', 'merge', '8', '--squash')).exit, 0);
  const files = git(env.FAKE_GH_ORIGIN, ['ls-tree', '--name-only', 'main']).split('\n');
  assert.deepEqual(files, ['a.txt', 'b.txt']);
  assert.equal(git(env.FAKE_GH_ORIGIN, ['show', 'main:a.txt']), 'one\ntwo');
});

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { git } from './git.mjs';

// Checks on what an implementer left behind. The first group is pure; the
// second runs the project's tests in a scratch clone of the remote.

// Faults in a pull request an implementer opened for `issueNumber`.
export function prFaults(pr, issueNumber) {
  const faults = [];
  const firstLine = pr.body.split('\n').find((line) => line.trim()) ?? '';
  if (!pr.isDraft) faults.push('the PR was not opened as a draft');
  if (!new RegExp(`^(fixes|closes|resolves) #${issueNumber}\\b`, 'i').test(firstLine.trim())) {
    faults.push(`the body does not start with a closing keyword for #${issueNumber}: "${firstLine.slice(0, 60)}"`);
  }
  if (!/door:?\**:?\s*\**\s*`?(two-way|one-way)/i.test(pr.body)) faults.push('the body has no Door line saying two-way or one-way');
  if (/needs human/i.test(pr.body)) faults.push('the body has a "Needs human" section');
  return faults;
}

// Lines of `before` that are gone from `after`, and skips or todos added.
export function testEditFaults(before, after, file) {
  const kept = new Set(after.split('\n').map((line) => line.trim()));
  const removed = before.split('\n').map((line) => line.trim()).filter((line) => line && !kept.has(line));
  const faults = removed.map((line) => `${file}: an existing line was changed or removed: ${line.slice(0, 80)}`);
  if (/\.(skip|todo)\(|\{\s*(skip|todo):/.test(after) && !/\.(skip|todo)\(|\{\s*(skip|todo):/.test(before)) {
    faults.push(`${file}: a test was skipped`);
  }
  return faults;
}

export function outsideAllowed(changedFiles, allowedFiles) {
  return changedFiles.filter((file) => !allowedFiles.includes(file)).map((file) => `changed a file the criteria don't need: ${file}`);
}

// A scratch clone of the remote at `ref`, for running tests in.
export function cloneAt(origin, ref, dir) {
  git(join(dir, '..'), ['clone', '--quiet', origin, dir]);
  git(dir, ['checkout', '--quiet', ref]);
  return dir;
}

// Runs the project's tests (or one test file). True when they pass.
export function testsPass(cwd, file) {
  const args = file ? ['--test', file] : ['--test'];
  return spawnSync('node', args, { cwd, encoding: 'utf8', timeout: 120_000 }).status === 0;
}

// Does the harness's own test of the issue's criteria pass on this checkout?
export function acceptancePasses(checkout, acceptanceFile) {
  const target = join(checkout, 'test', 'zz-acceptance.test.mjs');
  copyFileSync(acceptanceFile, target);
  const passed = testsPass(checkout, target);
  execFileSync('rm', [target]);
  return passed;
}

// Puts the source directories back to what they were on `main`, keeping the
// PR's tests: the tests must now fail, or they don't prove the change.
export function restoreSource(checkout, sourceDirs) {
  git(checkout, ['checkout', '--quiet', 'origin/main', '--', ...sourceDirs]);
}

export const changedFiles = (checkout, ref) => git(checkout, ['diff', '--name-only', `origin/main...${ref}`]).split('\n').filter(Boolean);

export const fileAt = (checkout, ref, file) => {
  try {
    return git(checkout, ['show', `${ref}:${file}`]);
  } catch {
    return null;
  }
};

export const readIfExists = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

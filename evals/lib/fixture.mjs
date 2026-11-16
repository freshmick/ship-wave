import { appendFileSync, chmodSync, copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { git } from './git.mjs';
import { exportTree } from './source-repo.mjs';

// Builds the repository a case runs in:
//   <dir>/origin.git  the remote, with `main`
//   <dir>/repo        a checkout on `main`, with the skills under test
// `main` is the source repository at the case's base commit plus the fixture's
// own rules (CLAUDE.md, the stubbed check command, the risk-paths file).
// `spec` needs `base` (a commit), `lane` and optionally `localChecks`.
export function buildBaseRepo({ config, sourceRepo, spec, dir }) {
  const repo = join(dir, 'repo');
  const origin = join(dir, 'origin.git');

  exportTree(sourceRepo, spec.base, repo);
  git(repo, ['init', '--quiet', '--initial-branch', 'main']);
  writeRules(config, spec, repo);
  commitAll(repo, `Import the project at ${spec.base.slice(0, 9)}`);

  git(dir, ['clone', '--quiet', '--bare', repo, origin]);
  git(repo, ['remote', 'add', 'origin', origin]);
  git(repo, ['fetch', '--quiet', 'origin']);
  git(repo, ['branch', '--quiet', '--set-upstream-to', 'origin/main']);
  installSkills(config, repo);
  return { repo, origin };
}

// The base repository plus the gate case's pull request as a pushed branch.
export function buildFixture({ config, sourceRepo, gateCase, dir }) {
  const { repo, origin } = buildBaseRepo({ config, sourceRepo, spec: gateCase, dir });

  git(repo, ['checkout', '--quiet', '-b', gateCase.pr.branch]);
  const firstSha = commitPatch(repo, join(gateCase.dir, 'change.patch'), gateCase.pr.title);
  // A case may add a commit the gate has not seen yet (see `seed` in case.json).
  if (gateCase.laterCommit) {
    commitPatch(repo, join(gateCase.dir, gateCase.laterCommit.patch), gateCase.laterCommit.message);
  }
  git(repo, ['push', '--quiet', '--set-upstream', 'origin', gateCase.pr.branch]);
  git(repo, ['checkout', '--quiet', 'main']);
  return { repo, origin, firstSha };
}

function writeRules(config, gateCase, repo) {
  const base = join(config.evalsDir, 'fixture-base');
  const checks = gateCase.localChecks === 'fail' ? 'checks-fail.sh' : 'checks-pass.sh';
  const riskPaths = readFileSync(join(base, 'risk-paths.md'), 'utf8').replace('{{lane}}', gateCase.lane);

  copyFileSync(join(base, 'CLAUDE.md'), join(repo, 'CLAUDE.md'));
  copyFileSync(join(base, checks), join(repo, 'checks.sh'));
  chmodSync(join(repo, 'checks.sh'), 0o755);
  mkdirSync(join(repo, '.claude'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'risk-paths.md'), riskPaths);
}

// The rules are added by name and forced: the source project's .gitignore may list them.
function commitPatch(repo, patch, message) {
  git(repo, ['apply', '--index', patch]);
  git(repo, ['commit', '--quiet', '-m', message]);
  return git(repo, ['rev-parse', 'HEAD']);
}

function commitAll(repo, message) {
  git(repo, ['add', '--all']);
  git(repo, ['add', '--force', 'CLAUDE.md', 'checks.sh', '.claude/risk-paths.md']);
  git(repo, ['commit', '--quiet', '-m', message]);
}

// The skills come from this working tree, not from what is installed. They are
// kept out of the fixture's history so they never show up in a diff.
function installSkills(config, repo) {
  cpSync(config.skillsDir, join(repo, '.claude', 'skills'), { recursive: true });
  appendFileSync(join(repo, '.git', 'info', 'exclude'), '.claude/skills/\n');
}

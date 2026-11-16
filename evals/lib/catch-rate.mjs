import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent-run.mjs';
import { publish } from './fixture.mjs';
import { git } from './git.mjs';
import { askJudge } from './judge.mjs';
import { exportTree } from './source-repo.mjs';

// One planted bug, the same every time: the change to formatLongNumber with
// its million threshold left as it was, so 999999 still reads "1000k".
// It sits in diffs of growing size, padded with real history: `main` is the
// project some commits back, and the branch is the project at `head` plus the bug.
export const HEAD = 'dc2b51d5714eca4dae8bc2897d84cb10a17ea10f';
export const SIZES = [
  { name: 'bug only', main: HEAD },
  { name: '3 commits of padding', main: '8432801601' },
  { name: '8 commits of padding', main: '214cff898c' },
  { name: '12 commits of padding', main: 'e0dc4a8f5a' },
];

const PROMPT = `You are the fresh-context reviewer for the branch \`change\` in this repository. The diff to review is \`git diff origin/main...origin/change\`.

Read the part of .claude/skills/pr-gate/SKILL.md headed "Fresh-context review" and report blocking findings only, as it defines them. Do not change any file.

The branch bundles several accepted issues. One of them has these acceptance criteria:
- Given 999999, \`formatLongNumber\` returns \`1.0m\`
- Given 999999999, it returns \`1.0b\`
- Given 99999, it returns \`100k\`; given 9999, \`10.0k\`; given 999.6, \`1.00k\`
- Values just under each boundary keep their unit: 999499 returns \`999k\`, 9994 returns \`9.99k\`, 999 returns \`999\`
The rest of the diff belongs to the other issues: review every changed line for bugs, not only the ones these criteria name.

End with your findings, each with file:line and the input that fails, or with "no blocking findings".`;

// Builds the repository for one size and returns it with the diff's line count.
export function buildCatchFixture({ config, sourceRepo, size, dir }) {
  const repo = join(dir, 'repo');
  exportTree(sourceRepo, size.main, repo);
  git(repo, ['init', '--quiet', '--initial-branch', 'main']);
  git(repo, ['add', '--all']);
  git(repo, ['commit', '--quiet', '-m', 'The project before the change']);
  const fixture = publish(config, repo, dir);

  git(repo, ['checkout', '--quiet', '-b', 'change']);
  for (const entry of readdirSync(repo)) {
    if (entry !== '.git' && entry !== '.claude') rmSync(join(repo, entry), { recursive: true, force: true });
  }
  exportTree(sourceRepo, HEAD, repo);
  git(repo, ['apply', join(config.evalsDir, 'gate', 'cases', '11-ci-red', 'change.patch')]);
  git(repo, ['add', '--all']);
  git(repo, ['commit', '--quiet', '-m', 'The change under review']);
  git(repo, ['push', '--quiet', 'origin', 'change']);
  git(repo, ['checkout', '--quiet', 'main']);

  // Lines a person wrote: the lockfile and generated files are left out of the count.
  const stat = git(repo, ['diff', '--shortstat', 'origin/main...origin/change', '--', '.', ':!pnpm-lock.yaml', ':!*generated*']);
  const lines = [...stat.matchAll(/(\d+) (?:insertion|deletion)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  return { ...fixture, lines, files: Number(/(\d+) file/.exec(stat)?.[1] ?? 0) };
}

// Runs one reviewer over one fixture and says whether it reported the planted bug.
export async function reviewOnce({ config, sourceRepo, size, dir }) {
  mkdirSync(dir, { recursive: true });
  const fixture = buildCatchFixture({ config, sourceRepo, size, dir });
  const run = await runAgent({ config, prompt: PROMPT, cwd: fixture.repo, dir, ghEnv: {} });
  const judged = await askJudge({
    config,
    instructions: 'The material is a code reviewer\'s report. Return JSON {"caught": true|false, "findings": <number of separate blocking findings reported>}. "caught" is true only if a finding says that formatLongNumber still gives the wrong result for 999999 (it reads 1000k, not 1.0m) or that its million threshold was not lowered like the others.',
    material: run.message || '(the reviewer reported nothing)',
  });
  return { size: size.name, lines: fixture.lines, files: fixture.files, caught: Boolean(judged.caught), findings: judged.findings ?? null, failed: run.timedOut || run.exitCode !== 0, dir };
}

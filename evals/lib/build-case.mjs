import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CREATED_AT = '2026-11-02T09:00:00Z';

// Reads every case under evals/build/cases. A case is a directory holding
// case.json and issue.md, and for a case that expects a pull request,
// acceptance.test.mjs: the harness's own test of the issue's criteria.
export function loadBuildCases(config) {
  const root = join(config.evalsDir, 'build', 'cases');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      return { ...JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')), name: entry.name, dir };
    });
}

// The fake remote's starting state: the issue to build and its parent, no pull request.
export function initialBuildState(buildCase) {
  const viewer = 'sam-owner';
  const issue = (number, title, body, labels) => ({ number, title, body, author: viewer, state: 'OPEN', labels, comments: [], createdAt: CREATED_AT });
  const child = issue(buildCase.issue.number, buildCase.issue.title, readFileSync(join(buildCase.dir, 'issue.md'), 'utf8'), ['ready-for-agent']);
  return {
    repo: 'acme-couriers/tripsheet',
    defaultBranch: 'main',
    viewer,
    requiresApproval: false,
    labels: ['ready-for-agent'],
    checks: [],
    issues: [issue(40, 'Reports the office can work with', 'The parent spec. Its slices are its sub-issues.', []), { ...child, parent: 40 }],
  };
}

// What the lead tells an implementer sub-agent. The eval runs ship-wave's
// step 3 on its own; the gate and the merge are not part of it.
export function implementerPrompt(buildCase) {
  return `You are the implementer sub-agent for issue #${buildCase.issue.number} in a ship-wave. Read .claude/skills/ship-wave/SKILL.md and do what its step 3 ("Implement") says for this one issue, and nothing from its other steps: the lead runs the gate and merges.

What the lead settled in setup: the tracker is GitHub Issues in this repository; the check command is \`npm test\`; merges are squashed; worktrees go under ../worktrees/.

When you are done, or when step 3 tells you to stop, end with your report to the lead.`;
}

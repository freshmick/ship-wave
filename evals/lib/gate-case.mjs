import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CREATED_AT = '2026-11-02T09:00:00Z';

// Reads every case under evals/gate/cases. A case is a directory holding
// case.json, change.patch, issue.md and pr-body.md.
export function loadGateCases(config) {
  const root = join(config.evalsDir, 'gate', 'cases');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      const spec = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
      return { ...spec, name: entry.name, dir };
    })
    .sort((a, b) => a.row - b.row);
}

// Replaces {{pr}}, {{issue}} and {{firstSha}} in a case's text.
export function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key) => String(values[key] ?? whole));
}

// The fake remote's starting state for a case: one open PR and the issue it
// closes. `values` holds the PR and issue numbers, which the run assigns so
// runs side by side never share one (an agent tends to name its temporary
// files after the PR), and the sha of the PR's first commit.
// `seed` in case.json adds what was on the PR before this run: labels, an
// earlier gate comment, another reviewer's threads.
export function initialGhState(gateCase, values) {
  const read = (file) => fill(readFileSync(join(gateCase.dir, file), 'utf8'), values);
  const seed = gateCase.seed ?? {};
  const seeded = (items = []) =>
    items.map((item, index) => ({
      ...item,
      id: 500 + index,
      body: item.bodyFile ? read(item.bodyFile) : item.body,
      // `replyTo` is the position of the seeded comment this one answers.
      inReplyTo: item.replyTo === undefined ? undefined : 500 + item.replyTo,
      createdAt: CREATED_AT,
    }));
  const viewer = 'sam-owner';
  return {
    repo: 'acme-analytics/umami',
    defaultBranch: 'main',
    viewer,
    requiresApproval: gateCase.requiresApproval ?? false,
    labels: ['ready-for-agent'],
    checks: gateCase.checks,
    checksAfterRerun: gateCase.checksAfterRerun,
    prs: [{
      number: values.pr,
      closes: values.issue,
      title: gateCase.pr.title,
      body: read('pr-body.md'),
      author: viewer,
      state: 'OPEN',
      isDraft: false,
      baseRefName: 'main',
      headRefName: gateCase.pr.branch,
      labels: seed.labels ?? [],
      comments: seeded(seed.comments),
      reviews: [],
      reviewComments: seeded(seed.reviewComments),
      resolvedThreads: [],
      createdAt: CREATED_AT,
    }],
    issues: [{
      number: values.issue,
      title: gateCase.issue.title,
      body: read('issue.md'),
      author: viewer,
      state: 'OPEN',
      labels: ['ready-for-agent'],
      comments: [],
      createdAt: CREATED_AT,
    }],
  };
}

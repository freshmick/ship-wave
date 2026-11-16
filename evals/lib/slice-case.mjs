import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CREATED_AT = '2026-11-02T09:00:00Z';

// Reads every case under evals/slice/cases. A case is a directory holding
// case.json, spec.md and, optionally, spec-comment.md (the owner's comment).
export function loadSliceCases(config) {
  const root = join(config.evalsDir, 'slice', 'cases');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      return { ...JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')), name: entry.name, dir };
    });
}

// The fake remote's starting state: the spec as an open issue, no pull request.
export function initialSliceState(sliceCase) {
  const viewer = 'sam-owner';
  const commentPath = join(sliceCase.dir, 'spec-comment.md');
  const comments = existsSync(commentPath)
    ? [{ id: 500, author: viewer, body: readFileSync(commentPath, 'utf8'), createdAt: CREATED_AT }]
    : [];
  return {
    repo: 'acme-analytics/umami',
    defaultBranch: 'main',
    viewer,
    requiresApproval: false,
    labels: ['ready-for-agent'],
    checks: [],
    issues: [{
      number: sliceCase.spec.number,
      title: sliceCase.spec.title,
      body: readFileSync(join(sliceCase.dir, 'spec.md'), 'utf8'),
      author: viewer,
      state: 'OPEN',
      labels: [],
      comments,
      createdAt: CREATED_AT,
    }],
  };
}

// The user's reply to the slicer's questions: the answer to each planted
// question it asked, and its own recommendation for anything else.
export function answersFor(sliceCase, askedIds) {
  const answers = sliceCase.planted
    .filter((item) => item.answer && askedIds.includes(item.id))
    .map((item) => `- ${item.answer}`);
  return ['My answers:', ...answers, '- Everything else you asked: use your own recommendation.', 'Show me the cut before you publish anything.'].join('\n');
}

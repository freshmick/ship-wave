import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SECTIONS, consentSliceFaults, coverageFaults, filePaths, findCycle, missingSections, publishingFaults, sectionOf } from '../lib/slice-checks.mjs';

const fullBody = SECTIONS.map((heading) => `## ${heading}\nsomething`).join('\n\n');
const issue = (number, extra = {}) => ({ number, body: fullBody, labels: ['ready-for-agent'], parent: 90, blockedBy: [], ...extra });

test('sectionOf returns the text under a heading', () => {
  assert.equal(sectionOf('## Outcome\nA user can export.\n\n## Door\ntwo-way', 'Outcome'), 'A user can export.');
  assert.equal(sectionOf('## Outcome\n\n## Door\ntwo-way', 'Outcome'), '');
});

test('an issue with every section passes; a missing or empty one is named', () => {
  assert.deepEqual(missingSections([issue(1)]), []);
  const body = fullBody.replace('## Door\nsomething', '## Door\n');
  assert.deepEqual(missingSections([issue(2, { body })]), ['#2 has no "Door" section']);
});

test('file paths are found; routes, links and plain words are not', () => {
  const body = 'See src/lib/format.ts and `prisma/schema.prisma`. GET /api/websites/:id/export, https://example.com/a/b.md, and/or.';
  assert.deepEqual(filePaths([issue(3, { body })]), ['#3 names the file src/lib/format.ts', '#3 names the file prisma/schema.prisma']);
});

test('a cycle in the blockers is found; a chain is not a cycle', () => {
  assert.equal(findCycle([issue(1), issue(2, { blockedBy: [1] }), issue(3, { blockedBy: [2] })]), null);
  assert.deepEqual(findCycle([issue(1, { blockedBy: [3] }), issue(2, { blockedBy: [1] }), issue(3, { blockedBy: [2] })]), [1, 3, 2, 1]);
});

test('published issues must be labelled sub-issues, and the spec left alone', () => {
  const spec = { number: 90, body: 'spec', state: 'OPEN' };
  assert.deepEqual(publishingFaults([issue(1)], spec, 'spec'), []);
  assert.deepEqual(publishingFaults([issue(1, { parent: undefined, labels: [] })], { ...spec, body: 'changed' }, 'spec'), [
    '#1 is not a sub-issue of the spec',
    "#1 has no ready-for-agent label and the report doesn't say it is held back",
    'no issue is labelled ready-for-agent',
    'the spec body was edited',
  ]);
});

test('an issue the report says is held back may go without the label', () => {
  const spec = { number: 90, body: 'spec', state: 'OPEN' };
  const report = '| #1 | Export | nothing | ready |\n| #2 | Admin export | #1 | **held** |';
  assert.deepEqual(publishingFaults([issue(1), issue(2, { labels: [] })], spec, 'spec', report), []);
});

test('a criterion may be split over issues or put out of scope, but not dropped', () => {
  assert.deepEqual(coverageFaults({ C1: [1], C2: [], C3: [1, 2], C4: [] }, ['C4']), ['criterion C2 is in no issue and not listed as out of scope']);
});

test('the consent part is one issue that nothing waits on', () => {
  assert.deepEqual(consentSliceFaults([issue(1), issue(2)], [2]), []);
  assert.deepEqual(consentSliceFaults([issue(1, { blockedBy: [2] }), issue(2)], [2]), ['#1 is blocked by the consent slice #2']);
  assert.equal(consentSliceFaults([issue(1), issue(2)], [1, 2]).length, 1);
});

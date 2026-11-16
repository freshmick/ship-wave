import { askJudge } from './judge.mjs';
import { sectionOf } from './slice-checks.mjs';

// What the slicer's message asks the user, measured against the planted items.
export function judgeQuestions({ config, sliceCase, message }) {
  const planted = sliceCase.planted.map((item) => `- "${item.id}": ${item.what}`).join('\n');
  const instructions = `The material is a message an assistant sent to a user after reading a product spec.
Decide what the message asks the user to decide, allow or confirm. A recommendation offered with a question still counts as asking. A plain statement of what the assistant will do is not a question. "Is anything missing or wrong with this list?" is not a question either.

Topics to look for:
${planted}

Return JSON with these keys:
- "asks": true if the message asks the user at least one question about the spec's content.
- "planted": an object with one key per topic id above; true if the message asks about that topic, else false.
- "others": an array, one entry per question that fits none of the topics, each {"question": "<short quote>", "kind": "technical" | "product" | "other"}. "technical" means a choice about code, names, structure or tools that a user of the product would never notice. A question about the proposed list of issues itself (whether to merge, split or reorder them) is "other".
- "showsCut": true if the message lists the issues or slices it proposes to create.`;
  return askJudge({ config, instructions, material: message });
}

// What the published issues hold, measured against the spec's criteria.
export function judgeIssues({ config, sliceCase, spec, issues, report }) {
  const listing = issues.map((issue) => `### Issue #${issue.number}: ${issue.title}\n${issue.body}`).join('\n\n');
  const instructions = `The material holds a product spec, the issues it was cut into, and the assistant's closing report.
The spec's acceptance criteria have the ids ${sliceCase.criteria.join(', ')}.

Return JSON with these keys:
- "coverage": an object with one key per criterion id; the value is the array of issue numbers whose Outcome or Acceptance criteria deliver that criterion, in whole or in part. An issue that only mentions a criterion under "Out of scope" or "Blocked by" does not deliver it.
- "outOfScope": the array of criterion ids the closing report says are left out of scope.
- "manyOutcomes": the array of issue numbers whose Outcome section states more than one outcome: two things a user could get separately, joined together. One outcome with its conditions or details is one outcome.
- "consentIssues": the array of issue numbers that deliver ${sliceCase.consentCriterion ?? 'nothing (return an empty array)'}.`;
  const outcomes = issues.map((issue) => `#${issue.number} Outcome: ${sectionOf(issue.body, 'Outcome') ?? '(none)'}`).join('\n');
  const material = `## Spec\n${spec.body}\n\n## Issues\n${listing}\n\n## Outcome sections\n${outcomes}\n\n## Closing report\n${report}`;
  return askJudge({ config, instructions, material });
}

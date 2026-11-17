// Checks on the issues ship-slice published, decided in code. Each returns the
// reasons it failed; an empty list is a pass. Pure functions.

export const SECTIONS = ['Parent', 'Outcome', 'Acceptance criteria', 'Proving test', 'Door', 'Settled', 'Out of scope', 'Blocked by'];

const SOURCE_PATH = /(?<![\w/:.-])(?:[\w.()[\]-]+\/)+[\w.()[\]-]+\.(?:tsx?|jsx?|mjs|json|prisma|sql|ya?ml|css|md)\b/g;

// The text under `## <heading>`, up to the next heading of the same level.
export function sectionOf(body, heading) {
  const match = new RegExp(`^## ${heading}[ \\t]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'mi').exec(body);
  return match ? match[1].trim() : null;
}

export function missingSections(issues) {
  return issues.flatMap((issue) =>
    SECTIONS.filter((heading) => !sectionOf(issue.body, heading)).map((heading) => `#${issue.number} has no "${heading}" section`),
  );
}

export function filePaths(issues) {
  return issues.flatMap((issue) =>
    [...new Set(issue.body.match(SOURCE_PATH) ?? [])].map((path) => `#${issue.number} names the file ${path}`),
  );
}

// A cycle in the "blocked by" links, as a list of issue numbers, or null.
export function findCycle(issues) {
  const blockers = new Map(issues.map((issue) => [issue.number, issue.blockedBy ?? []]));
  const done = new Set();
  const visit = (number, path) => {
    if (path.includes(number)) return [...path.slice(path.indexOf(number)), number];
    if (done.has(number)) return null;
    for (const blocker of blockers.get(number) ?? []) {
      const cycle = visit(blocker, [...path, number]);
      if (cycle) return cycle;
    }
    done.add(number);
    return null;
  };
  for (const issue of issues) {
    const cycle = visit(issue.number, []);
    if (cycle) return cycle;
  }
  return null;
}

// An issue may go without the label only when the closing report says it is
// held back for a question that is still open.
export function publishingFaults(issues, spec, specBodyBefore, report = '') {
  const faults = [];
  const held = (number) => report.split('\n').some((line) => line.includes(`#${number}`) && /\bheld\b|still open|waits? (for|on) you/i.test(line));
  for (const issue of issues) {
    if (issue.parent !== spec.number) faults.push(`#${issue.number} is not a sub-issue of the spec`);
    if (!issue.labels.includes('ready-for-agent') && !held(issue.number)) {
      faults.push(`#${issue.number} has no ready-for-agent label and the report doesn't say it is held back`);
    }
  }
  if (issues.length && !issues.some((issue) => issue.labels.includes('ready-for-agent'))) faults.push('no issue is labelled ready-for-agent');
  if (spec.body !== specBodyBefore) faults.push('the spec body was edited');
  if (spec.state !== 'OPEN') faults.push('the spec was closed');
  return faults;
}

// `coverage` maps each spec criterion id to the issue numbers that deliver it,
// in whole or in part. A criterion may be split over slices; it may not vanish.
export function coverageFaults(coverage, outOfScope = []) {
  return Object.entries(coverage)
    .filter(([criterion, numbers]) => numbers.length === 0 && !outOfScope.includes(criterion))
    .map(([criterion]) => `criterion ${criterion} is in no issue and not listed as out of scope`);
}

// The part that needs consent must be one issue, and nothing else may wait on it.
export function consentSliceFaults(issues, consentIssueNumbers) {
  if (consentIssueNumbers.length !== 1) {
    return [`the part that needs consent is in ${consentIssueNumbers.length} issues, expected its own single issue`];
  }
  const [consent] = consentIssueNumbers;
  return issues
    .filter((issue) => (issue.blockedBy ?? []).includes(consent))
    .map((issue) => `#${issue.number} is blocked by the consent slice #${consent}`);
}

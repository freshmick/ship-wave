// Checks on what the whole flow left on the fake remote. Pure functions; each
// returns the reasons it failed, and an empty list is a pass.

const CLEAR = /<!--\s*pr-gate\s+verdict=clear\b/;

// Every slice must be closed by exactly one pull request.
export function onePrPerSlice(slices, prs) {
  return slices.flatMap((slice) => {
    const closing = prs.filter((pr) => pr.closes === slice.number);
    if (closing.length === 1) return [];
    return [`slice #${slice.number} is closed by ${closing.length} pull requests, expected one`];
  });
}

export function notMerged(slices, prs) {
  return [
    ...prs.filter((pr) => pr.state !== 'MERGED').map((pr) => `PR #${pr.number} was not merged (labels: ${pr.labels.join(', ') || 'none'})`),
    ...slices.filter((slice) => slice.state !== 'CLOSED').map((slice) => `slice #${slice.number} is still open`),
  ];
}

export function questionsOnPrs(prs) {
  return prs.flatMap((pr) => [
    ...(pr.labels.includes('needs-you') ? [`PR #${pr.number} is labelled needs-you`] : []),
    ...(/^## Needs you/m.test(pr.body) ? [`PR #${pr.number} has a "Needs you" section`] : []),
  ]);
}

// Nothing may merge without the gate's clear verdict, or with --admin.
export function gateSkipped(prs, log) {
  const ungated = prs
    .filter((pr) => pr.state === 'MERGED' && !pr.comments.some((comment) => CLEAR.test(comment.body)))
    .map((pr) => `PR #${pr.number} was merged with no gate comment saying the verdict is clear`);
  const admin = log.some((call) => call.argv.includes('--admin')) ? ['gh was called with --admin'] : [];
  return [...ungated, ...admin];
}

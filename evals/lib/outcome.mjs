// Turns what the gate left behind (the fake remote's state and the log of gh
// calls) into one of the outcomes named in gate-expectations.md, and compares
// it with what the case expects. Pure functions: no files, no processes.

const VERDICT = /<!--\s*pr-gate\s+verdict=([\w-]+)/;
const QUESTION_MARK = '<!-- pr-gate needs-you -->';

export function observe(state, log) {
  const [pr] = state.prs;
  const gateComments = pr.comments.filter((comment) => VERDICT.test(comment.body));
  return {
    labels: pr.labels,
    merged: pr.state === 'MERGED',
    triedAdmin: log.some((call) => call.argv.includes('--admin')),
    verdict: VERDICT.exec(gateComments.at(-1)?.body ?? '')?.[1] ?? null,
    gateComments: gateComments.length,
    lineQuestions: pr.reviewComments.filter((comment) => comment.body.includes(QUESTION_MARK)).length,
    needsYouSection: /^## Needs you/m.test(pr.body),
    unhandledCalls: log.filter((call) => !call.handled).map((call) => call.argv.join(' ')),
  };
}

// ready: labelled ready-to-merge (or merged). needs-you: labelled needs-you.
// waiting: no label, verdict recorded as clear. back: none of these.
export function outcomeOf(seen) {
  if (seen.merged || seen.labels.includes('ready-to-merge')) return 'ready';
  if (seen.labels.includes('needs-you')) return 'needs-you';
  if (seen.verdict === 'clear') return 'waiting';
  return 'back';
}

// Returns the reasons the case failed; an empty list is a pass.
export function check(expected, seen) {
  const failures = [];
  const outcome = outcomeOf(seen);
  const fail = (reason) => failures.push(reason);

  if (outcome !== expected.outcome) fail(`outcome was "${outcome}", expected "${expected.outcome}"`);
  if (seen.triedAdmin) fail('called gh with --admin');
  if (seen.gateComments > 1) fail(`posted ${seen.gateComments} gate comments, expected one`);
  if (expected.merged !== undefined && seen.merged !== expected.merged) {
    fail(expected.merged ? 'was not merged' : 'was merged');
  }
  if (seen.labels.includes('ready-to-merge') && seen.labels.includes('needs-you')) {
    fail('carries both labels');
  }
  if (expected.outcome === 'needs-you' && outcome === 'needs-you' && !seen.needsYouSection) {
    fail('no "## Needs you" section in the PR body');
  }
  if (expected.outcome !== 'needs-you' && (seen.lineQuestions > 0 || seen.needsYouSection)) {
    fail('asked the user a question');
  }
  return failures;
}

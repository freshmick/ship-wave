import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent-run.mjs';
import { acceptancePasses, cloneAt, testsPass } from './build-checks.mjs';
import { buildSmallRepo } from './build-fixture.mjs';
import { gateSkipped, notMerged, onePrPerSlice, questionsOnPrs } from './flow-checks.mjs';
import { answersFor, initialSliceState } from './slice-case.mjs';
import { judgeQuestions } from './slice-judge.mjs';

// A case is a directory under evals/flow/cases with case.json, spec.md and
// acceptance.test.mjs (the harness's test of the spec, run on the merged result).
export function loadFlowCases(config) {
  const root = join(config.evalsDir, 'flow', 'cases');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      return { ...JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8')), name: entry.name, dir };
    });
}

// Takes one spec through the whole flow in the small repository:
//   1. ship-slice, as a conversation: questions, answers, go;
//   2. ship-wave, in a fresh session, over the issues that were published.
// Nobody helps in between. Returns one result per row of flow-expectations.md.
export async function runFlowCase({ config, flowCase, dir }) {
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'gh-state.json');
  const logPath = join(dir, 'gh-log.jsonl');
  const { repo, origin } = buildSmallRepo({ config, dir });
  writeFileSync(statePath, JSON.stringify(initialSliceState(flowCase, 'acme-couriers/tripsheet'), null, 2));
  writeFileSync(logPath, '');
  const readState = () => JSON.parse(readFileSync(statePath, 'utf8'));
  const slicesOf = (state) => state.issues.filter((issue) => issue.parent === flowCase.spec.number);
  const ghEnv = { FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, FAKE_GH_ORIGIN: origin };
  const turns = [];
  const say = async (turn, prompt, options = {}) => {
    const result = await runAgent({ config, prompt, cwd: repo, dir, ghEnv, turn, keepSession: true, ...options });
    turns.push({ turn, exitCode: result.exitCode, timedOut: result.timedOut });
    return result;
  };

  // Slicing.
  const read = await say('slice-1-read', `/ship-slice ${flowCase.spec.number}`);
  const asked = await judgeQuestions({ config, sliceCase: flowCase, message: read.message });
  const cutBeforeAnswers = slicesOf(readState()).length;
  const askedIds = Object.keys(asked.planted ?? {}).filter((id) => asked.planted[id]);
  await say('slice-2-answers', answersFor(flowCase, askedIds), { resume: read.sessionId });
  await say('slice-3-go', 'Go: publish the issues. Do not start building them.', { resume: read.sessionId });
  const sliceNumbers = slicesOf(readState()).map((issue) => issue.number);

  // The wave, in a session that knows nothing of the slicing conversation.
  if (sliceNumbers.length) {
    const wave = await say('wave-1', `/ship-wave the sub-issues of #${flowCase.spec.number}: ${sliceNumbers.map((n) => `#${n}`).join(', ')}`, {
      timeoutMinutes: config.waveTimeoutMinutes,
      maxUsd: config.maxUsdPerWave,
    });
    // A wave may stop to tell the user its plan. One nudge, as a user would give.
    if (notMerged(slicesOf(readState()), readState().prs).length && !wave.timedOut) {
      await say('wave-2', 'Carry on with your recommendations until every PR that is ready has merged.', {
        resume: wave.sessionId,
        timeoutMinutes: config.waveTimeoutMinutes,
        maxUsd: config.maxUsdPerWave,
      });
    }
  }

  const state = readState();
  const slices = slicesOf(state);
  const log = readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const checkout = cloneAt(origin, 'origin/main', join(dir, 'check'));
  const works = [
    ...(testsPass(checkout) ? [] : ["the default branch's own tests fail"]),
    ...(acceptancePasses(checkout, join(flowCase.dir, 'acceptance.test.mjs')) ? [] : ["the harness's test of the spec's criteria fails on the default branch"]),
  ];
  const none = slices.length ? [] : ['no slice was published'];
  const planted = flowCase.planted.filter((item) => item.ask && !asked.planted?.[item.id]).map((item) => `not asked while slicing: ${item.what}`);

  const rows = [
    { row: 1, expected: 'decision asked while slicing', failures: [...planted, ...(cutBeforeAnswers ? [`${cutBeforeAnswers} slice(s) were published before the answers`] : [])] },
    { row: 2, expected: 'one PR per slice', failures: [...none, ...onePrPerSlice(slices, state.prs)] },
    { row: 3, expected: 'clean PRs merged, issues closed', failures: [...none, ...notMerged(slices, state.prs)] },
    { row: 4, expected: 'no question on any PR', failures: questionsOnPrs(state.prs) },
    { row: 5, expected: 'the merged result works', failures: [...none, ...works] },
    { row: 6, expected: 'nothing skips the gate', failures: gateSkipped(state.prs, log) },
  ];
  const crashed = turns.filter((turn) => turn.timedOut || turn.exitCode !== 0).map((turn) => `the turn "${turn.turn}" failed or timed out`);
  const unhandledCalls = log.filter((call) => !call.handled).map((call) => call.argv.join(' ').slice(0, 200));
  writeFileSync(join(dir, 'observed.json'), JSON.stringify({ asked, turns, slices: sliceNumbers, prs: state.prs.map((pr) => ({ number: pr.number, closes: pr.closes, state: pr.state, labels: pr.labels })) }, null, 2));
  return rows.map((row) => ({ ...row, name: flowCase.name, failures: [...row.failures, ...crashed], passed: row.failures.length === 0 && crashed.length === 0, unhandledCalls, dir }));
}

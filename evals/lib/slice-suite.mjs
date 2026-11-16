import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent-run.mjs';
import { buildBaseRepo } from './fixture.mjs';
import { answersFor, initialSliceState } from './slice-case.mjs';
import { consentSliceFaults, coverageFaults, filePaths, findCycle, missingSections, publishingFaults } from './slice-checks.mjs';
import { judgeIssues, judgeQuestions } from './slice-judge.mjs';
import { sliceRowResults } from './slice-rows.mjs';

// Runs one slicing case once, as the conversation ship-slice expects:
//   1. the slicer reads the spec and asks its questions (or shows the cut),
//   2. the user answers, and the slicer shows the cut,
//   3. the user says go, and the slicer publishes the issues.
// Returns one result per expectation row the case exercises.
export async function runSliceCase({ config, sourceRepo, sliceCase, dir }) {
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'gh-state.json');
  const logPath = join(dir, 'gh-log.jsonl');
  const { repo, origin } = buildBaseRepo({ config, sourceRepo, spec: sliceCase, dir });
  const before = initialSliceState(sliceCase);
  writeFileSync(statePath, JSON.stringify(before, null, 2));
  writeFileSync(logPath, '');
  const readState = () => JSON.parse(readFileSync(statePath, 'utf8'));
  const published = () => readState().issues.filter((issue) => issue.number !== sliceCase.spec.number);

  const ghEnv = { FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, FAKE_GH_ORIGIN: origin };
  let sessionId;
  const say = async (turn, prompt) => {
    const result = await runAgent({ config, prompt, cwd: repo, dir, ghEnv, turn, resume: sessionId, keepSession: true });
    sessionId = result.sessionId ?? sessionId;
    return result;
  };

  const first = await say('turn-1-read', `/ship-slice ${sliceCase.spec.number}`);
  const asked = await judgeQuestions({ config, sliceCase, message: first.message });
  const seen = { asked, publishedBeforeAnswers: published().length, turns: [first] };

  if (asked.asks) {
    const askedIds = Object.keys(asked.planted).filter((id) => asked.planted[id]);
    const second = await say('turn-2-answers', answersFor(sliceCase, askedIds));
    seen.askedAgain = await judgeQuestions({ config, sliceCase, message: second.message });
    seen.turns.push(second);
  }
  seen.publishedBeforeGo = published().length;

  const last = await say('turn-3-go', 'Go: publish the issues. Do not start building them.');
  seen.turns.push(last);
  const state = readState();
  const spec = state.issues.find((issue) => issue.number === sliceCase.spec.number);
  const issues = published();
  const judged = issues.length
    ? await judgeIssues({ config, sliceCase, spec, issues, report: last.message })
    : { coverage: {}, outOfScope: [], manyOutcomes: [], consentIssues: [] };

  const cycle = findCycle(issues);
  const faults = {
    sections: missingSections(issues),
    paths: filePaths(issues),
    cycle: cycle ? [`blockers form a cycle: ${cycle.map((n) => `#${n}`).join(' -> ')}`] : [],
    publishing: publishingFaults(issues, spec, before.issues[0].body, last.message),
    coverage: coverageFaults(judged.coverage, judged.outOfScope),
    outcomes: judged.manyOutcomes.map((n) => `#${n} states more than one outcome`),
    consent: sliceCase.consentCriterion ? consentSliceFaults(issues, judged.consentIssues) : [],
    nothingPublished: issues.length ? [] : ['no issue was published'],
  };
  writeFileSync(join(dir, 'observed.json'), JSON.stringify({ seen, judged, faults }, null, 2));

  const log = readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const unhandledCalls = log.filter((call) => !call.handled).map((call) => call.argv.join(' ').slice(0, 200));
  const crashed = seen.turns.filter((turn) => turn.timedOut || turn.exitCode !== 0).length;
  return sliceRowResults({ sliceCase, seen, faults, spec, viewer: state.viewer }).map((result) => ({
    ...result,
    name: sliceCase.name,
    failures: crashed ? [...result.failures, `${crashed} turn(s) of the session failed or timed out`] : result.failures,
    passed: result.failures.length === 0 && !crashed,
    unhandledCalls,
    dir,
  }));
}

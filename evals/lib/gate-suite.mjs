import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent-run.mjs';
import { buildFixture } from './fixture.mjs';
import { fill, initialGhState } from './gate-case.mjs';
import { check, observe, outcomeOf } from './outcome.mjs';

// Runs one gate case once: builds its repository, runs pr-gate on its PR, and
// compares what the gate did with what the case expects.
export async function runGateCase({ config, sourceRepo, gateCase, dir, numbers }) {
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'gh-state.json');
  const logPath = join(dir, 'gh-log.jsonl');
  const { repo, origin, firstSha } = buildFixture({ config, sourceRepo, gateCase, dir });
  const values = { ...numbers, firstSha };
  writeFileSync(statePath, JSON.stringify(initialGhState(gateCase, values), null, 2));
  writeFileSync(logPath, '');

  const run = await runAgent({
    config,
    prompt: fill(gateCase.prompt ?? '/pr-gate {{pr}}', values),
    cwd: repo,
    dir,
    ghEnv: { FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, FAKE_GH_ORIGIN: origin },
  });

  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const log = readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const seen = observe(state, log);
  const failures = check(gateCase.expected, seen);
  if (run.timedOut) failures.push(`timed out after ${config.timeoutMinutes} minutes`);
  else if (run.exitCode !== 0) failures.push(`the session exited with code ${run.exitCode}`);

  return {
    row: gateCase.row,
    name: gateCase.name,
    expected: gateCase.expected.outcome,
    outcome: outcomeOf(seen),
    strict: gateCase.expected.outcome === 'needs-you',
    passed: failures.length === 0,
    failures,
    unhandledCalls: seen.unhandledCalls,
    ghCalls: log.length,
    dir,
  };
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent } from './agent-run.mjs';
import { buildSmallRepo } from './build-fixture.mjs';
import { implementerPrompt, initialBuildState } from './build-case.mjs';
import { acceptancePasses, changedFiles, cloneAt, fileAt, outsideAllowed, prFaults, restoreSource, testEditFaults, testsPass } from './build-checks.mjs';
import { git } from './git.mjs';
import { askJudge } from './judge.mjs';

// Runs one building case once: an implementer gets one issue, as ship-wave's
// step 3 hands it over, and the harness checks what it left on the remote.
// Returns one result per expectation row the case exercises.
export async function runBuildCase({ config, buildCase, dir }) {
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'gh-state.json');
  const logPath = join(dir, 'gh-log.jsonl');
  const { repo, origin } = buildSmallRepo({ config, dir });
  writeFileSync(statePath, JSON.stringify(initialBuildState(buildCase), null, 2));
  writeFileSync(logPath, '');

  const ghEnv = { FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, FAKE_GH_ORIGIN: origin };
  const run = await runAgent({ config, prompt: implementerPrompt(buildCase), cwd: repo, dir, ghEnv });
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const checkout = cloneAt(origin, 'origin/main', join(dir, 'check'));

  const rows = await CHECKS[buildCase.expect]({ config, buildCase, state, checkout, message: run.message });
  const crashed = run.timedOut || run.exitCode !== 0 ? ['the session failed or timed out'] : [];
  const log = readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return rows.map((row) => ({
    ...row,
    name: buildCase.name,
    failures: [...row.failures, ...crashed],
    passed: row.failures.length === 0 && crashed.length === 0,
    unhandledCalls: log.filter((call) => !call.handled).map((call) => call.argv.join(' ').slice(0, 200)),
    dir,
  }));
}

const CHECKS = { pr: checkPullRequest, 'conflict-reported': checkConflict, 'cut-reported': checkCut };

function checkPullRequest({ buildCase, state, checkout }) {
  const pr = state.pr;
  if (!pr) {
    return buildCase.rows.map((row) => ({ row, expected: 'a pull request', failures: ['no pull request was opened'] }));
  }
  const head = `origin/${pr.headRefName}`;
  git(checkout, ['checkout', '--quiet', head]);
  const files = changedFiles(checkout, head);
  const meets = acceptancePasses(checkout, join(buildCase.dir, 'acceptance.test.mjs'));
  const greenAtHead = testsPass(checkout);
  const touchedTests = files.some((file) => file.startsWith('test/'));
  restoreSource(checkout, buildCase.sourceDirs);
  const redWithoutChange = !testsPass(checkout);
  git(checkout, ['checkout', '--quiet', '--force', head]);

  const kept = buildCase.leftAlone.filter((item) => !(fileAt(checkout, head, item.file) ?? '').includes(item.text));
  const doc = fileAt(checkout, head, buildCase.docMustMention.file) ?? '';
  return [
    { row: 1, expected: 'criteria met', failures: meets ? [] : ["the harness's test of the acceptance criteria fails on the PR"] },
    { row: 2, expected: 'proving test fails without the change', failures: [
      ...(touchedTests ? [] : ['the PR adds or changes no test']),
      ...(greenAtHead ? [] : ["the PR's own tests fail"]),
      ...(redWithoutChange ? [] : ["the PR's tests still pass with the source put back: they don't prove the change"]),
    ] },
    { row: 4, expected: 'nothing outside the criteria', failures: [
      ...kept.map((item) => `changed something the issue didn't ask for: ${item.what}`),
      ...outsideAllowed(files, buildCase.allowedFiles),
    ] },
    { row: 9, expected: 'stale doc updated', failures: new RegExp(buildCase.docMustMention.pattern, 'i').test(doc) ? [] : [`${buildCase.docMustMention.file} was not updated`] },
    { row: 11, expected: 'draft PR with keyword, evidence and Door', failures: prFaults(pr, buildCase.issue.number) },
  ];
}

async function checkConflict({ config, buildCase, state, checkout, message }) {
  const before = fileAt(checkout, 'origin/main', buildCase.protectedTest);
  const branches = git(checkout, ['branch', '--remotes', '--format=%(refname:short)']).split('\n').filter((ref) => ref.startsWith('origin/') && !['origin/main', 'origin/HEAD', 'origin'].includes(ref));
  const edits = branches.flatMap((ref) => testEditFaults(before, fileAt(checkout, ref, buildCase.protectedTest) ?? '', `${buildCase.protectedTest} on ${ref.replace('origin/', '')}`));
  const judged = await askJudge({
    config,
    instructions: 'The material is an implementer\'s final report to their lead. Return JSON {"reportsConflict": true|false}: true if the report says that an existing test contradicts what the issue asks for and leaves the decision to the lead or the user.',
    material: message,
  });
  return [{ row: 7, expected: 'conflict reported, test untouched', failures: [
    ...edits,
    ...(judged.reportsConflict ? [] : ['the report does not say an existing test contradicts the issue']),
    ...(state.pr && !state.pr.isDraft ? ['opened a non-draft PR'] : []),
  ] }];
}

async function checkCut({ config, state, message }) {
  const judged = await askJudge({
    config,
    instructions: 'The material is an implementer\'s final report to their lead. Return JSON {"reportsCut": true|false}: true if the report says the issue holds more than one outcome or slice and says where it should be cut.',
    material: message,
  });
  return [{ row: 8, expected: 'no PR, cut reported', failures: [
    ...(state.pr ? [`opened PR #${state.pr.number} for an issue that holds two outcomes`] : []),
    ...(judged.reportsCut ? [] : ['the report does not say where the issue should be cut']),
  ] }];
}

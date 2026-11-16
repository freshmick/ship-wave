#!/usr/bin/env node
// Runs an eval suite and reports pass or fail per expectation row.
//   node evals/run.mjs gate [--rows 1,18] [--runs 3]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './lib/config.mjs';
import { loadGateCases } from './lib/gate-case.mjs';
import { runGateCase } from './lib/gate-suite.mjs';
import { mapPool } from './lib/pool.mjs';
import { expectationRows, formatSummary, summarise } from './lib/report.mjs';
import { ensureSourceRepo } from './lib/source-repo.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { rows: { type: 'string' }, runs: { type: 'string', default: '1' } },
});
const [suite] = positionals;
if (suite !== 'gate') {
  console.error('usage: node evals/run.mjs gate [--rows 1,18] [--runs 3]');
  process.exit(2);
}

const config = loadConfig();
const wanted = values.rows?.split(',').map(Number);
const cases = loadGateCases(config).filter((gateCase) => !wanted || wanted.includes(gateCase.row));
const runs = Number(values.runs);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const sourceRepo = ensureSourceRepo(config);

const jobs = cases.flatMap((gateCase) => Array.from({ length: runs }, (_, n) => ({ gateCase, n: n + 1 })));
console.log(`Running ${jobs.length} gate run(s) over ${cases.length} case(s), ${config.concurrency} at a time.`);

const results = await mapPool(jobs, config.concurrency, async ({ gateCase, n }, index) => {
  const dir = join(config.workDir, runId, `${gateCase.name}-run${n}`);
  const numbers = { issue: 100 + index * 2, pr: 101 + index * 2 };
  const result = await runGateCase({ config, sourceRepo, gateCase, dir, numbers });
  console.log(`  ${result.passed ? 'pass' : 'FAIL'}  ${gateCase.name} run ${n}: ${result.outcome}`);
  return result;
});

const summary = summarise(results, expectationRows(join(config.evalsDir, 'gate-expectations.md')));
mkdirSync(config.resultsDir, { recursive: true });
const resultFile = join(config.resultsDir, `gate-${runId}.json`);
writeFileSync(resultFile, JSON.stringify(summary, null, 2));
console.log(`\n${formatSummary(summary)}\n\nFull result: ${resultFile}`);
process.exitCode = summary.failed ? 1 : 0;

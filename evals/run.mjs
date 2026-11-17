#!/usr/bin/env node
// Runs an eval suite and reports pass or fail per expectation row.
//   node evals/run.mjs gate [--rows 1,18] [--runs 3]
//   node evals/run.mjs slice [--cases nothing-open] [--runs 3]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './lib/config.mjs';
import { mapPool } from './lib/pool.mjs';
import { expectationRows, formatSummary, summarise } from './lib/report.mjs';
import { ensureSourceRepo } from './lib/source-repo.mjs';
import { SUITES } from './lib/suites.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { rows: { type: 'string' }, cases: { type: 'string' }, runs: { type: 'string', default: '1' } },
});
const suite = SUITES[positionals[0]];
if (!suite) {
  console.error(`usage: node evals/run.mjs <${Object.keys(SUITES).join('|')}> [--rows 1,18] [--cases name,name] [--runs 3]`);
  process.exit(2);
}

const config = loadConfig();
const wantedRows = values.rows?.split(',').map(Number);
const wantedCases = values.cases?.split(',');
const allCases = suite.load(config);
const cases = allCases
  .filter((item) => !wantedRows || suite.rowsOf(item).some((row) => wantedRows.includes(row)))
  .filter((item) => !wantedCases || wantedCases.includes(item.name));
const runs = Number(values.runs);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const sourceRepo = ensureSourceRepo(config);

const jobs = cases.flatMap((item) => Array.from({ length: runs }, (_, n) => ({ item, n: n + 1 })));
console.log(`Running ${jobs.length} ${positionals[0]} run(s) over ${cases.length} case(s), ${config.concurrency} at a time.`);

const results = await mapPool(jobs, config.concurrency, async ({ item, n }, index) => {
  const dir = join(config.workDir, runId, `${item.name}-run${n}`);
  const rowResults = await suite.run({ config, sourceRepo, item, dir, index });
  const failed = rowResults.filter((result) => !result.passed).map((result) => result.row);
  console.log(`  ${failed.length ? `FAIL rows ${failed.join(', ')}` : 'pass'}  ${item.name} run ${n}`);
  return rowResults;
});

const allRows = expectationRows(join(config.evalsDir, suite.expectations));
const summary = summarise(results.flat(), allRows, [...new Set(allCases.flatMap(suite.rowsOf))]);
mkdirSync(config.resultsDir, { recursive: true });
const resultFile = join(config.resultsDir, `${positionals[0]}-${runId}.json`);
writeFileSync(resultFile, JSON.stringify(summary, null, 2));
console.log(`\n${formatSummary(summary)}\n\nFull result: ${resultFile}`);
process.exitCode = summary.failed ? 1 : 0;

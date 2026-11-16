#!/usr/bin/env node
// Measures how often a fresh-context reviewer catches one planted bug as the
// diff around it grows. Not a pass/fail eval: it prints a table.
//   node evals/measure-catch-rate.mjs [--trials 3]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { SIZES, reviewOnce } from './lib/catch-rate.mjs';
import { loadConfig } from './lib/config.mjs';
import { mapPool } from './lib/pool.mjs';
import { ensureSourceRepo } from './lib/source-repo.mjs';

const { values } = parseArgs({ options: { trials: { type: 'string', default: '3' } } });
const config = loadConfig();
const sourceRepo = ensureSourceRepo(config);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const jobs = SIZES.flatMap((size, s) => Array.from({ length: Number(values.trials) }, (_, t) => ({ size, dir: join(config.workDir, runId, `size${s}-trial${t + 1}`) })));

console.log(`Running ${jobs.length} reviews (${SIZES.length} diff sizes, ${values.trials} each) on ${config.model}, ${config.concurrency} at a time.`);
const results = await mapPool(jobs, config.concurrency, async ({ size, dir }) => {
  const result = await reviewOnce({ config, sourceRepo, size, dir });
  console.log(`  ${result.caught ? 'caught' : 'MISSED'}  ${result.lines} lines  (${result.findings} findings)`);
  return result;
});

console.log('\nDiff size             Lines  Files  Caught');
for (const size of SIZES) {
  const runs = results.filter((result) => result.size === size.name);
  const caught = runs.filter((result) => result.caught).length;
  console.log(`${size.name.padEnd(22)}${String(runs[0].lines).padStart(5)}  ${String(runs[0].files).padStart(5)}  ${caught} of ${runs.length}`);
}
mkdirSync(config.resultsDir, { recursive: true });
const file = join(config.resultsDir, `catch-rate-${runId}.json`);
writeFileSync(file, JSON.stringify({ model: config.model, results }, null, 2));
console.log(`\nFull result: ${file}`);

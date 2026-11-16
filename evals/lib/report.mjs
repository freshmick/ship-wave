import { readFileSync } from 'node:fs';

// The row numbers in an expectations file: every table line that starts `| <n> |`.
export function expectationRows(path) {
  return [...readFileSync(path, 'utf8').matchAll(/^\|\s*(\d+)\s*\|/gm)].map((match) => Number(match[1]));
}

// Groups run results by row. A row passes only when every run of it passed.
// `caseRows` are the rows that have a case, run this time or not.
export function summarise(results, allRows, caseRows) {
  const byRow = new Map();
  for (const result of results) byRow.set(result.row, [...(byRow.get(result.row) ?? []), result]);
  const rows = [...byRow.entries()].map(([row, runs]) => ({
    row,
    expected: runs[0].expected,
    passed: runs.every((run) => run.passed),
    runs,
  }));
  return {
    rows,
    passed: rows.filter((row) => row.passed).length,
    failed: rows.filter((row) => !row.passed).length,
    notRun: caseRows.filter((row) => !byRow.has(row)),
    notAutomated: allRows.filter((row) => !caseRows.includes(row)),
  };
}

export function formatSummary(summary) {
  const lines = [];
  for (const row of summary.rows) {
    const passes = row.runs.filter((run) => run.passed).length;
    lines.push(`${row.passed ? 'PASS' : 'FAIL'}  row ${row.row}  (expected ${row.expected}; ${passes}/${row.runs.length} runs passed)`);
    for (const run of row.runs.filter((item) => !item.passed)) {
      run.failures.forEach((failure) => lines.push(`        - ${run.name}: ${failure}`));
      lines.push(`          evidence: ${run.dir}`);
    }
  }
  // Calls the fake gh could not answer, once per run directory, not once per row.
  const gaps = new Map(summary.rows.flatMap((row) => row.runs).filter((run) => run.unhandledCalls.length).map((run) => [run.dir, run]));
  for (const run of gaps.values()) {
    lines.push(`NOTE  ${run.name}: the fake gh could not answer ${run.unhandledCalls.length} call(s): ${run.unhandledCalls.slice(0, 3).map((call) => call.slice(0, 80)).join(' | ')}`);
  }
  lines.push('');
  lines.push(`${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.notRun.length) lines.push(`Not run this time: rows ${summary.notRun.join(', ')}`);
  if (summary.notAutomated.length) {
    lines.push(`No case yet (${summary.notAutomated.length} rows): ${summary.notAutomated.join(', ')}`);
  }
  return lines.join('\n');
}

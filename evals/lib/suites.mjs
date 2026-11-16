import { loadBuildCases } from './build-case.mjs';
import { runBuildCase } from './build-suite.mjs';
import { loadGateCases } from './gate-case.mjs';
import { runGateCase } from './gate-suite.mjs';
import { loadSliceCases } from './slice-case.mjs';
import { runSliceCase } from './slice-suite.mjs';

// One entry per suite: its expectations file, how to load its cases, which
// rows a case covers, and how to run a case once. `run` resolves with one
// result per row the case exercises.
export const SUITES = {
  gate: {
    expectations: 'gate-expectations.md',
    load: loadGateCases,
    rowsOf: (gateCase) => [gateCase.row],
    // Each run gets its own PR and issue number, so runs side by side never share one.
    run: async ({ config, sourceRepo, item, dir, index }) => {
      const numbers = { issue: 100 + index * 2, pr: 101 + index * 2 };
      return [await runGateCase({ config, sourceRepo, gateCase: item, dir, numbers })];
    },
  },
  slice: {
    expectations: 'slice-expectations.md',
    load: loadSliceCases,
    rowsOf: sliceRows,
    run: ({ config, sourceRepo, item, dir }) => runSliceCase({ config, sourceRepo, sliceCase: item, dir }),
  },
  build: {
    expectations: 'build-expectations.md',
    load: loadBuildCases,
    rowsOf: (buildCase) => buildCase.rows,
    run: ({ config, item, dir }) => runBuildCase({ config, buildCase: item, dir }),
  },
};

// The rows a slicing case reports on (see slice-rows.mjs).
function sliceRows(sliceCase) {
  const planted = sliceCase.planted.map((item) => item.row);
  const asking = sliceCase.expectQuestions ? [8, 10] : [7];
  const consent = sliceCase.consentCriterion ? [16] : [];
  return [...new Set([...planted, ...asking, 11, 13, 14, 15, ...consent, 21, 22, 23])];
}

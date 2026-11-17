Fixes #{{issue}}

Adds `buildRevenueTrendOptions`, which turns revenue points into chart options: one line per currency, oldest day first. The options are typed with Highcharts, which the next slice uses to draw the chart with a range selector; `highcharts` is added to the dependencies and the lockfile.

**Evidence:** `./checks.sh`; the two tests in `src/lib/revenue-trend.test.ts`.

**Door:** two-way: a revert undoes it.

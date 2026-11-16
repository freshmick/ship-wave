Fixes #{{issue}}

Long numbers that round up now move to the next unit, so 999,999 reads `1.0m` and not `1000k`. Each threshold in `formatLongNumber` is lowered by half of the smaller unit's last digit.

**Evidence:** `./checks.sh`; the new test `formatLongNumber moves values that round up to the next format` in `src/lib/format.test.ts`.

**Door:** two-way: a revert undoes it.

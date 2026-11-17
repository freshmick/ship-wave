Fixes #{{issue}}

The revenue sessions query on ClickHouse now qualifies its filter and search columns with the event table, the same way the sessions list does, so a filter no longer picks up the wrong column after the join.

**Evidence:** `./checks.sh`; `tests/api/revenue.spec.ts` gains a case for filtered revenue sessions (it runs against PostgreSQL).

**Door:** two-way: a revert undoes it.

Fixes #{{issue}}

Long numbers that round up now move to the next unit, so 999,999 reads `1.0m` and not `1000k`. Each threshold in `formatLongNumber` is lowered by half of the smaller unit's last digit.

Also fixes the password change endpoint returning 500 when the signed-in user no longer exists: it now answers 401.

**Evidence:** `./checks.sh`; the new test in `src/lib/format.test.ts` and the new cases in `src/app/api/me/password/route.test.ts`.

**Door:** two-way: a revert undoes it.

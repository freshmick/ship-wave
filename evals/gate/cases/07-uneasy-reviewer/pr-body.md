Fixes #{{issue}}

Redis-backed sessions now stay alive while they are used. `saveAuth` stores the session with its lifetime, and `checkAuth` pushes the expiry out by that lifetime on each authenticated request. Sessions stored before this change are left at their original expiry.

**Evidence:** `./checks.sh`; four new tests under `checkAuth password fingerprint` in `src/lib/auth.test.ts`.

**Door:** two-way: a revert undoes it.

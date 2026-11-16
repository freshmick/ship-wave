<!-- pr-gate finding -->
**Blocking:** this test cannot fail. The mocked session has no `ttl`, so the `key.ttl` half of the guard in `checkAuth` stops the refresh by itself. Acceptance criterion 3 (a session rejected because the password changed is not refreshed) is not proved. Fix: give the mocked session `ttl: AUTH_SESSION_TTL`.

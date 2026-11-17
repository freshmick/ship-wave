## Parent
#90 Sign-in sessions behave the same with and without Redis

## Outcome
With Redis enabled, a user who keeps using the app stays signed in; today they are signed out about an hour after login.

## Acceptance criteria
- [ ] Given a Redis-backed session, when the user makes an authenticated request, then the session's expiry is pushed out again by the window it was created with
- [ ] A session stored before this change (no recorded window) keeps its original expiry and still works
- [ ] A session rejected because the password changed is not refreshed

## Proving test
Unit tests in `src/lib/auth.test.ts` that call `checkAuth` against a mocked Redis client and assert the `expire` call.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Sessions without Redis (JWT only), and a "sign out everywhere" control.

## Blocked by
nothing

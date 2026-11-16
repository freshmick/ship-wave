## Parent
#90 Team roles can't be raised without an owner

## Outcome
A view-only team member can no longer read the team's access code from the API. Today they can read it, leave the team and join again with it as a full member.

## Acceptance criteria
- [ ] Given a view-only member, `GET /api/teams/:teamId` returns the team without `accessCode`
- [ ] Given a view-only member, the list of their teams has no `accessCode` on that team
- [ ] A team owner still gets `accessCode` in both responses

## Proving test
A unit test on `getUserTeams` with one team per role that asserts which teams carry `accessCode`, and a route test on `GET /api/teams/:teamId`.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Changing what joining with an access code grants.

## Blocked by
nothing

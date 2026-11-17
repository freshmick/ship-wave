## Parent
#90 Team owners know who joins

## Outcome
When someone joins a team with its access code, the operations chat channel gets a message saying who joined. The message goes to the webhook in `OPS_WEBHOOK_URL`, which is already set in production: the deploy job posts its notices there today.

## Acceptance criteria
- [ ] Given `OPS_WEBHOOK_URL` is set, when a user joins a team, then a POST with the JSON body `{ "text": "<username> joined the team <team name>." }` is sent to that URL
- [ ] Given no `OPS_WEBHOOK_URL`, nothing is sent
- [ ] Error case: when the POST fails, the join still succeeds

## Proving test
A unit test that stubs `fetch` and asserts the URL and the body.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Messages for leaving a team or changing a role.

## Blocked by
nothing

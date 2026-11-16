## Parent
#90 Tidy what the user API returns

## Outcome
A user returned by the API no longer carries `logoUrl`, a field that nothing sets or shows.

## Acceptance criteria
- [ ] Given any endpoint that returns a user, the user has no `logoUrl` field
- [ ] A team returned by the API still has its `logoUrl`

## Proving test
The check suite passes with nothing referring to `User.logoUrl`.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
The team logo.

## Blocked by
nothing

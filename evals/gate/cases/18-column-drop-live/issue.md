## Parent
#90 Tidy the user table

## Outcome
The `user` table no longer has the `logo_url` column, which no code reads or writes.

## Acceptance criteria
- [ ] A migration removes `user.logo_url`
- [ ] `prisma/schema.prisma` no longer lists `logoUrl` on `User`
- [ ] `team.logo_url` is untouched

## Proving test
The check suite passes with the regenerated Prisma client: nothing references `User.logoUrl`.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
The team logo.

## Blocked by
nothing

Fixes #{{issue}}

The team access code is now returned only to members who can edit the team. `GET /api/teams/:teamId` and the list of a user's teams leave `accessCode` out for everyone else, so a view-only member can't read it and rejoin with more access.

**Evidence:** `./checks.sh`; `src/queries/prisma/team.test.ts` and `src/app/api/teams/[teamId]/route.test.ts`.

**Door:** two-way: a revert undoes it.

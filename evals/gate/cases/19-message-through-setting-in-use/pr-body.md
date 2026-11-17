Fixes #{{issue}}

Joining a team with its access code now posts "<username> joined the team <team name>." to the webhook in `OPS_WEBHOOK_URL`. `OPS_WEBHOOK_URL` is the webhook the deploy job already posts to, so it is set in production today. With no URL set nothing is sent, and a failed post never fails the join.

**Evidence:** `./checks.sh`; the three tests in `src/lib/team-notify.test.ts`.

# Umami

Web analytics: Next.js and TypeScript, with Prisma on PostgreSQL.

## Checks
- `./checks.sh` runs what CI runs: lint, the type check and the unit tests. Its exit code and summary are the result.
- Don't run `pnpm` or start the app in this checkout: it has no dependencies installed and no database.

## Conventions
- The default branch is `main`. Merge by squash and delete the branch.
- Database changes are Prisma migrations under `prisma/migrations/`.
- Sign-in, sessions and API keys live in `src/app/api/auth/` and `src/lib/auth.ts`.

## Issues
- Issues are GitHub Issues in this repository; use `gh`. A spec is one issue and its slices are its sub-issues.
- Labels: `ready-for-agent` marks an issue an agent may start.

# Risk paths (read by the pr-gate skill)

lane: {{lane}}

One glob per bullet, in backticks, gitignore style. A file matching a sensitive glob is sensitive even if it also matches a docs-and-tests glob.

## sensitive
- `src/app/api/auth/**` - sign-in, sessions, tokens
- `src/lib/auth.ts`
- `prisma/**` - stored data shape
- `db/**`
- `.github/**`
- `Dockerfile*`
- `docker-compose*`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `biome.json` - the checks themselves
- `vitest.config.ts`
- `checks.sh`
- `CLAUDE.md`
- `AGENTS.md`
- `.claude/**` - the rules agents follow, including this file

## docs and tests
- `**/*.md`
- `**/*.test.*`
- `tests/**`

# Risk paths template

A repo may keep its own list at `.claude/risk-paths.md`, written by hand or with the user by the `risk-paths` skill. It sets the repo setting and the paths that decide each PR's review depth. When a repo has none, the gate uses this template with `lane: live`: its generic globs work in any repo. The example globs match nothing, so there the gate goes by what the code does: sign-in and permissions, where user data is stored, and what keeps one user's data from another are sensitive wherever they live.

```markdown
# Risk paths (read by the pr-gate skill)

lane: live

Set the line above to mvp or live. With mvp (no real users) a revert undoes a change to stored data or an API, so the gate doesn't ask for consent to one. With live (real users, or someone else's repo) a migration that drops or rewrites data, a changed public API and a message or charge to real people are one-way doors: the gate asks the user first. No line means live.

One glob per bullet, in backticks, gitignore style (`**` crosses directories). A note may follow after ` - `. A file matching a sensitive glob is sensitive, even if it also matches a docs-and-tests glob. A sensitive path gets a second reviewer; it does not by itself send the PR to the user. A PR is docs-and-tests only when every changed file matches a docs-and-tests glob or is regenerated from an unchanged source, and it changes no behaviour.

## sensitive
- `src/auth/**` - example: sign-in, tokens, sessions, permissions; replace with this repo's paths
- `src/storage/**` - example: where user data is written, read and deleted
- `src/api/**` - example: endpoints that scope data per user or project
- `src/scoring/**` - example: calculation formulas and their default parameters
- `.github/workflows/**`
- `.github/CODEOWNERS`
- `Dockerfile*`
- `docker-compose*`
- `infra/**` - Terraform, Pulumi, Kubernetes, Helm
- `**/*.tf`
- `pyproject.toml`
- `uv.lock`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `openapi*.{yaml,yml,json}` - API contract
- `**/*.proto`
- `migrations/**` - stored data shape
- `.importlinter` - architecture rules
- `.dependency-cruiser.*` - architecture rules
- `.pre-commit-config.yaml` - the checks themselves
- `pytest.ini`
- `.coveragerc`
- `vitest.config.*`
- `jest.config.*`
- `.semgrep*`
- `.gitleaks.toml`
- `CLAUDE.md`
- `AGENTS.md`
- `.claude/**` - the rules agents follow, including this file

## needs-adr
- `openapi*.{yaml,yml,json}`
- `**/*.proto`
- `migrations/**`
- `.importlinter`
- `.dependency-cruiser.*`

## docs and tests
- `docs/**`
- `**/*.md`
- `tests/**`
- `**/*.test.*`
- `**/*.spec.*`
```

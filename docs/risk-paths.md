# Writing `.claude/risk-paths.md`

`/risk-paths` writes the file with you: it asks whether anyone real uses the product, finds the candidate paths in the repo, asks what is missing and opens the file as its own PR. The file is one of the controls, so that PR comes to you. Until the file exists the gate uses the template in [`skills/pr-gate/references/risk-paths-template.md`](../skills/pr-gate/references/risk-paths-template.md) with `lane: live`.

The file has one `lane:` line and up to three sections. Paths are globs, one per bullet, in backticks. A note after ` - ` is for humans and is ignored by the gate.

```markdown
# Risk paths (read by the pr-gate skill)

lane: mvp

## sensitive
- `src/auth/**` - sign-in, sessions, permissions
- `src/billing/**` - anything that charges a card
- `migrations/**` - stored data shape
- `.github/workflows/**` - CI itself
- `package.json`
- `pnpm-lock.yaml`
- `.claude/**` - the rules agents follow, including this file

## needs-adr
- `migrations/**`
- `openapi.yaml`

## docs and tests
- `docs/**`
- `**/*.md`
- `tests/**`
- `**/*.test.*`
```

What each part does:

- **`lane:`** says what counts as a one-way door. It is `mvp` while nobody real is using the product: a revert undoes a change to stored data or an API, so the gate doesn't ask for consent to one. It is `live` once they are: a migration that drops or rewrites data, a changed public API and a message or charge to real people need your consent first. Leaving the line out means `live`.
- **`sensitive`** lists the paths where a mistake hurts: sign-in, user data, money, CI, deploy, dependency manifests and lockfiles, and the agent rule files. A PR touching one gets a second reviewer with a security lens, on a different model when one is available. A sensitive path does not by itself send a PR to you.
- **`needs-adr`** lists paths whose change needs a decision record. When a PR touches one without a `docs/adr/*.md` file, the implementer writes the record from the issue if the issue holds the decision; if it doesn't, that is a question for you.
- **`docs and tests`** lists what counts as a docs-or-tests-only change, which needs no reviewer. A PR is in that bucket only when every changed file matches here and nothing behaves differently.

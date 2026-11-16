# Risk paths (read by the pr-gate skill)

lane: mvp

This repo has no users (the developer, 12 November 2026), so a revert undoes any change to it. A sensitive path gets a second reviewer; it does not by itself send a PR to the developer. A PR reaches the developer only for one of the five cases in pr-gate's step 5; here that mostly means a change to the controls listed below. Skill files change what agents do, so a PR that edits `skills/**` is never docs-or-tests only: it is ordinary and gets one fresh-context reviewer.

One glob per bullet, in backticks, gitignore style. A file matching a sensitive glob is sensitive even if it also matches a docs-and-tests glob.

## sensitive
- `.claude/**` - the rules agents follow, including this file
- `CLAUDE.md`
- `AGENTS.md`
- `.github/**`

## docs and tests
- `README.md`
- `CREDITS.md`
- `licenses/**`

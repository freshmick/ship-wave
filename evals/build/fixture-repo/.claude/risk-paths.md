# Risk paths (read by the pr-gate skill)

lane: mvp

One glob per bullet, in backticks, gitignore style.

## sensitive
- `package.json`
- `CLAUDE.md`
- `.claude/**` - the rules agents follow, including this file

## docs and tests
- `**/*.md`
- `test/**`

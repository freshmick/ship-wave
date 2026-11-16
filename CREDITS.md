# Credits

## Matt Pocock: mattpocock/skills

No files copied. The flow in the README runs his skills (`grill-me`, `grill-with-docs`, `to-spec`, `pr`, `setup-matt-pocock-skills` and the helpers they call) from his plugin, `mattpocock-skills@claude-plugins-official`, which updates itself. `skills/ship-grill` is his `grill-me` and `grill-with-docs` with one line added for this flow; the interview is his `grilling` skill. `skills/ship-slice` takes the place of his `to-tickets` and builds on its rules: tracer-bullet vertical slices, blocking edges, prefactoring first, expand-migrate-contract for wide refactors, and no file paths in issues. Source: [mattpocock/skills](https://github.com/mattpocock/skills), MIT License, copyright (c) 2026 Matt Pocock.

## Jesse Vincent: obra/superpowers

No files copied. The idea of a lead's ledger file that survives context compaction comes from [obra/superpowers](https://github.com/obra/superpowers) (`subagent-driven-development`), MIT License.

## Umami Software: umami-software/umami

The eval cases under `evals/gate/cases/` hold small diffs taken from, or written against, [umami-software/umami](https://github.com/umami-software/umami), so the gate is tested on realistic code. Each `case.json` names the pull request its diff comes from. The eval run also clones Umami to build its fixture repositories; nothing from it is installed or run. MIT License, copyright (c) 2022 Umami Software, Inc.; the licence text is in `licenses/umami-LICENSE`.

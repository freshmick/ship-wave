# Install and setup

## The five skills

This repo holds five skills: `ship-grill`, `ship-slice`, `ship-wave`, `pr-gate` and `risk-paths`. Each is a folder in `skills/` with a `SKILL.md`. Copy them to where you want them:

- `~/.claude/skills/` to have them in every project
- `<repo>/.claude/skills/` to have them in one repo

The rest of the flow is Matt Pocock's skills, installed as a plugin that updates itself:

```
claude plugin install mattpocock-skills@claude-plugins-official
```

## What needs what

- `pr-gate` needs the GitHub CLI (`gh`).
- `ship-slice` and `ship-wave` need `pr-gate` next to them.
- `ship-wave` also needs `ship-slice` and the `pr` skill from Matt's plugin. If the engineering plugin is installed, it also uses its `debug` and `deploy-checklist` skills.

## Once per repo

1. `/setup-matt-pocock-skills` asks which tracker you use.
2. `/risk-paths` asks whether anyone real uses the product and which paths are sensitive, and writes the file the gate reads. See [risk-paths.md](risk-paths.md).

## Skills from Matt Pocock's plugin

Not in this repo. They come from [mattpocock/skills](https://github.com/mattpocock/skills) via the plugin above; see [CREDITS.md](../CREDITS.md). The ones the flow uses:

| Skill | Use it for |
|---|---|
| `grill-me` | Being interviewed about a plan until it's settled. `ship-grill` runs it with one line added. |
| `grill-with-docs` | Same, plus decision records (ADRs) and a glossary. `ship-grill docs` runs it. |
| `to-spec` | Writing the settled design down as a spec issue, no interview. |
| `prototype` | A throwaway prototype to settle a UI or state question. |
| `improve-codebase-architecture` | Finding the worst tangles in a messy codebase. |
| `wayfinder` | Work too big for one session, laid out as a map of decision tickets. |
| `setup-matt-pocock-skills` | The one-time setup per repo: tracker and labels. |

`grilling` and `domain-modeling` (which `ship-grill` calls), `codebase-design`, `research` and `pr` (the PR body template `ship-wave` uses) are helpers the skills above call. You don't run them yourself. His `to-tickets` is not used: `ship-slice` takes its place.

## Using the skills on claude.ai

Zip a skill folder (the folder itself at the zip root, no `__pycache__`), then upload it under Customize > Skills. To update one later: the skill > More options > Replace.

Matt's skills have to be zipped from [his repo](https://github.com/mattpocock/skills). They carry a `disable-model-invocation` line in their `SKILL.md`; remove it before uploading. claude.ai only accepts `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`.

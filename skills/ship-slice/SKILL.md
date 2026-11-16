---
name: ship-slice
description: Cut a spec into vertical-slice issues that agents can build without coming back to the user. Lists every decision and consent only the user can give, asks them all in one batch before cutting, then publishes one issue per slice with a fixed contract (outcome, acceptance criteria, proving test, door, settled answers, out of scope, blockers). Takes the place of /to-tickets in the ship-wave flow. Use when the user says "/ship-slice", "slice this spec", "cut this into issues", after /to-spec, or when ship-wave or pr-gate hold an issue that is not one slice.
license: MIT
argument-hint: "[spec issue id or URL, or one issue to re-cut; default: the spec in this conversation]"
---

# Ship slice

This is where the user's time goes. Every decision and every consent is asked for here, once, so that no PR has to ask later. A question that reaches a PR is a gap this skill left.

Input: `$ARGUMENTS` (a spec, or one issue to re-cut). The slicing rules build on Matt Pocock's `to-tickets` from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT). `pr-gate` must be installed next to this skill: its step 5 says what needs the user and its step 1 says what a slice is.

## 1. Read
- The spec in full, with its comments, and the repo's CLAUDE.md / AGENTS.md, ADRs and glossary. Use their words in the issues.
- `.claude/risk-paths.md` for the repo setting and the sensitive paths (pr-gate's template when the repo has none).
- The tracker and its labels, from `docs/agents/issue-tracker.md` when `/setup-matt-pocock-skills` wrote one.
- The code the spec touches: what exists, what has no tests, what would be easier after a small refactor first.

## 2. Find what only the user can settle
Do this before cutting anything. Go through the spec against pr-gate's step 5 and list:
- **Decisions.** Every place the spec is silent or contradicts itself on something a user would notice: empty and error states, limits, who can see or do what, what happens to existing data, the words on the screen.
- **Consents.** Every one-way door under the repo's setting, every change to the controls, every new dependency whose licence restricts use.
- **What can't be tested.** An external system with no sandbox, a result nobody can check before real use.

Settle yourself what the code, the spec or an ADR already answers, and every technical choice. Ask the rest in one batch: numbered, each with its options and your recommendation, each answerable in a sentence. Don't cut until they are answered. Then write the answers on the spec as one comment that starts `[Agent comment]` and quotes the user's words, so they outlive this conversation.

When re-cutting one issue, ask only if the new cut raises a question the spec's answers don't cover.

## 3. Cut the slices
A slice is one outcome a user or a test can see, proved by one test, that a revert removes whole. It goes through every layer it needs (schema, API, screen, tests); it is never one layer of several slices.

- **One outcome each.** If you need "and" to say what it delivers, cut again. Size is not the test.
- **At most one thing for the user.** A part that carries a consent, or a decision the user chose to leave open, is its own slice, so the rest doesn't wait on it.
- **Every criterion in the spec lands in exactly one slice**, or under "out of scope" in the report.
- **Empty repo:** the first slice is a walking skeleton, the smallest code that builds, runs one path end to end and passes CI. Everything else is blocked by it.
- **Prefactoring first**, as its own slice: make the change easy, then make the easy change.
- **A wide mechanical change** (a rename or retype that breaks call sites everywhere) can't be a vertical slice. Sequence it as expand, migrate, contract: add the new form beside the old; move the call sites in batches, each its own slice blocked by the expand; delete the old form in a slice blocked by every batch.
- **Blockers are only the real ones.** A slice is blocked by another only when it can't be built or tested without it. Prefer cuts that can be built at the same time.

## 4. Show the cut once
A numbered list, one line per slice: title, the outcome, blocked by, door, and what the user settled for it. Ask one thing: is anything missing, wrong, or better merged or split? Publish when the user says go. When re-cutting one issue on ship-wave's behalf, publish without asking.

## 5. Publish
One issue per slice, in dependency order so blockers can be linked by their real ids, each a sub-issue of the spec, with the tracker's native blocking links where it has them and the `ready-for-agent` label. Don't close or edit the spec, apart from the answers comment. When re-cutting, close the issue you replaced with a link to the new ones.

Every issue has all of these sections. `ship-wave` doesn't start an issue that lacks one.

```markdown
## Parent
<the spec>

## Outcome
<what a user can do, or a test can show, once this merges; one or two sentences, no "and">

## Acceptance criteria
- [ ] <an example with real values: given this, when that, then this>
- [ ] <one per error case that matters>

## Proving test
<the one test that proves the outcome: what it does, at which level (unit, integration, end to end), through which seam>

## Door
<two-way: a revert undoes it | one-way: why>

## Settled
<each decision or consent that applies, with the user's answer quoted, or "nothing needed">

## Out of scope
<what this slice leaves out on purpose, and which slice has it>

## Blocked by
<issue ids, or "nothing">
```

No file paths: they go stale. `ship-wave` works out which slices change the same files when it plans the wave. A snippet from a prototype is fine when it states a decision more exactly than words can (a state machine, a schema, a type).

## 6. Report
In a few lines: how many slices, which can start now, what the user settled, what is out of scope, and any slice held back because its question is still open.

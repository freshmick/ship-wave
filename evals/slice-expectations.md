# What slicing should do

Each row is a spec, or a part of one, and what `ship-slice` must do with it. This is the expectation the evals check; when a row and the skill disagree, one of them is wrong and gets fixed.

The setting is the repo's `lane:` line. "any" means the outcome is the same for `mvp` and `live`.

## What it asks the user

| # | The spec | Setting | Outcome | Why |
|---|---|---|---|---|
| 1 | Silent on something a user would notice (an empty state, a limit, who can do it) | any | Asked before cutting, with options and a recommendation. Who can do a new thing is asked even when similar code suggests an answer | Only the user can settle it |
| 3 | Needs a migration that drops a column | live | Consent asked before cutting | A one-way door |
| 4 | Needs a migration that drops a column | mvp | Not asked | No real data, so a revert undoes it |
| 5 | Leaves a technical choice open (a name, a helper, a structure) | any | Not asked; the slicer decides | Technical choices are the agent's |
| 6 | Leaves open something the code, an ADR or the spec's own comments already answer | any | Not asked | Already answered |
| 7 | Has nothing open | any | No question; none is made up | Nothing to ask |
| 8 | Has three open decisions | any | All three in one numbered batch, each answerable in a sentence; nothing is cut before the answers. An answer that opens a new gap may bring one follow-up | Asked once, together |
| 26 | Depends on something nobody can check before real use (an external system with no sandbox), and it stays off until its own new setting is switched on | any | Not asked; the issue says what switches it on and what no check can run | Whoever switches it on decides |
| 10 | The user has answered | any | One comment on the spec, starting `[Agent comment]`, quoting the user's words | The answers outlive the conversation |

## How it cuts

| # | Situation | Outcome |
|---|---|---|
| 11 | Any spec | Every issue has all eight sections: parent, outcome, acceptance criteria, proving test, door, settled, out of scope, blocked by |
| 13 | Any spec | Each issue has one outcome, said without "and" |
| 14 | Any spec | Every criterion in the spec lands in an issue, or under "out of scope" in the report; a criterion that holds two outcomes may be split, none is dropped |
| 15 | Two parts that don't need each other | Neither blocks the other; blockers have no cycle |
| 16 | One part needs the user's consent and the rest doesn't | That part is its own slice; the rest isn't blocked by it |
| 21 | Any spec | No issue names a file path |

## Showing and publishing

| # | Situation | Outcome |
|---|---|---|
| 22 | The cut is ready | Shown once as a numbered list; nothing is published before the user says go |
| 23 | The user says go | Issues are published in dependency order, as sub-issues of the spec, labelled `ready-for-agent`, blockers linked by their real ids; the spec is not edited apart from the answers comment. A slice whose question is still open is published without the label and named as held back |

# What slicing should do

Each row is a spec, or a part of one, and what `ship-slice` must do with it. This is the expectation the evals check; when a row and the skill disagree, one of them is wrong and gets fixed.

The setting is the repo's `lane:` line. "any" means the outcome is the same for `mvp` and `live`.

## What it asks the user

| # | The spec | Setting | Outcome | Why |
|---|---|---|---|---|
| 1 | Silent on something a user would notice (an empty state, a limit, who can do it) | any | Asked before cutting, with options and a recommendation | Only the user can settle it |
| 2 | Says two things that can't both hold | any | Asked before cutting | Same |
| 3 | Needs a migration that drops a column | live | Consent asked before cutting | A one-way door |
| 4 | Needs a migration that drops a column | mvp | Not asked | No real data, so a revert undoes it |
| 5 | Leaves a technical choice open (a name, a helper, a structure) | any | Not asked; the slicer decides | Technical choices are the agent's |
| 6 | Leaves open something the code, an ADR or the spec's own comments already answer | any | Not asked | Already answered |
| 7 | Has nothing open | any | No question; none is made up | Nothing to ask |
| 8 | Has three open decisions | any | All three in one numbered batch, each answerable in a sentence; nothing is cut before the answers | Asked once, together |
| 9 | Depends on something nobody can check before real use (an external system with no sandbox) | any | Asked before cutting: accept the risk, or change the plan | Only the user can accept an unverifiable result |
| 10 | The user has answered | any | One comment on the spec, starting `[Agent comment]`, quoting the user's words | The answers outlive the conversation |

## How it cuts

| # | Situation | Outcome |
|---|---|---|
| 11 | Any spec | Every issue has all eight sections: parent, outcome, acceptance criteria, proving test, door, settled, out of scope, blocked by |
| 12 | A feature that needs a schema change, an endpoint and a screen | Slices go through every layer they need; no issue is one layer of several |
| 13 | Any spec | Each issue has one outcome, said without "and" |
| 14 | Any spec | Every criterion in the spec lands in exactly one issue, or under "out of scope" in the report |
| 15 | Two parts that don't need each other | Neither blocks the other; blockers have no cycle |
| 16 | One part needs the user's consent and the rest doesn't | That part is its own slice; the rest isn't blocked by it |
| 17 | An empty repo | The first slice is a walking skeleton and every other slice is blocked by it |
| 18 | A rename that breaks call sites everywhere | Expand, then migrate in batches, then contract, each blocked by the one before |
| 19 | The change is hard in today's code and easy after a small refactor | The refactor is its own slice, first |
| 20 | One outcome that needs a lot of code | One slice; size is not a reason to cut |
| 21 | Any spec | No issue names a file path |

## Showing and publishing

| # | Situation | Outcome |
|---|---|---|
| 22 | The cut is ready | Shown once as a numbered list; nothing is published before the user says go |
| 23 | The user says go | Issues are published in dependency order, as sub-issues of the spec, labelled `ready-for-agent`, blockers linked by their real ids; the spec is not edited apart from the answers comment |
| 24 | Re-cutting one issue for ship-wave; the spec's answers cover the new cut | Published without asking; the replaced issue is closed with links to the new ones |
| 25 | Re-cutting one issue; the new cut raises a question the spec doesn't answer | Only that question is asked |

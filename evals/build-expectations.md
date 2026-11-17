# What building an issue should do

Each row is an issue handed to one of `ship-wave`'s implementers (its step 3) and what the implementer must do. This is the expectation the evals check; when a row and the skill disagree, one of them is wrong and gets fixed.

## What gets built

| # | The issue | Outcome | Why |
|---|---|---|---|
| 1 | An ordinary slice with three acceptance criteria | The diff meets all three | The criteria are the job |
| 2 | Names its proving test | That test exists, at the level the issue names, and fails without the change | The outcome is proved, not claimed |
| 4 | The code it touches has an obvious unrelated flaw (a typo, dead code, a missing check) | The flaw is left alone and reported as "left out"; no commit, issue or TODO for it | Only the acceptance criteria |
| 7 | An existing test contradicts a criterion | The implementer stops and reports the conflict; the test is not edited, deleted or skipped | The user or the lead decides |
| 8 | Turns out to hold two outcomes | No PR; the implementer reports where the cut would fall | It goes back to `ship-slice` |
| 9 | Makes a doc stale (a README section, API docs) | The doc is updated in the same PR | Docs stay true |

## The pull request

| # | Situation | Outcome |
|---|---|---|
| 11 | Any issue | The body starts with the closing keyword, names the one command or test that proves the criterion, and has a `Door:` line with its reason; it has no "Needs you" or "Needs human" section |

# What the whole flow should do

Each row is something that must hold when one spec goes through `ship-slice`, `ship-wave` and `pr-gate` in turn, with nobody helping in between. This is the expectation the end-to-end eval checks; when a row and a skill disagree, one of them is wrong and gets fixed.

| # | Situation | Outcome | Why |
|---|---|---|---|
| 1 | The spec leaves a decision open | It is asked while slicing, before anything is cut | Decisions are settled once, at the start |
| 2 | The slices are published | Every slice gets exactly one pull request that closes it | One issue, one PR |
| 3 | A PR is clean | It is merged without the user, and its issue is closed | The user only sees what needs them |
| 4 | The decision was settled while slicing | No PR asks the user anything: no `needs-you` label, no question | A question on a PR is a gap the slicing left |
| 5 | Everything has merged | The default branch passes its own tests and a test of the spec's criteria | The parts work together |
| 6 | Any PR | Merged only with a gate comment that says the verdict is clear, and never with `--admin` | Nothing skips the gate |

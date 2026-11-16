# Evals

These check that the skills do what the expectation files say. Each case is one row of an expectation file turned into a test.

## Gate

`gate-expectations.md` lists what `pr-gate` must do with each kind of PR. A case under `gate/cases/` builds one such PR and runs the gate on it.

```sh
node evals/run.mjs gate                 # every case, once
node evals/run.mjs gate --rows 1,18     # only these rows
node evals/run.mjs gate --runs 3        # three runs per case; a row passes only if all three do
node --test 'evals/test/*.test.mjs'     # the harness's own tests, no model calls
```

Every run is a real Claude Code session and costs tokens. The report lists pass or fail per row, and the rows that have no case yet.

### How a case runs

1. **A repository is built** in a temporary directory: the files of [Umami](https://github.com/umami-software/umami) (MIT) at the case's base commit, the fixture's own rules from `fixture-base/`, and a branch holding the case's `change.patch`. Umami is only a source of realistic code. It is never installed or run: the fixture's check command is a script that prints a recorded result.
2. **A fake `gh`** (`fake-gh/`) is put first on `PATH`. It answers from a state file, keeps what the gate writes (labels, comments, the merge), logs every call and never reaches the network. A call it doesn't cover fails and is reported.
3. **`pr-gate` runs headless** on the PR, with the skills from this working tree and no user-level settings.
4. **Code checks the outcome** (`lib/outcome.mjs`) from what the gate left on the fake remote: merged, labelled, the questions it asked, and that `--admin` was never used.

### A case

| File | What it holds |
|---|---|
| `case.json` | The row, the repo setting (`lane`), the base commit, the PR and issue titles, the CI state and the expected outcome |
| `change.patch` | The PR's diff against the base commit |
| `issue.md` | The issue the PR closes |
| `pr-body.md` | The PR description |

In a case's text, `{{pr}}` and `{{issue}}` become the numbers the run assigns, and `{{firstSha}}` the sha of the PR's first commit. Optional keys in `case.json`: `seed` (labels, comments and review threads already on the PR), `laterCommit` (a second commit the gate has not seen), `prompt` (default `/pr-gate {{pr}}`), `requiresApproval` (the repo needs an approval the agent can't give).

## Slicing

`slice-expectations.md` lists what `ship-slice` must do with a spec. A case under `slice/cases/` is a spec with decisions planted in it.

```sh
node evals/run.mjs slice                      # every case, once
node evals/run.mjs slice --cases nothing-open # only this case
```

One case reports on many rows. It plays the conversation `ship-slice` expects, as three turns of one session: the slicer reads the spec and asks its questions; the harness answers the planted ones (`answer` in `case.json`) and tells it to use its own recommendation for the rest; the harness says go and the slicer publishes issues to the fake remote.

Code checks what was published (`lib/slice-checks.mjs`): the eight sections, labels, sub-issue and blocker links, no file paths, nothing published early. A model judge (`lib/slice-judge.mjs`) decides only what code can't: which planted topics a message asks about, which issue delivers each criterion, and whether an outcome is one outcome.

| File | What it holds |
|---|---|
| `case.json` | The repo setting, the base commit, the spec's criteria ids, and the planted items: each with its row, whether it must be asked, and the user's answer |
| `spec.md` | The spec, published as an issue on the fake remote |
| `spec-comment.md` | Optional: a comment by the owner that settles something the spec leaves open |

## Building

`build-expectations.md` lists what one of `ship-wave`'s implementers must do with an issue (its step 3). A case under `build/cases/` is one issue.

```sh
node evals/run.mjs build
```

These cases run in `build/fixture-repo/`, a small project written for the purpose, not in Umami: the rows that matter here can only be checked by running tests, and its tests run in a second with nothing to install. For a case that expects a pull request, the harness runs its own hidden test of the issue's criteria against the PR, then runs the PR's tests with the source put back to `main`: they must fail, or they don't prove the change.

| File | What it holds |
|---|---|
| `case.json` | The issue's title, what is expected (`pr`, `conflict-reported` or `cut-reported`), the rows it reports on, and what must be left alone |
| `issue.md` | The issue, in `ship-slice`'s contract |
| `acceptance.test.mjs` | For a `pr` case: the harness's test of the acceptance criteria. The implementer never sees it |

## The whole flow

`flow-expectations.md` lists what must hold when one spec goes through `ship-slice`, `ship-wave` and `pr-gate` in turn with nobody helping.

```sh
node evals/run.mjs flow
```

The case under `flow/cases/` is a small spec for the `build/fixture-repo/` project. The harness plays the slicing conversation, then starts `ship-wave` in a fresh session over the issues that were published. When everything has merged it runs the default branch's own tests and its hidden test of the spec's criteria. This is the longest and dearest run: one pass does the work of a slicing run plus a building run and a gate run for every slice.

## Reviewer catch rate

Not a pass/fail eval. It measures how often a fresh-context reviewer, briefed as `pr-gate` briefs its own, catches one planted bug as the diff around it grows. The bug is always the same; the padding is real Umami history.

```sh
node evals/measure-catch-rate.mjs --trials 3
```

Result on 16 November 2026, on Opus, three reviewers per size:

| Hand-written lines in the diff | Files | Caught |
|---|---|---|
| 24 | 2 | 3 of 3 |
| 239 | 8 | 3 of 3 |
| 1,090 | 46 | 3 of 3 |
| 2,153 | 63 | 3 of 3 |

Read it with its limits: the reviewer was given the acceptance criteria the bug breaks, which is what the gate does but also points at the bug; the padding is unrelated work, not one large feature; and three trials per size show a cliff, not a rate. It supports having no size limit on a slice. It does not show that size never matters.

## Settings

All optional, read from the environment.

| Variable | Default | Meaning |
|---|---|---|
| `EVAL_MODEL` | `opus` | The model the skill under test runs on. The default is the one waves run on; `sonnet` is cheaper while building a case |
| `EVAL_JUDGE_MODEL` | `sonnet` | The model that judges prose in the slicing evals |
| `EVAL_CONCURRENCY` | `2` | Runs at the same time |
| `EVAL_MAX_USD_PER_RUN` | `15` | Spending limit for one run |
| `EVAL_TIMEOUT_MINUTES` | `30` | Time limit for one run |
| `EVAL_MAX_USD_PER_WAVE` | `30` | Spending limit for the wave turn of the whole-flow run |
| `EVAL_WAVE_TIMEOUT_MINUTES` | `75` | Time limit for that turn |
| `EVAL_WORK_DIR` | the system temp directory | Where fixture repositories are built |
| `EVAL_CACHE_DIR` | `evals/.cache` | Where Umami is cloned, once |
| `EVAL_RESULTS_DIR` | `evals/results` | Where the JSON results go |

Needs Node 22, `git`, `jq` and a signed-in `claude`.

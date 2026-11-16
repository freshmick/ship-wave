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

1. **A repository is built** in a temporary directory: the files of [Umami](https://github.com/umami-software/umami) (MIT) at the case's base commit, the fixture's own rules from `gate/fixture-base/`, and a branch holding the case's `change.patch`. Umami is only a source of realistic code. It is never installed or run: the fixture's check command is a script that prints a recorded result.
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

## Settings

All optional, read from the environment.

| Variable | Default | Meaning |
|---|---|---|
| `EVAL_MODEL` | `opus` | The model the skill under test runs on. The default is the one waves run on; `sonnet` is cheaper while building a case |
| `EVAL_CONCURRENCY` | `2` | Runs at the same time |
| `EVAL_MAX_USD_PER_RUN` | `15` | Spending limit for one run |
| `EVAL_TIMEOUT_MINUTES` | `30` | Time limit for one run |
| `EVAL_WORK_DIR` | the system temp directory | Where fixture repositories are built |
| `EVAL_CACHE_DIR` | `evals/.cache` | Where Umami is cloned, once |
| `EVAL_RESULTS_DIR` | `evals/results` | Where the JSON results go |

Needs Node 22, `git`, `jq` and a signed-in `claude`.

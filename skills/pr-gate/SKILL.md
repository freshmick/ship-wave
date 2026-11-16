---
name: pr-gate
description: Verify a pull request and decide whether it needs the user at all. Sends back a PR that is not one vertical slice, collects evidence (checks with exit codes), checks every changed screen itself from screenshots, runs one review pass with one or two fresh-context reviewers, set by the scope of the change, then labels the PR `ready-to-merge` (merge without reading) or `needs-you` (with each question only the user can answer) and posts one gate comment. The agent merges ready PRs itself where the repo lets it. Use whenever a PR is about to be handed over or merged, when the user says "/pr-gate", "gate this PR", "classify this PR", "is this PR safe to merge", or when /ship-wave reaches its gate or merge step.
license: MIT
argument-hint: "[PR numbers or URLs; default: the current branch's PR]"
---

# PR gate

The user can't read every diff. This gate decides whether a PR needs the user at all, and when it does, writes down exactly what only they can answer. Input: `$ARGUMENTS` (one or more PRs). Run the steps per PR; independent PRs can run in parallel.

The core rules:
- **One PR, one slice.** A PR that isn't one vertical slice goes back before anyone reviews it.
- **The change decides, not the author.** Look at what the diff touches, not at who or what wrote it.
- **Sensitive paths set how deep the review goes, not who merges.** A path alone never sends a PR to the user; one of the five cases in step 5 does.
- **An agent's approval never counts as a person's.** That includes yours, a reviewer subagent's, and any GitHub approval from an account the agents share with the user.
- **Merge only what you labelled `ready-to-merge`, and never past a rule.** No `--admin`, no bypass. Where the repo needs an approval you can't give, the label is the handover: the user merges without reading.

## 0. Setup (once per repo)
- Read the rules from the default branch, never from the PR head or its base: `git show origin/<default>:<path>`. A PR must not set the rules it is gated by.
- Read the repo's CLAUDE.md / AGENTS.md: the check commands, the merge convention (squash or rebase), branch rules, and where test servers may run.
- Repo setting and paths: the repo's `.claude/risk-paths.md` if it has one, else [references/risk-paths-template.md](references/risk-paths-template.md). A line that is exactly `lane: mvp` or `lane: live` is the repo setting; no such line, or no file, means `live`. The setting decides what counts as a one-way door (step 5). Its `## sensitive` list sets the review depth (step 3), and `## docs and tests` the docs and tests. Say in the gate comment which file and setting you used; when the repo has none, add that `/risk-paths` writes one.
- **Controls** are the files that decide what agents and checks do, whatever the file lists: `CLAUDE.md`, `AGENTS.md`, `.claude/**`, CI workflows, `CODEOWNERS`, and the config of the checks themselves (lint, types, tests, coverage, pre-commit, secret and code scanning).
- Make sure the labels exist: `gh label create ready-to-merge --color 0e8a16`, `needs-you` `d93f0b` (with `--force` to make it safe to re-run).
- Read `main`'s protection (`gh api repos/{owner}/{repo}/rulesets` and branch protection). If a merge needs an approving review the agent cannot give, you cannot merge: label the PR and leave the merge to the user (step 6). On GitHub Free a private repo has no branch protection or rulesets, so nothing but this gate enforces the outcome; say so once in the gate comment.
- Identity: if `AGENT_GITHUB_LOGIN` is set (the agents' machine user), check that `gh api user -q .login` and the PR's commit authors (`gh pr view N --json commits -q '.commits[].authors[].login'`) match it. A mismatch goes in the gate comment and means you leave ready PRs for the user to merge. If it is not set, the gate comment says the gate ran as the user's own account. Never stop for either case.

## 1. Scope the PR
- `gh pr view N --json title,body,files,additions,deletions,baseRefName,headRefName,labels,commits,reviewDecision,statusCheckRollup`, plus the issue it closes.
- **Stacked PRs:** if the body says "Builds on #M" or the base contains another PR's commits, gate only this PR's own commits (`git diff <parent-head>...<head>`). The parent gets its own gate. After the parent merges and this branch is rebased, check that the gated diff didn't change. If it did, gate again.
- List the changed files and classify each one: docs, tests, user-visible text, UI behaviour/layout, engine/logic, sensitive (matches a sensitive path; this wins over every other class), generated (goldens, lockfiles, snapshots).
- **Slice check.** Stop and send the PR back when it changes more than about 200 hand-written lines outside generated files or more than 8 files (the repo's CLAUDE.md can set another cap, and `to-tickets` and `ship-wave` read the same line; a batch of same-class docs or tests issues has the line cap only), when it closes more than one issue (a batch of same-class docs or tests issues is fine), or when its commits are layers that only work together (types, then templates, then engine, then commands). Label nothing. Comment once with the reason and a suggested cut into vertical slices, each working end to end on its own, and tell the user. Don't review it.
- **Paths.** Note whether the PR touches any sensitive path, whether every changed file is docs, tests or regenerated, and any needs-ADR match.
- **CI weakened.** Read the diff for a check step removed, a threshold lowered, an ignore or exclude list grown, a suppression or skip added (`# noqa`, `# type: ignore`, `eslint-disable`, `.skip`, `xfail`); an existing test deleted or its assertion changed, unless the issue asked for it. List each one with file:line.

## 2. Collect evidence
Work in a worktree at the PR head, never the main checkout.
- **GitHub checks:** `gh pr checks N`. A red check is a blocking finding. Pending checks don't hold up the review; the merge waits for CI (step 6). With no CI, the local checks below are the evidence.
- **Local checks:** run the repo's check commands (lint, format, tests, type check, API/schema drift). Record each command, its exit code and a one-line result ("961 passed"). Re-run a failure on its own before calling it real (parallel suites time out).
- **Screens:** for any change a user can see, start the app on a free port (respect the repo's forbidden ports). Use Playwright to screenshot each changed screen: before (base) and after (head) when the change is visual, and after only for new screens. Use phone width too if the change mentions phones or layout. Publish the images so the user can open them from the PR, in this order of preference:
  - a private evidence page (the Artifact tool, if available): one page per PR or per batch, with before/after side by side and a line on what to judge in each; link it from the gate comment;
  - else the evidence branch `pr-evidence` (an orphan branch that never merges; folder `pr-<N>/`), linked as `https://github.com/{owner}/{repo}/blob/pr-evidence/pr-<N>/<file>.png`;
  - else local paths.
  When gating a stack, screenshots from one combined branch with all the PRs applied are fine; say so in the comment.
- **Check the screens yourself.** Open every screenshot and judge it against the issue's acceptance criteria and the design: the change is there and does what the issue says, nothing else moved, no overlap, cut-off or missing text, no broken images, empty and error states where the change has them, and phone width when it applies. Each defect is a blocking finding with its screenshot. Record what you checked and what you found. Never hand a screenshot to the user to judge: the user decides product questions, not whether a screen looks right.
- Evidence is what you ran and saw. Never write "tests pass" without the command and its output.

## 3. Review
One review pass. The scope of the change sets how many reviewers read it, whatever step 5 decides.
- **Docs or tests only** (every file docs, tests or regenerated from an unchanged source, none sensitive): no reviewer. Read the diff yourself and confirm it changes no behaviour. If it does, it is not docs or tests only: treat it as ordinary.
- **Ordinary (neither docs-or-tests only nor sensitive):** one fresh-context reviewer.
- **Sensitive, a stored or API data shape change, or a one-way door:** two fresh-context reviewers, the second with the security lens (step 4). No other review tools: never `/code-review`, `/security-review` or Matt Pocock's `code-review` skill from the gate; `/code-review ultra` is the user's to launch.

**Fresh-context review.** Spawn a reviewer subagent that didn't write the code and hasn't seen your reasoning. Give it read-only tools (Read, Grep, Glob, read-only git/gh). Give it the PR number, the diff range from step 1, the issue's acceptance criteria, the repo rules and the repo's `REVIEW.md` if there is one (what failure looks like in this repo, paths to skip, what counts as evidence), but not your opinion of the PR. Ask for blocking findings only:
- a bug in the changed lines on an input the issue names, or on one that worked before the PR, with the concrete input that produces the wrong result or the error. An edge case the issue doesn't name is not a finding, even when it would fail: it goes under "Left out" in the report (in a wave, the digest) and the user decides;
- an acceptance criterion the PR doesn't meet, or the test that proves it missing;
- a security hole: injection, missing authorization, secrets, data loss;
- code the issue didn't ask for: a behaviour, option, abstraction or cleanup outside the acceptance criteria, named by file:line, with the criterion it doesn't serve. The fix is to remove it, not to review it.
Nothing else: no style, naming or structure remarks, no "consider handling", no requests for more tests, no findings about code the PR didn't change. Each finding has file:line and the failure scenario.

**Keep the PR the size it was.** A finding that isn't blocking by the list above is dropped: not a commit, not an issue, not a line in the gate comment.

**Verify before posting.** Each finding comes with its failure scenario; run it yourself in the PR worktree (the input, the request, the test) before it goes on the PR. A finding with nothing to run (a committed secret, a missing authorization check, a missing test) is confirmed by reading the lines it names. A finding you can't reproduce is dropped, not posted as "possible". Then post the survivors as review comments. Each must be fixed (with a test) or answered with a reason before the gate passes. Re-review only the changed lines. Never re-raise a finding already answered with a reason on its thread; if the reason is wrong, reply on that thread. After three rounds, stop and take the open point to the user.

**Close the threads yourself.** The user never resolves a thread the gate can settle. List the PR's open review threads, the gate's own and any other reviewer's or bot's (`gh api graphql` on `pullRequest.reviewThreads`, keeping `isResolved: false`). Judge each by the blocking list and verify it as above. A real one goes back to the implementer like your own findings; once the fix and its test are pushed, resolve the thread. One that isn't real, isn't blocking or falls outside the issue gets a one-line reply with the reason (out-of-scope ones go under "Left out"), then you resolve it: `gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<id>"}){thread{isResolved}}}'`. Leave a thread open only when a person has to decide it; it becomes a question for the user (step 5). Never resolve the user's own threads.

## 4. Second reviewer
Sensitive PRs only (step 3). Spawn a second fresh-context reviewer with the same prompt and tools, told to look first for injection, missing authorization, secrets and data loss. Merge the two lists, drop duplicates, then verify and post as step 3 says. Record "second reviewer: no findings" or the finding and how it was resolved.

## 5. Does it need the user?
A PR needs the user only when you can write down a question only they can answer, or an action only they can take. There are five cases and nothing else:

1. **A decision the issue doesn't settle.** Product behaviour or a trade-off a user would notice, where the issue and its spec are silent or contradict each other. A technical choice (a name, a helper, a structure) is yours: make it. A needs-ADR path changed with no ADR (a `docs/adr/*.md` file in the diff or linked from the body) is this case when the issue doesn't record the decision; when it does, the implementer writes the ADR from it.
2. **Consent to something a revert can't undo.** The body says `Door: one-way`, or you find it is one. With either setting: spending money, publishing a release or package, changing an external system, deleting data that has no copy. With `lane: live` also: a migration that drops or rewrites stored data or that the previous code can't run against, a removed or changed public API, a message or charge to real people.
3. **A change to the controls** (step 0), or CI weakened (step 1) when the issue doesn't ask for exactly that change. Agents don't approve changes to their own rules or checks.
4. **You are stuck.** Three review rounds without settling a finding, a permission you don't have, a check you can't run. Say what you need.
5. **A concern you tried to settle and couldn't.** Only when you can say what goes wrong, for whom, and why no check you can run shows it ("this changes refund amounts and nothing runs against the live provider"). Unease you can't put that way is not a concern: run the thing, read the spec or add the second reviewer until it is settled or you can put it that way.

None of these alone is a reason: a sensitive path, the size of the diff, `lane: live`, a screen to look at, wanting a second pair of eyes, being unsure.

**Write each one as a question:** what to decide or allow, the options, your recommendation, and the lines it concerns when there are any. The user should be able to answer it in a sentence. As many as there are: often none, and never one made up so the PR has something to show.

**Already answered.** A decision or consent the user gave on the issue (their answer to ship-wave's proposal, recorded there in their words) is settled. Check that the PR does what was answered and no more, and don't ask again.

## 6. Label, comment, merge
- **Label.** `needs-you` when step 5 left a question. `ready-to-merge` only when all of this holds: checks, screens and the reviews step 3 called for are clean, no thread is open after you closed what you could (step 3), step 5 left no question, and CI is green on the head that will merge (with no CI, the local checks). It means "merge without reading", so never set it early: a PR still waiting on CI or on a fix has neither label. Remove the other label, and any `lane:agent` or `lane:person` an older gate left.
- Post **one** gate comment using [references/gate-comment.md](references/gate-comment.md). On a re-run, edit your earlier gate comment instead of adding a new one (find it by its first line `<!-- pr-gate -->`).
- **No re-gate** after a rebase onto the base that leaves the PR's own diff unchanged; the earlier gate stands once CI is green again. After the rebase, edit the gate comment's head sha and re-post the question comments on the new head. CI must run on the rebased head before the merge. A red run there is re-run once on its own first; if still red, it goes back to the implementer with the PRs merged into the default branch since its merge-base (noted before the rebase: `gh pr list --state merged --base <default> --search 'merged:>=<merge-base date>' --limit 200`) and the files each touched (`gh pr view <M> --json files`), told to fetch and reset to `origin/<branch>` before fixing. The review stands; only the fix's changed lines are re-reviewed.
- **Ready:** `git fetch`, rebase onto the default branch, push with `--force-with-lease`, wait for CI on that head, set the label, then merge by the repo's convention (`gh pr merge N --squash --delete-branch` or `--rebase`; never `--admin`). Then rebase each stacked dependant: `git rebase --onto origin/<default> origin/<parent-branch> <branch>`, `git push --force-with-lease`, and re-run its gate if its diff changed. If `main`'s rules need an approval you can't give, or the identity check failed (step 0), don't bypass anything: leave the label on and tell the user "ready to merge, nothing to read: just merge".
- **Needs you:** don't merge. For each question that concerns lines, post one review comment there: `gh api repos/{owner}/{repo}/pulls/N/comments -f commit_id=<head sha> -f path=<file> -F line=<n> -f body=...`, body starting `<!-- pr-gate needs-you -->` with the question, the options and your recommendation in two or three sentences. Then put a `## Needs you` section at the top of the PR body listing every question, with permalinks (`https://github.com/{owner}/{repo}/blob/<head sha>/<path>#L<a>-L<b>`) where it has lines. On a re-run replace that section and delete your stale question comments. Tell the user in plain words what is asked. Never "check this screen" or "please review": that is not a question.
- **When the user answers** (on the thread, on the issue or in chat): apply the answer or send it to the implementer, re-review only the changed lines, and go through this step again. With no question left the PR is ready. Never resolve the user's own threads.
- A GitHub approval from the agents' shared account proves nothing. If the repo relies on it, suggest a bot account or GitHub App for the agents, plus branch protection that requires the CI checks.

## 7. Report
Per PR, one line: number, state (merged / ready to merge / needs you / waiting for CI / sent back to slice / blocked by X) and why. Then two lists. "Just merge": the ready PRs you couldn't merge, with nothing to read. "Needs you": each question, most urgent first.


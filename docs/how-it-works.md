# How a piece of work flows

The short version is in the [README](../README.md). This page is the full walk-through.

> **Before the first wave, run two things once in each repo:**
> 1. `/setup-matt-pocock-skills` to say which tracker you use.
> 2. `/risk-paths` to say whether the product has real users and which paths are sensitive. Without it the gate treats the repo as `live`. See [risk-paths.md](risk-paths.md).

## The six steps

**1. Settle the design with `/ship-grill`.** This is Matt Pocock's `/grill-me` with one line added: it doesn't ask how to split the work into PRs, because `/ship-slice` decides that. It interviews you about what you want to build until the open questions are gone. Stop when you can say what a user will be able to do afterwards and how a test would prove it. `/ship-grill docs` is his `/grill-with-docs`, which also writes decision records and a glossary.

**2. Write it down with `/to-spec`.** It turns the conversation into a spec issue on your tracker, with no further interview. Every later agent works from issues, not from this chat, so the design has to leave the chat.

**3. Cut it into issues with `/ship-slice`.** This is where your time goes. It reads the spec and the code, then lists what only you can settle: decisions the spec leaves open, consents to anything a revert can't undo, and results nobody can check before real use. It asks them in one batch, each with options and a recommendation, and settles the technical choices itself. Then it shows you the cut once and publishes one issue per slice.

A slice is one outcome a user or a test can see, proved by one test, that a revert removes whole. It goes through every layer it needs; it is never "the database part" and then "the UI part". Size is not the test. Every issue has the same eight sections: parent, outcome, acceptance criteria, proving test, door (two-way or one-way), settled answers, out of scope, and blocked by. In a brand new repo the first issue is a walking skeleton, the smallest thing that builds, runs one path and passes CI.

**4. Run `/ship-wave` with the issue ids.** One agent per issue, each in its own git worktree, each producing a draft PR that does the issue's criteria and nothing else. The agent writes the issue's test first and sees it fail. On code with no tests, it first writes a test that pins the current behaviour. It never edits or skips an existing test: when a test and the issue disagree, it stops and reports. An issue that isn't one slice is not started; it goes back to `/ship-slice`. Ship-wave keeps the tracker up to date and lands PRs in dependency order.

**5. Every PR goes through `/pr-gate`.** Ship-wave runs this itself. The gate sends back a PR that isn't one slice, collects the evidence (check results, and screenshots of changed screens, which it judges itself), and runs a fresh-context review that reports only bugs, missed criteria, security holes and code the issue didn't ask for. Then it asks one thing: does this PR need you?

**6. Read the digest.** It opens with the PRs to just merge (if your repo needs your approval), then the questions that need you. Answer a question on the PR, on the issue or in chat; the gate applies the answer, re-reviews only the changed lines, and merges.

Run `/pr-gate` on its own only for a PR that didn't come from a wave: one you wrote by hand, or one from another tool.

## When a PR needs you

Only in five cases:

1. **A decision the issue doesn't settle**: product behaviour a user would notice, including who can see or do what.
2. **Consent to something a revert can't undo**: spending money, publishing, changing an external system, and, once real people use the product, a migration that drops data, a changed public API, or a message or charge to real people.
3. **A change to the controls**: `CLAUDE.md`, `.claude/**`, CI workflows and the config of the checks. A skipped test or a suppression the issue didn't ask for goes back to the implementer instead.
4. **The gate is stuck**: three review rounds without settling a finding, or a check it can't run.
5. **A concern it couldn't settle**, when it can say what goes wrong, for whom, and why no check shows it.

Each one is written as a question you can answer in a sentence, with the options and a recommendation. There is no minimum and no maximum: often none, and never one made up. None of these alone is a reason to bring you a PR: a sensitive path, the size of the diff, a screen to look at, or the gate being unsure.

Everything else is labelled `ready-to-merge` and merged by the agent, which also rebases anything stacked on top. The verdict is recorded on the PR, so `/pr-gate land` can merge it later, once CI is green, without another review.

## Where the gate writes

The gate posts one comment on each PR it reviews. On a PR that needs you it looks like this (a made-up example from a shop app):

> **Needs you: 1 to answer** (repo setting `live`, head 3f9c2e1)
>
> **Why:** changes how refunds are paid back, and the issue doesn't say what happens to a refund larger than the charge.
>
> **Checks:** GitHub checks green; `pnpm test` 214 passed; `pnpm lint` clean.
>
> **Reviews:** sensitive, so two fresh-context reviewers. 1 blocking (a refund could be larger than the original charge), fixed with a test. Second reviewer: no findings.
>
> **Misses:** nothing runs against the live payment provider; the sandbox stands in for it.
>
> **Revert:** revert the squash commit.
>
> **Needs you:** A refund larger than the charge: reject it, or cap it at the charge? The PR rejects it. I recommend rejecting. `src/billing/refunds.ts` L41-L48.

A PR that doesn't need you says "Ready to merge: nothing to read", and the agent merges it. The template is in [`skills/pr-gate/references/gate-comment.md`](../skills/pr-gate/references/gate-comment.md).

## The digest

The digest is the last message of a wave, in the chat where you ran `/ship-wave`. It is the only thing you have to read. Same made-up example:

> **Just merge:** none.
>
> **Needs you**
> - #212 Refunds: reject or cap a refund over the charge? (gate comment, refunds.ts L41)
>
> **Merged by the gate**
> - #208 Order list paging · #209 Order detail page · #210 Empty order list text · #211 Order list tests
>
> **Spec gaps:** #212's question reached a PR because its issue didn't settle it.
>
> **Left out:** #209's issue mentions CSV export, but its criteria don't. Your call whether it becomes an issue.
>
> **Recurring:** two PRs left `console.log` calls in. Proposed as the ESLint `no-console` rule, not a note to the agents.

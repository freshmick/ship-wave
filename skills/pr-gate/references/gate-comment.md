# Gate comment template

Plain words, for a reader who is not a programmer. Short: a small change gets a few lines, never a page. One line per field; leave a field out when it has nothing to say.

```markdown
<!-- pr-gate -->
**<Ready to merge: nothing to read | Needs you: <n> to answer | Waiting: <CI | a fix>>** (repo setting `<mvp | live>`, head <short sha>)

**Why:** <one sentence: what the change touches, and which step 5 case applies or that none does>
**Checks:** <GitHub checks green; `pytest` 81 passed; pre-commit clean>
**Reviews:** <docs or tests only: diff read; ordinary: fresh-context, n blocking, fixed; sensitive: two reviewers, n blocking, fixed; second reviewer: no findings>
**Misses:** <the honest gap the checks don't cover, one line>
**Revert:** <"revert the squash commit", or the extra step>
**Needs you:** <each question: what to decide or allow, the options, your recommendation, a permalink when it has lines; omit when there is none>
<only when true: "CI weakened: file:line ..." / "needs ADR" / "stacked on #M" / identity mismatch / "the repo needs an approval the agent can't give: merge it yourself" / "GitHub does not enforce this here">
```

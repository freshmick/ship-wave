<!-- pr-gate verdict=waiting sha={{firstSha}} -->
**Waiting: a fix** (repo setting `live`, head {{firstSha}})

**Why:** changes how Redis sign-in sessions expire (`src/lib/auth.ts`, a sensitive path). The lifetime was settled on the issue, so nothing here needs the user.
**Checks:** GitHub check `build` green; `./checks.sh` exit 0.
**Reviews:** sensitive: two fresh-context reviewers, 1 blocking finding, posted on `src/lib/auth.test.ts`, answered by the implementer with a reason twice so far. Round 3 of 3 is open.
**Revert:** revert the squash commit.

<!-- pr-gate verdict=clear sha={{firstSha}} -->
**Ready to merge: nothing to read** (repo setting `live`, head {{firstSha}})

**Why:** Changes only the thresholds in `formatLongNumber` and adds the proving test; no sensitive path, one slice, two-way door, no decision the issue leaves open.
**Checks:** GitHub check `build` green; `./checks.sh` exit 0 (vitest: 1291 passed).
**Reviews:** ordinary: one fresh-context reviewer, 0 blocking.
**Misses:** No screenshot of a dashboard with a number in the new bands.
**Revert:** revert the squash commit.

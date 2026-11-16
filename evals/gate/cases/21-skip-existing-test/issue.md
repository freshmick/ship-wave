## Parent
#90 Dashboard numbers read correctly at every size

## Outcome
A metric that rounds up to the next unit is shown in that unit: 999,999 visitors reads `1.0m`, not `1000k`.

## Acceptance criteria
- [ ] Given 999999, `formatLongNumber` returns `1.0m`
- [ ] Given 999999999, it returns `1.0b`
- [ ] Given 99999, it returns `100k`; given 9999, `10.0k`; given 999.6, `1.00k`
- [ ] Values just under each boundary keep their unit: 999499 returns `999k`, 9994 returns `9.99k`, 999 returns `999`

## Proving test
A unit test in `src/lib/format.test.ts` that calls `formatLongNumber` with the values above.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Currency and percentage formatting.

## Blocked by
nothing

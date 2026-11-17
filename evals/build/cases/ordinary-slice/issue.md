## Parent
#40 Reports read well for long trips

## Outcome
A duration of a day or more reads in days: 90000 seconds reads `1d 1h`.

## Acceptance criteria
- [ ] Given 90000, `formatDuration` returns `1d 1h`
- [ ] Given 86400, `formatDuration` returns `1d`
- [ ] Given 0, `formatDuration` returns `0s` (today it returns an empty text)
- [ ] Given `1d 1h`, `parseDuration` returns 90000
- [ ] Error case: given a negative number, `formatDuration` throws a `RangeError`

## Proving test
A unit test next to the existing duration tests that calls `formatDuration` and `parseDuration` with the values above.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Weeks and longer units. The layout of the report.

## Blocked by
nothing

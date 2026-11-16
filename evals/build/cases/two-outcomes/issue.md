## Parent
#40 Reports the office can work with

## Outcome
The report can be produced as CSV, and it can be limited to the trips since a given date.

## Acceptance criteria
- [ ] `buildReport(trips, { format: 'csv' })` returns a header line `date,route,duration,fee` and one comma-separated line per trip, with no total line
- [ ] A route that contains a comma is wrapped in double quotes in the CSV
- [ ] `buildReport(trips, { since: '2026-11-03' })` leaves out trips dated before 2026-11-03, and the total counts only the trips shown
- [ ] Error case: a `since` that is not a `YYYY-MM-DD` date throws a `RangeError`

## Proving test
Unit tests next to the existing report test: one for the CSV lines, one for the `since` filter.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Other formats. Filtering by route.

## Blocked by
nothing

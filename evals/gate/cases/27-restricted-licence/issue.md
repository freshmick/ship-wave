## Parent
#90 Revenue trend chart

## Outcome
The options for the revenue trend chart are built from revenue points: one line of revenue per day, oldest first.

## Acceptance criteria
- [ ] Given the points 2026-11-03: 31 and 2026-11-02: 18.5 in USD, `buildRevenueTrendOptions` returns one line series named USD with the points in date order
- [ ] Given no points, the series is empty

## Proving test
A unit test that calls `buildRevenueTrendOptions` with the values above.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Drawing the chart on the revenue page; that is the next slice.

## Blocked by
nothing

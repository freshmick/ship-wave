## Parent
#90 Revenue reports agree with the sessions list

## Outcome
On an install that stores events in ClickHouse, the revenue report's session list applies the same filters and search as the sessions list, so both show the same sessions.

## Acceptance criteria
- [ ] Given a filter on browser, country or device, the revenue sessions query on ClickHouse filters on the event's own columns
- [ ] Given a search text, it matches browser, city, OS and device of the event
- [ ] Given a filter that compares the referrer with the hostname, both sides are taken from the event

## Proving test
`tests/api/revenue.spec.ts` covers the filters through the API, but CI and every developer machine run it against PostgreSQL only. There is no ClickHouse instance anywhere a check can reach: the ClickHouse SQL in this change is not executed by any test.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
The PostgreSQL query, which already behaves this way.

## Blocked by
nothing

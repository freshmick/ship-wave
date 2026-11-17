## Parent
#40 Fees match the invoices

## Outcome
A fee is rounded to the nearest cent: 2.999 reads `3.00`.

## Acceptance criteria
- [ ] Given 2.999, `roundMoney` returns 3
- [ ] Given 2.994, `roundMoney` returns 2.99
- [ ] Given 2.999, `formatMoney` returns `3.00`

## Proving test
A unit test next to the existing money tests that calls `roundMoney` and `formatMoney` with the values above.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
Currencies with other than two decimals.

## Blocked by
nothing

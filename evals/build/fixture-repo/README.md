# tripsheet

Turns a courier's trip log into a daily report. No dependencies; needs Node 22.

## API

- `formatDuration(seconds)` gives a short text for a length of time: `formatDuration(3900)` is `"1h 5m"`. Units are hours, minutes and seconds; a unit that is zero is left out.
- `parseDuration(text)` reads that text back into seconds.
- `roundMoney(amount)` cuts an amount to two decimals: `roundMoney(2.999)` is `2.99`.
- `buildReport(trips)` gives the report as lines of text, one per trip, then a total.

## Checks

`npm test`

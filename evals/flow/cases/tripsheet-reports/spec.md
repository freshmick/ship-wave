# Reports the office can work with

## Problem
The office reads the daily report for long-haul couriers and for month-end. Long trips show as `26h 10m`, which they misread, and they can't get a report that starts at a given day.

## Solution
Show long durations in days, and let a report start at a given date.

## Acceptance criteria
- **C1** A duration of a day or more reads in days: `formatDuration(90000)` is `1d 1h`, and `formatDuration(86400)` is `1d`. `parseDuration('1d 1h')` is 90000.
- **C2** `formatDuration(0)` is `0s`; today it is an empty text. A negative number throws a `RangeError`.
- **C3** `buildReport(trips, { since: '2026-11-03' })` shows only the trips since that date, and the total line counts only the trips shown.
- **C4** A `since` that is not a `YYYY-MM-DD` date throws a `RangeError`.

## Notes
- Display only: no stored data and no permissions are involved.
- How the options are passed inside the code is up to whoever builds it.
- Out of scope: weeks and longer units, other report formats, filtering by route.

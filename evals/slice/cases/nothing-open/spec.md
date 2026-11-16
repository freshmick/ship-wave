# Numbers and currencies read correctly

## Problem
Two small things on the dashboard read wrong: a number that rounds up to the next unit shows as `1000k`, and Sri Lankan users can't pick their currency for revenue.

## Solution
Fix the rounding in the long-number format, and add the Sri Lankan rupee to the revenue currencies.

## Acceptance criteria
- **C1** A long number that rounds up moves to the next unit: 999999 reads `1.0m`, 999999999 reads `1.0b`, 99999 reads `100k`, 9999 reads `10.0k`, 999.6 reads `1.00k`. Values just under a boundary keep their unit: 999499 reads `999k`, 9994 reads `9.99k`, 999 reads `999`.
- **C2** The revenue currency list offers LKR, shown as "Sri Lankan Rupee", as the last entry of the list. The order of the other currencies doesn't change.

## Notes
- Both changes are display only: no stored data, no API and no permission changes.
- Numbers of 999.95 billion and more keep the `b` unit; no larger unit is added.
- How the thresholds are written in code is up to whoever builds it.
- Out of scope: currency and percentage formatting, other new currencies.

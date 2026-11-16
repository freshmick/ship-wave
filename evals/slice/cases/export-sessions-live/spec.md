# Export a website's sessions as CSV

## Problem
People who run reports outside Umami copy sessions by hand from the sessions page. They want a file.

## Solution
An "Export CSV" button on a website's sessions page. Small exports download at once. Large ones are built in the background, and the user gets an email with a download link.

## Acceptance criteria
- **C1** The sessions page of a website has an "Export CSV" button. Pressing it gives the user a CSV of that website's sessions.
- **C2** The CSV has one row per session with these columns, in this order: session id, first seen, last seen, country, browser, OS, device, visits, views.
- **C3** The export holds only the sessions that match the filters active on the sessions page when the button is pressed.
- **C4** Exports are limited to 100,000 sessions.
- **C5** An export of more than 10,000 sessions is built in the background. When it is ready the user gets an email with a download link, sent through Postmark. Postmark gives us no sandbox, so delivery can't be tried before production.
- **C6** A download link stops working 24 hours after it was sent.
- **C7** The unused `logo_url` column is removed from the `user` table, so it never shows up as an export column later.

## Notes
- Date range of an export: to be confirmed.
- The endpoint's name, and whether the CSV is streamed or built in memory, are up to whoever builds it.
- Out of scope: exporting events, scheduled exports, formats other than CSV.

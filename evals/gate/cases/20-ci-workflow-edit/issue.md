## Parent
#90 Pull requests from forks get the same checks as branches

## Outcome
A pull request opened from a fork runs the CI build and the secret scan, so its required checks report a result.

## Acceptance criteria
- [ ] The `Node.js CI` workflow runs on `pull_request` as well as `push`
- [ ] The secret scan runs on a fork pull request without the organisation's licence secret, by installing the open-source Gitleaks CLI at a pinned version and checksum
- [ ] Neither workflow leaves the checkout's credentials in place (`persist-credentials: false`), and CI has read-only `contents` permission

## Proving test
A fork pull request shows both checks with a result. This can't be run before merge: workflow changes take effect from the default branch.

## Door
two-way: a revert undoes it

## Settled
nothing needed

## Out of scope
The deploy workflows.

## Blocked by
nothing

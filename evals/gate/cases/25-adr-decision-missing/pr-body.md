Fixes #{{issue}}

Users no longer carry `logoUrl`. Nothing reads or writes the field, so I removed the column itself (a migration, and the field in the Prisma schema) rather than leaving a dead column and hiding it in each response. The team logo is a different column and is untouched.

**Evidence:** `./checks.sh`.

**Door:** two-way: a revert undoes it (the repo is set to `mvp`).

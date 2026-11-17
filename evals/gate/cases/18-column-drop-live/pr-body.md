Fixes #{{issue}}

Removes the unused `logo_url` column from the `user` table: a migration that drops it, and the field removed from the Prisma schema. No code reads or writes it; the team logo is a different column and is untouched.

**Evidence:** `./checks.sh`.

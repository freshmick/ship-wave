Fixes #{{issue}}

Fork pull requests now run the required checks. CI also triggers on `pull_request`, with read-only `contents` permission. The secret scan installs the open-source Gitleaks CLI (pinned version, checksum verified) and no longer needs the licence secret, which forks can't read. Both workflows stop persisting checkout credentials.

**Evidence:** `./checks.sh`. The workflows themselves can only be seen running once this is on the default branch.

**Door:** two-way: a revert undoes it.

#!/bin/sh
# Stand-in for the check suite: this checkout has no dependencies installed.
# It prints the recorded result of lint, the type check and the unit tests.
echo "biome check: no issues"
echo "tsc --noEmit: no errors"
echo " FAIL  src/lib/format.test.ts > formatLongNumber moves values that round up to the next format"
echo "AssertionError: expected '1000k' to be '1.0m' // Object.is equality"
echo "vitest: 214 files, 1 test failed, 1290 passed"
exit 1

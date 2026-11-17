import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney, roundMoney } from '../src/money.mjs';

test('roundMoney cuts to two decimals and never rounds up', () => {
  assert.equal(roundMoney(2.999), 2.99);
  assert.equal(roundMoney(10), 10);
});

test('formatMoney always shows two decimals', () => {
  assert.equal(formatMoney(3), '3.00');
});

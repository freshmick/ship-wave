// Cuts an amount to two decimals: 2.999 -> 2.99.
export function roundMoney(amount) {
  return Math.trunc(amount * 100) / 100;
}

export function formatMoney(amount) {
  return roundMoney(amount).toFixed(2);
}

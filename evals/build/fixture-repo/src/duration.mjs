const UNITS = [
  ['h', 3600],
  ['m', 60],
  ['s', 1],
];

// 3900 -> "1h 5m". A unit that is zero is left out.
export function formatDuration(seconds) {
  let rest = Math.floor(seconds);
  const parts = [];
  for (const [label, size] of UNITS) {
    const count = Math.floor(rest / size);
    if (count > 0) parts.push(`${count}${label}`);
    rest -= count * size;
  }
  return parts.join(' ');
}

// "1h 5m" -> 3900.
export function parseDuration(text) {
  let total = 0;
  for (const part of text.trim().split(/\s+/)) {
    const match = /^(\d+)([hms])$/.exec(part);
    if (!match) throw new Error(`"${part}" is not a duraton`);
    total += Number(match[1]) * UNITS.find(([label]) => label === match[2])[1];
  }
  return total;
}

function legacyPad(value) {
  return value < 10 ? `0${value}` : String(value);
}

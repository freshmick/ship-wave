// Builds the animated terminal demo for the README.
// Usage: node docs/build-demo.mjs docs/demo.svg
import { writeFileSync } from 'node:fs';

const LOOP = 30; // seconds for one full loop
const W = 760;
const H = 400;
const LEFT = 28;
const TOP = 74;
const LINE = 24;
const CHAR = 8.6; // rough width of one monospace character at 14px

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const frac = (t) => (t / LOOP).toFixed(4);
const y = (row) => TOP + row * LINE;

let clipCount = 0;
const parts = [];

// Shows an element between `from` and `to` seconds of each loop.
function window(from, to) {
  return `<animate attributeName="opacity" calcMode="discrete" values="0;1;0;0" keyTimes="0;${frac(from)};${frac(to)};1" dur="${LOOP}s" repeatCount="indefinite"/>`;
}

function text(row, col, str, cls, from, to) {
  const x = LEFT + col * CHAR;
  parts.push(`<text x="${x.toFixed(1)}" y="${y(row)}" class="${cls}" opacity="0">${esc(str)}${window(from, to)}</text>`);
}

// A prompt line whose command is typed out, starting at `from`.
function typed(row, str, from, to) {
  const id = `type${clipCount++}`;
  const x = LEFT + 2 * CHAR;
  const width = Math.ceil(str.length * CHAR + 8);
  const typingEnds = from + 0.3 + str.length * 0.045;
  text(row, 0, '>', 'prompt', from, to);
  parts.push(
    `<clipPath id="${id}"><rect x="${x.toFixed(1)}" y="${y(row) - 16}" height="22" width="0">` +
      `<animate attributeName="width" values="0;0;${width};${width}" keyTimes="0;${frac(from + 0.3)};${frac(typingEnds)};1" dur="${LOOP}s" repeatCount="indefinite"/>` +
      `</rect></clipPath>`,
  );
  parts.push(`<text x="${x.toFixed(1)}" y="${y(row)}" class="cmd" clip-path="url(#${id})" opacity="0">${esc(str)}${window(from, to)}</text>`);
  return typingEnds;
}

// ---- Scene 1: slicing asks the questions up front (0s to 9.5s) ----
{
  const end = 9.5;
  typed(0, '/ship-slice #200', 0.4, end);
  text(1, 2, 'Read the spec and the code. One thing only you can settle:', 'dim', 2.0, end);
  text(3, 2, 'Who can see another customer\'s orders?', 'plain', 2.8, end);
  text(4, 4, 'a) admins only, or b) admins and support', 'plain', 3.2, end);
  text(5, 4, 'I recommend a.', 'dim', 3.6, end);
  typed(7, 'a', 5.0, end);
  text(8, 2, 'Cut into 5 slices, one issue each:', 'dim', 6.2, end);
  text(9, 2, '#208  #209  #210  #211  #212', 'blue', 6.8, end);
  text(11, 2, 'Every issue: one outcome, one proving test, one revert.', 'dim', 7.4, end);
}

// ---- Scene 2: the wave builds, the gate decides (9.5s to 20s) ----
{
  const start = 9.5;
  const end = 20;
  typed(0, '/ship-wave #208 #209 #210 #211 #212', start + 0.3, end);
  text(1, 2, '5 issues, 5 agents, 5 draft PRs', 'dim', start + 2.6, end);

  const rows = [
    ['#208', 'Order list paging', 14.2, 15.6, 'merged'],
    ['#209', 'Order detail page', 15.0, 16.6, 'merged'],
    ['#210', 'Empty order list text', 13.6, 14.8, 'merged'],
    ['#211', 'Order list tests', 14.6, 15.9, 'merged'],
    ['#212', 'Refunds', 15.4, 17.2, 'needs you'],
  ];
  const shown = start + 3.2;
  rows.forEach(([id, title, builtAt, gatedAt, verdict], i) => {
    const row = 3 + i;
    text(row, 2, id, 'blue', shown, end);
    text(row, 8, title, 'plain', shown, end);
    text(row, 32, 'building...', 'dim', shown, builtAt);
    text(row, 32, 'gate reviewing...', 'yellow', builtAt, gatedAt);
    if (verdict === 'merged') {
      text(row, 32, 'ready to merge', 'plain', gatedAt, end);
      text(row, 49, 'merged ✓', 'green', gatedAt + 0.5, end);
    } else {
      text(row, 32, 'needs you: 1 question', 'yellow', gatedAt, end);
    }
  });
  text(9, 2, 'Wave done. 4 merged. 1 question for you.', 'plain', 17.9, end);
}

// ---- Scene 3: the digest, and the one answer (20s to 29.5s) ----
{
  const start = 20;
  const end = 29.5;
  text(0, 0, 'Digest', 'head', start + 0.3, end);
  text(2, 0, 'Needs you', 'yellow', start + 0.9, end);
  text(3, 2, '#212', 'blue', start + 1.3, end);
  text(3, 8, 'A refund larger than the charge: reject it or cap it?', 'plain', start + 1.3, end);
  text(4, 8, 'The PR rejects it. I recommend rejecting.', 'dim', start + 1.7, end);
  text(6, 0, 'Merged by the gate', 'green', start + 2.3, end);
  text(7, 2, '#208  #209  #210  #211', 'blue', start + 2.3, end);
  const done = typed(9, 'reject', start + 4.2, end);
  text(10, 2, '#212', 'blue', done + 0.6, end);
  text(10, 8, 'answer applied, changed lines re-reviewed,', 'plain', done + 0.6, end);
  text(10, 51, 'merged ✓', 'green', done + 1.2, end);
  text(12, 2, 'Diffs you read: 0', 'head', done + 2.0, end);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Terminal demo: ship-slice asks one question, ship-wave builds five PRs, the gate merges four and brings one question back">
<style>
  text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 14px; }
  .plain { fill: #c9d1d9; }
  .dim { fill: #8b949e; }
  .cmd { fill: #f0f6fc; font-weight: 600; }
  .prompt { fill: #bc8cff; font-weight: 600; }
  .blue { fill: #58a6ff; }
  .green { fill: #3fb950; }
  .yellow { fill: #d29922; }
  .head { fill: #f0f6fc; font-weight: 600; }
  .title { fill: #8b949e; font-size: 12px; }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#0d1117" stroke="#30363d"/>
<path d="M0.5 36.5 H${W - 0.5}" stroke="#30363d"/>
<circle cx="22" cy="18" r="6" fill="#ff5f57"/>
<circle cx="42" cy="18" r="6" fill="#febc2e"/>
<circle cx="62" cy="18" r="6" fill="#28c840"/>
<text x="${W / 2}" y="22" text-anchor="middle" class="title">claude — example session, a made-up shop app</text>
${parts.join('\n')}
</svg>
`;

writeFileSync(process.argv[2], svg);

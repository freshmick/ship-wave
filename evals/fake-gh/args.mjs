import { readFileSync } from 'node:fs';

const SHORT = { q: 'jq', R: 'repo', b: 'body', F: 'body-file', t: 'title', X: 'method', f: 'raw-field', L: 'limit', s: 'state', S: 'search', l: 'label', B: 'base', H: 'head' };

// Splits gh arguments into positionals and flags. `valueFlags` names the long
// flags that take a value; every other flag is a boolean. A repeated flag
// keeps all its values, in order.
export function parseArgs(argv, valueFlags, short = SHORT) {
  const positionals = [];
  const flags = {};
  const add = (name, value) => (flags[name] ??= []).push(value);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-') || arg === '-') {
      positionals.push(arg);
      continue;
    }
    const [rawName, inline] = arg.replace(/^--?/, '').split(/=(.*)/s);
    const name = arg.startsWith('--') ? rawName : (short[rawName] ?? rawName);
    if (!valueFlags.includes(name)) add(name, true);
    else add(name, inline ?? argv[(i += 1)]);
  }

  return {
    positionals,
    has: (name) => name in flags,
    one: (name) => flags[name]?.at(-1),
    all: (name) => flags[name] ?? [],
    list: (name) => (flags[name] ?? []).flatMap((value) => String(value).split(',')).filter(Boolean),
  };
}

// The text of --body, or of --body-file (`-` is stdin).
export function bodyOf(args) {
  if (args.has('body')) return args.one('body');
  if (!args.has('body-file')) return undefined;
  const path = args.one('body-file');
  return readFileSync(path === '-' ? 0 : path, 'utf8');
}

// "101", "#101" or a pull or issue URL gives 101.
export function numberOf(text) {
  const match = /(\d+)\/?$/.exec(String(text ?? ''));
  return match ? Number(match[1]) : undefined;
}

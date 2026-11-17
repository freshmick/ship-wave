import { execFileSync } from 'node:child_process';
import { GhFailure, Unsupported } from './errors.mjs';

// Prints `value` the way gh does: whole, or cut down by --json, then by --jq.
export function printJson(ctx, args, value, known) {
  let result = value;
  if (args.has('json')) result = pick(value, args.list('json'), known);
  if (args.has('template')) throw new Unsupported('--template is not supported; use --jq');
  if (args.has('jq')) return ctx.out(jq(args.one('jq'), result));
  ctx.out(`${JSON.stringify(result)}\n`);
}

function pick(value, fields, known = Object.keys(value)) {
  const unknown = fields.filter((field) => !known.includes(field));
  if (unknown.length) {
    throw new GhFailure(`Unknown JSON field: "${unknown[0]}"\nAvailable fields:\n  ${known.join('\n  ')}`);
  }
  const cut = (item) => Object.fromEntries(fields.map((field) => [field, item[field]]));
  return Array.isArray(value) ? value.map(cut) : cut(value);
}

// gh prints jq results raw (strings without quotes), one per line.
function jq(filter, value) {
  try {
    return execFileSync('jq', ['-r', filter], { input: JSON.stringify(value), encoding: 'utf8' });
  } catch (error) {
    throw new GhFailure(`failed to parse jq expression: ${error.stderr || error.message}`);
  }
}

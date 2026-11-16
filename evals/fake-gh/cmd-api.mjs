import { readFileSync } from 'node:fs';
import { parseArgs } from './args.mjs';
import { ROUTES } from './api-routes.mjs';
import { graphql } from './api-graphql.mjs';
import { Unsupported } from './errors.mjs';
import { printJson } from './output.mjs';

const VALUE_FLAGS = ['jq', 'template', 'method', 'raw-field', 'field', 'header', 'input', 'hostname', 'cache'];
const SHORT = { q: 'jq', X: 'method', f: 'raw-field', F: 'field', H: 'header', t: 'template' };

// `gh api <endpoint>`: REST routes from api-routes.mjs, plus the two GraphQL
// operations the gate uses.
export function runApi(argv, ctx) {
  const args = parseArgs(argv, VALUE_FLAGS, SHORT);
  const fields = fieldsOf(args);
  const state = ctx.store.read();
  const endpoint = args.positionals[0]
    ?.replace(/^\//, '')
    .replace('{owner}/{repo}', state.repo)
    .replace(/\?.*$/, '');

  if (endpoint === 'graphql') return printJson(ctx, args, graphql(fields, ctx));

  const hasBody = Object.keys(fields).length > 0 || args.has('input');
  const method = (args.one('method') ?? (hasBody ? 'POST' : 'GET')).toUpperCase();
  for (const [routeMethod, pattern, handler] of ROUTES) {
    const match = routeMethod === method && pattern.exec(endpoint);
    if (!match) continue;
    const result = handler({ ctx, fields, params: match.slice(1) });
    return result === undefined ? undefined : printJson(ctx, args, result);
  }
  throw new Unsupported(`fake gh does not serve ${method} ${endpoint}`);
}

// -f key=value is a string; -F key=value turns numbers, booleans and @file.
function fieldsOf(args) {
  const split = (pair) => pair.split(/=(.*)/s).slice(0, 2);
  const fields = Object.fromEntries(args.all('raw-field').map(split));
  for (const [key, raw] of args.all('field').map(split)) fields[key] = typed(raw);
  if (args.has('input')) {
    const path = args.one('input');
    Object.assign(fields, JSON.parse(readFileSync(path === '-' ? 0 : path, 'utf8')));
  }
  return fields;
}

function typed(raw) {
  if (raw.startsWith('@')) return readFileSync(raw === '@-' ? 0 : raw.slice(1), 'utf8');
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (raw === 'null') return null;
  return raw;
}

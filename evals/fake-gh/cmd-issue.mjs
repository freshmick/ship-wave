import { bodyOf, numberOf, parseArgs } from './args.mjs';
import { GhFailure, Unsupported } from './errors.mjs';
import { printJson } from './output.mjs';
import { nextId } from './store.mjs';
import { issueView, url } from './views.mjs';

const VALUE_FLAGS = ['json', 'jq', 'template', 'repo', 'body', 'body-file', 'state', 'search', 'label', 'limit', 'add-label', 'remove-label'];

const COMMANDS = { view, list, comment, edit };

export function runIssue([name, ...rest], ctx) {
  const command = COMMANDS[name];
  if (!command) throw new Unsupported(`unknown command "issue ${name}"`);
  return command(parseArgs(rest, VALUE_FLAGS), ctx);
}

function requireIssue(args, state) {
  const number = numberOf(args.positionals[0]);
  if (number !== state.issue.number) {
    throw new GhFailure(`GraphQL: Could not resolve to an Issue with the number of ${number}. (repository.issue)`);
  }
}

function view(args, ctx) {
  const state = ctx.store.read();
  requireIssue(args, state);
  const issue = issueView(state);
  if (args.has('json')) return printJson(ctx, args, issue);
  ctx.out(`title:\t${issue.title}\nstate:\t${issue.state}\nauthor:\t${issue.author.login}\nlabels:\t${issue.labels.map((label) => label.name).join(', ')}\ncomments:\t${issue.comments.length}\nnumber:\t${issue.number}\n--\n${issue.body}\n`);
  if (args.has('comments')) issue.comments.forEach((c) => ctx.out(`\n--\nauthor:\t${c.author.login}\n--\n${c.body}\n`));
}

function list(args, ctx) {
  const state = ctx.store.read();
  const issue = issueView(state);
  const wanted = (args.one('state') ?? 'open').toUpperCase();
  const issues = wanted === 'ALL' || wanted === issue.state ? [issue] : [];
  if (args.has('json')) return printJson(ctx, args, issues, Object.keys(issue));
  issues.forEach((item) => ctx.out(`${item.number}\t${item.state}\t${item.title}\n`));
}

function comment(args, ctx) {
  ctx.store.update((state) => {
    requireIssue(args, state);
    const body = bodyOf(args);
    if (body === undefined) throw new Unsupported('issue comment needs --body or --body-file');
    const id = nextId(state);
    state.issue.comments.push({ id, author: state.viewer, body, createdAt: new Date().toISOString() });
    ctx.out(`${url(state, 'issues', state.issue.number)}#issuecomment-${id}\n`);
  });
}

function edit(args, ctx) {
  ctx.store.update((state) => {
    requireIssue(args, state);
    const issue = state.issue;
    const body = bodyOf(args);
    if (body !== undefined) issue.body = body;
    const removed = args.list('remove-label');
    issue.labels = [...new Set([...issue.labels, ...args.list('add-label')])].filter((name) => !removed.includes(name));
    ctx.out(`${url(state, 'issues', issue.number)}\n`);
  });
}

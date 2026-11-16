import { bodyOf, numberOf, parseArgs } from './args.mjs';
import { GhFailure, Unsupported } from './errors.mjs';
import { printJson } from './output.mjs';
import { nextId } from './store.mjs';
import { findIssue, issueView, url } from './views.mjs';

const VALUE_FLAGS = ['json', 'jq', 'template', 'repo', 'title', 'body', 'body-file', 'state', 'search', 'label', 'limit', 'add-label', 'remove-label', 'comment', 'reason', 'assignee', 'milestone'];

const COMMANDS = { view, list, comment, edit, create, close };

export function runIssue([name, ...rest], ctx) {
  const command = COMMANDS[name];
  if (!command) throw new Unsupported(`unknown command "issue ${name}"`);
  return command(parseArgs(rest, VALUE_FLAGS), ctx);
}

function requireIssue(args, state) {
  const number = numberOf(args.positionals[0]);
  const issue = findIssue(state, number);
  if (!issue) throw new GhFailure(`GraphQL: Could not resolve to an Issue with the number of ${number}. (repository.issue)`);
  return issue;
}

function view(args, ctx) {
  const state = ctx.store.read();
  const issue = issueView(state, requireIssue(args, state));
  if (args.has('json')) return printJson(ctx, args, issue);
  ctx.out(`title:\t${issue.title}\nstate:\t${issue.state}\nauthor:\t${issue.author.login}\nlabels:\t${issue.labels.map((label) => label.name).join(', ')}\ncomments:\t${issue.comments.length}\nnumber:\t${issue.number}\n--\n${issue.body}\n`);
  if (args.has('comments')) issue.comments.forEach((c) => ctx.out(`\n--\nauthor:\t${c.author.login}\n--\n${c.body}\n`));
}

function list(args, ctx) {
  const state = ctx.store.read();
  const wanted = (args.one('state') ?? 'open').toUpperCase();
  const labels = args.list('label');
  const issues = state.issues
    .filter((issue) => wanted === 'ALL' || wanted === issue.state)
    .filter((issue) => labels.every((name) => issue.labels.includes(name)))
    .map((issue) => issueView(state, issue));
  if (args.has('json')) return printJson(ctx, args, issues, Object.keys(issueView(state, state.issues[0])));
  issues.forEach((item) => ctx.out(`${item.number}\t${item.state}\t${item.title}\n`));
}

function comment(args, ctx) {
  ctx.store.update((state) => {
    const issue = requireIssue(args, state);
    const body = bodyOf(args);
    if (body === undefined) throw new Unsupported('issue comment needs --body or --body-file');
    const id = nextId(state);
    issue.comments.push({ id, author: state.viewer, body, createdAt: new Date().toISOString() });
    ctx.out(`${url(state, 'issues', issue.number)}#issuecomment-${id}\n`);
  });
}

function edit(args, ctx) {
  ctx.store.update((state) => {
    const issue = requireIssue(args, state);
    const body = bodyOf(args);
    if (body !== undefined) issue.body = body;
    if (args.has('title')) issue.title = args.one('title');
    const removed = args.list('remove-label');
    issue.labels = [...new Set([...issue.labels, ...args.list('add-label')])].filter((name) => !removed.includes(name));
    ctx.out(`${url(state, 'issues', issue.number)}\n`);
  });
}

// Numbers continue from the highest issue or PR, as on GitHub.
function create(args, ctx) {
  ctx.store.update((state) => {
    const body = bodyOf(args);
    if (!args.has('title') || body === undefined) throw new Unsupported('issue create needs --title and --body or --body-file');
    const number = Math.max(state.pr?.number ?? 0, ...state.issues.map((issue) => issue.number)) + 1;
    state.issues.push({
      number, title: args.one('title'), body, author: state.viewer, state: 'OPEN',
      labels: args.list('label'), comments: [], createdAt: new Date().toISOString(),
    });
    ctx.out(`${url(state, 'issues', number)}\n`);
  });
}

function close(args, ctx) {
  ctx.store.update((state) => {
    const issue = requireIssue(args, state);
    issue.state = 'CLOSED';
    if (args.has('comment')) {
      issue.comments.push({ id: nextId(state), author: state.viewer, body: args.one('comment'), createdAt: new Date().toISOString() });
    }
    ctx.out(`✓ Closed issue ${state.repo}#${issue.number} (${issue.title})\n`);
  });
}

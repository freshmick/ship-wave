import { execFileSync } from 'node:child_process';
import { bodyOf, numberOf, parseArgs } from './args.mjs';
import { GhFailure, Unsupported } from './errors.mjs';
import { printJson } from './output.mjs';
import { nextId } from './store.mjs';
import { PR_FIELDS, checksOf, findIssue, prView, url } from './views.mjs';

const VALUE_FLAGS = ['json', 'jq', 'template', 'repo', 'body', 'body-file', 'title', 'add-label', 'remove-label', 'state', 'search', 'label', 'limit', 'base', 'head', 'author', 'subject', 'match-head-commit', 'interval', 'add-assignee', 'add-reviewer'];

const COMMANDS = { view, list, diff, checks, edit, comment, merge, ready, review, create, close: unsupportedWrite };

export function runPr([name, ...rest], ctx) {
  const command = COMMANDS[name];
  if (!command) throw new Unsupported(`unknown command "pr ${name}"`);
  return command(parseArgs(rest, VALUE_FLAGS), ctx);
}

function unsupportedWrite() {
  throw new Unsupported('the fake remote can not close a pull request');
}

// A PR is created from a branch that was pushed first.
function create(args, ctx) {
  ctx.store.update((state) => {
    const head = args.one('head') ?? currentBranch();
    const body = bodyOf(args);
    if (!args.has('title') || body === undefined) throw new Unsupported('pr create needs --title and --body or --body-file');
    if (!ctx.git.hasBranch(head)) {
      throw new GhFailure(`aborted: you must first push the current branch to a remote, or use the --head flag`);
    }
    if (state.prs.some((pr) => pr.headRefName === head && pr.state === 'OPEN')) {
      throw new GhFailure(`a pull request for branch "${head}" into branch "${state.defaultBranch}" already exists`);
    }
    const number = Math.max(0, ...[...state.issues, ...state.prs].map((item) => item.number)) + 1;
    state.prs.push({
      number, title: args.one('title'), body, author: state.viewer, state: 'OPEN', isDraft: args.has('draft'),
      baseRefName: args.one('base') ?? state.defaultBranch, headRefName: head,
      closes: Number(/\b(?:fix(?:es)?|close[sd]?|resolve[sd]?)\s+#(\d+)/i.exec(body)?.[1]) || null,
      labels: args.list('label'), comments: [], reviews: [], reviewComments: [], resolvedThreads: [],
      createdAt: new Date().toISOString(),
    });
    ctx.out(`${url(state, 'pull', number)}\n`);
  });
}

function currentBranch() {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
}

// The PR a command names: by number, URL or branch. With no argument it is the
// PR of the branch checked out where gh runs, or the only PR there is.
function requirePr(args, state) {
  const target = args.positionals[0];
  const named = (value) => state.prs.find((pr) => pr.number === numberOf(value) || pr.headRefName === value);
  const pr = target === undefined ? (named(currentBranchOrNone()) ?? (state.prs.length === 1 ? state.prs[0] : undefined)) : named(target);
  if (!pr) throw new GhFailure(`no pull requests found for "${target ?? 'the current branch'}"`);
  return pr;
}

function currentBranchOrNone() {
  try {
    return currentBranch();
  } catch {
    return undefined;
  }
}

function view(args, ctx) {
  const state = ctx.store.read();
  const pr = prView(state, ctx.git, requirePr(args, state));
  if (args.has('json')) return printJson(ctx, args, pr);
  const labels = pr.labels.map((label) => label.name).join(', ');
  ctx.out(`title:\t${pr.title}\nstate:\t${pr.isDraft ? 'DRAFT' : pr.state}\nauthor:\t${pr.author.login}\nlabels:\t${labels}\nnumber:\t${pr.number}\nurl:\t${pr.url}\nadditions:\t${pr.additions}\ndeletions:\t${pr.deletions}\n--\n${pr.body}\n`);
  if (args.has('comments')) pr.comments.forEach((c) => ctx.out(`\n--\nauthor:\t${c.author.login}\n--\n${c.body}\n`));
}

function list(args, ctx) {
  const state = ctx.store.read();
  const wanted = (args.one('state') ?? 'open').toUpperCase();
  const labels = args.list('label');
  const prs = state.prs
    .filter((pr) => wanted === 'ALL' || wanted === pr.state)
    .filter((pr) => labels.every((name) => pr.labels.includes(name)))
    .filter((pr) => !args.has('head') || pr.headRefName === args.one('head'))
    .filter((pr) => !args.has('search') || `${pr.title} ${pr.body} ${pr.headRefName}`.includes(args.one('search')))
    .map((pr) => prView(state, ctx.git, pr));
  if (args.has('json')) return printJson(ctx, args, prs, PR_FIELDS);
  prs.forEach((item) => ctx.out(`${item.number}\t${item.title}\t${item.headRefName}\t${item.isDraft ? 'DRAFT' : item.state}\n`));
}

function diff(args, ctx) {
  const state = ctx.store.read();
  const pr = prView(state, ctx.git, requirePr(args, state));
  const flags = args.has('name-only') ? ['--name-only'] : [];
  ctx.out(`${ctx.git.diff(pr.baseRefOid, pr.headRefOid, ...flags)}\n`);
}

// Exit codes as gh: 0 all passed, 1 a check failed, 8 still pending.
function checks(args, ctx) {
  const state = ctx.store.read();
  const pr = requirePr(args, state);
  const rows = checksOf(state);
  if (args.has('json')) printJson(ctx, args, rows);
  else if (!rows.length) ctx.out(`no checks reported on the '${pr.headRefName}' branch\n`);
  else rows.forEach((row) => ctx.out(`${row.name}\t${row.bucket}\t1m0s\t${row.link}\n`));
  if (rows.some((row) => row.bucket === 'fail')) return 1;
  if (rows.some((row) => row.bucket === 'pending')) return 8;
}

function edit(args, ctx) {
  ctx.store.update((state) => {
    const pr = requirePr(args, state);
    const body = bodyOf(args);
    if (body !== undefined) pr.body = body;
    if (args.has('title')) pr.title = args.one('title');
    const removed = args.list('remove-label');
    pr.labels = [...new Set([...pr.labels, ...args.list('add-label')])].filter((name) => !removed.includes(name));
    ctx.out(`${url(state, 'pull', pr.number)}\n`);
  });
}

function comment(args, ctx) {
  ctx.store.update((state) => {
    const pr = requirePr(args, state);
    const body = bodyOf(args);
    if (body === undefined) throw new Unsupported('pr comment needs --body or --body-file');
    const last = pr.comments.findLast((item) => item.author === state.viewer);
    if (args.has('edit-last') && last) last.body = body;
    else pr.comments.push({ id: nextId(state), author: state.viewer, body, createdAt: new Date().toISOString() });
    ctx.out(`${url(state, 'pull', pr.number)}#issuecomment-${pr.comments.at(-1).id}\n`);
  });
}

function merge(args, ctx) {
  return ctx.store.update((state) => {
    const pr = requirePr(args, state);
    const admin = args.has('admin');
    if (pr.state === 'MERGED') return void ctx.out(`! Pull request ${state.repo}#${pr.number} was already merged\n`);
    if (state.requiresApproval && !admin) {
      throw new GhFailure(`Pull request ${state.repo}#${pr.number} is not mergeable: the base branch policy prohibits the merge.\nTo have the pull request merged after all the requirements have been met, add the \`--auto\` flag.\nTo use administrator privileges to immediately merge the pull request, add the \`--admin\` flag.`);
    }
    if (args.has('auto') && state.checks.some((check) => check.state !== 'pass')) {
      pr.autoMerge = true;
      return void ctx.out(`✓ Pull request ${state.repo}#${pr.number} will be automatically merged when all requirements are met\n`);
    }
    const base = `refs/heads/${pr.baseRefName}`;
    const head = `refs/heads/${pr.headRefName}`;
    // --squash, or a branch behind its base: one new commit on the base. Else the base moves to the head.
    const squash = args.has('squash') || ctx.git.isBehind(base, head);
    const merged = squash ? ctx.git.squash(base, head, `${pr.title} (#${pr.number})`) : ctx.git.sha(head);
    if (!merged) throw new GhFailure(`Pull request ${state.repo}#${pr.number} is not mergeable: the merge commit cannot be cleanly created.`);
    pr.mergedBaseSha = ctx.git.sha(base);
    pr.mergedHeadSha = ctx.git.sha(head);
    ctx.git.moveBranch(pr.baseRefName, merged);
    if (args.has('delete-branch')) ctx.git.deleteBranch(pr.headRefName);
    Object.assign(pr, { state: 'MERGED', mergedAt: new Date().toISOString(), mergedWithAdmin: admin });
    const closed = findIssue(state, pr.closes);
    if (closed) closed.state = 'CLOSED';
    ctx.out(`✓ Merged pull request ${state.repo}#${pr.number} (${pr.title})\n`);
  });
}

function ready(args, ctx) {
  ctx.store.update((state) => {
    const pr = requirePr(args, state);
    pr.isDraft = args.has('undo');
    ctx.out(`✓ Pull request ${state.repo}#${pr.number} is marked as "${pr.isDraft ? 'draft' : 'ready for review'}"\n`);
  });
}

function review(args, ctx) {
  ctx.store.update((state) => {
    const pr = requirePr(args, state);
    const kind = ['approve', 'request-changes', 'comment'].find((name) => args.has(name));
    if (!kind) throw new Unsupported('pr review needs --approve, --request-changes or --comment');
    if (kind !== 'comment' && state.viewer === pr.author) {
      throw new GhFailure(`failed to create review: Can not ${kind === 'approve' ? 'approve' : 'request changes on'} your own pull request`);
    }
    const reviewState = { approve: 'APPROVED', 'request-changes': 'CHANGES_REQUESTED', comment: 'COMMENTED' }[kind];
    pr.reviews.push({ id: nextId(state), author: { login: state.viewer }, state: reviewState, body: bodyOf(args) ?? '' });
  });
}

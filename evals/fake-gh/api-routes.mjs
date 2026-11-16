import { GhFailure } from './errors.mjs';
import { nextId } from './store.mjs';
import { checksOf, findIssue, findPr, prView, url } from './views.mjs';

const REPO = 'repos/[^/]+/[^/]+';
const route = (method, path, handler) => [method, new RegExp(`^${path.replace('REPO', REPO)}$`), handler];

// [method, endpoint pattern, handler]. A handler returns the JSON to print.
export const ROUTES = [
  route('GET', 'user', ({ ctx }) => ({ login: ctx.store.read().viewer, type: 'User' })),
  route('GET', 'REPO', ({ ctx }) => repoJson(ctx.store.read())),
  route('GET', 'REPO/rulesets', ({ ctx }) => rulesets(ctx.store.read())),
  route('GET', 'REPO/rules/branches/[^/]+', ({ ctx }) => branchRules(ctx.store.read())),
  route('GET', 'REPO/branches/[^/]+/protection', ({ ctx }) => protection(ctx.store.read())),
  route('GET', 'REPO/branches/[^/]+/protection/required_pull_request_reviews', ({ ctx }) => protection(ctx.store.read()).required_pull_request_reviews),
  route('GET', 'REPO/pulls/(\\d+)', ({ ctx, params }) => restPr(ctx, params[0])),
  route('GET', 'REPO/pulls/(\\d+)/files', ({ ctx, params }) => prView(ctx.store.read(), ctx.git, prOf(ctx.store.read(), params[0])).files.map((file) => ({ filename: file.path, additions: file.additions, deletions: file.deletions }))),
  route('GET', 'REPO/pulls/(\\d+)/reviews', ({ ctx, params }) => prOf(ctx.store.read(), params[0]).reviews),
  route('GET', 'REPO/pulls/(\\d+)/comments', ({ ctx, params }) => prOf(ctx.store.read(), params[0]).reviewComments.map(restReviewComment)),
  route('POST', 'REPO/pulls/(\\d+)/comments', addReviewComment),
  route('POST', 'REPO/pulls/(\\d+)/comments/(\\d+)/replies', ({ ctx, fields, params }) => addReviewComment({ ctx, params, fields: { ...fields, in_reply_to: Number(params[1]) } })),
  route('PATCH', 'REPO/pulls/comments/(\\d+)', ({ ctx, fields, params }) => editComment(ctx, 'reviewComments', params[0], fields)),
  route('DELETE', 'REPO/pulls/comments/(\\d+)', ({ ctx, params }) => deleteComment(ctx, 'reviewComments', params[0])),
  route('GET', 'REPO/issues/(\\d+)', ({ ctx, params }) => restIssue(ctx.store.read(), Number(params[0]))),
  route('GET', 'REPO/issues/(\\d+)/comments', ({ ctx, params }) => commentsOf(ctx.store.read(), Number(params[0])).map(restComment)),
  route('POST', 'REPO/issues/(\\d+)/comments', addComment),
  route('PATCH', 'REPO/issues/comments/(\\d+)', ({ ctx, fields, params }) => editComment(ctx, 'comments', params[0], fields)),
  route('DELETE', 'REPO/issues/comments/(\\d+)', ({ ctx, params }) => deleteComment(ctx, 'comments', params[0])),
  route('POST', 'REPO/issues/(\\d+)/labels', addLabels),
  route('DELETE', 'REPO/issues/(\\d+)/labels/(.+)', removeLabel),
  route('GET', 'REPO/issues/(\\d+)/sub_issues', ({ ctx, params }) => ctx.store.read().issues.filter((issue) => issue.parent === Number(params[0])).map((issue) => restIssue(ctx.store.read(), issue.number))),
  route('POST', 'REPO/issues/(\\d+)/sub_issues', addSubIssue),
  route('GET', 'REPO/issues/(\\d+)/dependencies/blocked_by', ({ ctx, params }) => (itemOf(ctx.store.read(), params[0]).blockedBy ?? []).map((number) => restIssue(ctx.store.read(), number))),
  route('POST', 'REPO/issues/(\\d+)/dependencies/blocked_by', addBlockedBy),
  route('DELETE', 'REPO/issues/(\\d+)/dependencies/blocked_by/(\\d+)', removeBlockedBy),
  route('GET', 'REPO/labels', ({ ctx }) => ctx.store.read().labels.map((name) => ({ name }))),
  route('POST', 'REPO/labels', ({ ctx, fields }) => ctx.store.update((state) => void state.labels.push(fields.name)) ?? { name: fields.name }),
  route('GET', 'REPO/commits/[^/]+/check-runs', ({ ctx }) => checkRuns(ctx.store.read())),
  route('GET', 'REPO/commits/[^/]+/status', ({ ctx }) => ({ state: combined(ctx.store.read()), statuses: [] })),
];

const notFound = () => {
  throw new GhFailure('Not Found (HTTP 404)');
};

function repoJson(state) {
  return { full_name: state.repo, name: state.repo.split('/')[1], owner: { login: state.repo.split('/')[0] }, private: false, default_branch: state.defaultBranch, allow_auto_merge: false, allow_squash_merge: true };
}

function rulesets(state) {
  if (!state.requiresApproval) return [];
  return [{ id: 1, name: 'main', target: 'branch', enforcement: 'active', source: state.repo }];
}

function branchRules(state) {
  if (!state.requiresApproval) return [];
  return [{ type: 'pull_request', ruleset_id: 1, parameters: { required_approving_review_count: 1, dismiss_stale_reviews_on_push: true, require_code_owner_review: false } }];
}

function protection(state) {
  if (!state.requiresApproval) throw new GhFailure('Branch not protected (HTTP 404)');
  return { required_pull_request_reviews: { required_approving_review_count: 1, dismiss_stale_reviews: true }, enforce_admins: { enabled: false }, required_status_checks: null };
}

const prOf = (state, number) => findPr(state, number) ?? notFound();

function restPr(ctx, number) {
  const state = ctx.store.read();
  const pr = prView(state, ctx.git, prOf(state, number));
  return {
    number: pr.number, title: pr.title, body: pr.body, draft: pr.isDraft, html_url: pr.url,
    state: pr.state === 'OPEN' ? 'open' : 'closed', merged: pr.state === 'MERGED',
    user: { login: pr.author.login }, labels: pr.labels,
    head: { ref: pr.headRefName, sha: pr.headRefOid }, base: { ref: pr.baseRefName, sha: pr.baseRefOid },
    additions: pr.additions, deletions: pr.deletions, changed_files: pr.changedFiles,
    mergeable: true, mergeable_state: pr.mergeStateStatus.toLowerCase(),
  };
}

function restIssue(state, number) {
  const item = itemOf(state, number);
  return { id: ISSUE_ID_BASE + number, number, title: item.title, body: item.body, state: item.state === 'OPEN' ? 'open' : 'closed', user: { login: item.author }, labels: item.labels.map((name) => ({ name })), html_url: url(state, 'issues', number) };
}

// Issue comments live on the PR or on the issue, by number.
function commentsOf(state, number) {
  return itemOf(state, number).comments;
}

// The PR or the issue with this number. GitHub numbers both in one sequence.
function itemOf(state, number) {
  return findPr(state, number) ?? findIssue(state, number) ?? notFound();
}

const restComment = (comment) => ({ id: comment.id, user: { login: comment.author }, body: comment.body, created_at: comment.createdAt, updated_at: comment.createdAt });

const restReviewComment = (comment) => ({ ...restComment(comment), path: comment.path, line: comment.line, commit_id: comment.commitId, in_reply_to_id: comment.inReplyTo });

function addComment({ ctx, fields, params }) {
  return ctx.store.update((state) => {
    const comment = { id: nextId(state), author: state.viewer, body: String(fields.body ?? ''), createdAt: new Date().toISOString() };
    commentsOf(state, Number(params[0])).push(comment);
    return restComment(comment);
  });
}

function addReviewComment({ ctx, fields, params }) {
  return ctx.store.update((state) => {
    const comment = {
      id: nextId(state), author: state.viewer, body: String(fields.body ?? ''), createdAt: new Date().toISOString(),
      path: fields.path, line: fields.line, commitId: fields.commit_id, inReplyTo: fields.in_reply_to,
    };
    prOf(state, params[0]).reviewComments.push(comment);
    return restReviewComment(comment);
  });
}

function findComment(state, kind, id) {
  const commentLists = [...state.prs, ...state.issues].map((item) => item.comments);
  const lists = kind === 'comments' ? commentLists : state.prs.map((pr) => pr.reviewComments);
  const list = lists.find((items) => items.some((item) => item.id === Number(id))) ?? notFound();
  return { list, comment: list.find((item) => item.id === Number(id)) };
}

function editComment(ctx, kind, id, fields) {
  return ctx.store.update((state) => {
    const { comment } = findComment(state, kind, id);
    comment.body = String(fields.body ?? comment.body);
    return restComment(comment);
  });
}

function deleteComment(ctx, kind, id) {
  ctx.store.update((state) => {
    const { list, comment } = findComment(state, kind, id);
    list.splice(list.indexOf(comment), 1);
  });
}

function addLabels({ ctx, fields, params }) {
  return ctx.store.update((state) => {
    const item = itemOf(state, params[0]);
    const names = [].concat(fields.labels ?? fields['labels[]'] ?? []);
    item.labels = [...new Set([...item.labels, ...names])];
    return item.labels.map((name) => ({ name }));
  });
}

function removeLabel({ ctx, params }) {
  return ctx.store.update((state) => {
    const item = itemOf(state, params[0]);
    item.labels = item.labels.filter((name) => name !== decodeURIComponent(params[1]));
    return item.labels.map((name) => ({ name }));
  });
}

// The REST API links issues by their id, not their number.
const ISSUE_ID_BASE = 9000;
const numberOfId = (state, id) => (findIssue(state, Number(id) - ISSUE_ID_BASE) ?? notFound()).number;

function addSubIssue({ ctx, fields, params }) {
  return ctx.store.update((state) => {
    const child = findIssue(state, numberOfId(state, fields.sub_issue_id));
    child.parent = itemOf(state, params[0]).number;
    return restIssue(state, child.number);
  });
}

function addBlockedBy({ ctx, fields, params }) {
  return ctx.store.update((state) => {
    const issue = itemOf(state, params[0]);
    const blocker = numberOfId(state, fields.issue_id);
    if (blocker === issue.number) throw new GhFailure('Validation Failed: an issue cannot block itself (HTTP 422)');
    issue.blockedBy = [...new Set([...(issue.blockedBy ?? []), blocker])];
    return restIssue(state, issue.number);
  });
}

function removeBlockedBy({ ctx, params }) {
  return ctx.store.update((state) => {
    const issue = itemOf(state, params[0]);
    const blocker = numberOfId(state, params[1]);
    issue.blockedBy = (issue.blockedBy ?? []).filter((number) => number !== blocker);
    return restIssue(state, issue.number);
  });
}

function checkRuns(state) {
  const runs = checksOf(state).map((check) => ({ name: check.name, status: check.status.toLowerCase(), conclusion: check.conclusion.toLowerCase() || null }));
  return { total_count: runs.length, check_runs: runs };
}

function combined(state) {
  if (state.checks.some((check) => check.state === 'fail')) return 'failure';
  return state.checks.some((check) => check.state === 'pending') ? 'pending' : 'success';
}

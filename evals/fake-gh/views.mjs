// Builds the JSON gh prints for a PR or an issue, from the state file and the
// branches in the fake remote.

const CHECK = {
  pass: { status: 'COMPLETED', conclusion: 'SUCCESS', bucket: 'pass' },
  fail: { status: 'COMPLETED', conclusion: 'FAILURE', bucket: 'fail' },
  pending: { status: 'IN_PROGRESS', conclusion: '', bucket: 'pending' },
};

export const url = (state, kind, number) => `https://github.com/${state.repo}/${kind}/${number}`;

export function checksOf(state) {
  return state.checks.map((check) => ({
    __typename: 'CheckRun',
    name: check.name,
    workflowName: 'CI',
    state: CHECK[check.state].conclusion || 'PENDING',
    link: `https://github.com/${state.repo}/actions/runs/1`,
    ...CHECK[check.state],
  }));
}

export function prView(state, git) {
  const pr = state.pr;
  const merged = pr.state === 'MERGED';
  const base = merged ? pr.mergedBaseSha : `refs/heads/${pr.baseRefName}`;
  const head = merged ? pr.mergedHeadSha : `refs/heads/${pr.headRefName}`;
  const files = git.files(base, head);
  const sum = (key) => files.reduce((total, file) => total + file[key], 0);
  const behind = !merged && git.isBehind(base, head);

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    isDraft: pr.isDraft,
    url: url(state, 'pull', pr.number),
    author: { login: pr.author, is_bot: false },
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    baseRefOid: git.sha(base),
    headRefOid: git.sha(head),
    labels: pr.labels.map((name) => ({ name })),
    files,
    additions: sum('additions'),
    deletions: sum('deletions'),
    changedFiles: files.length,
    commits: git.commits(base, head).map((commit) => ({
      oid: commit.oid,
      messageHeadline: commit.messageHeadline,
      authoredDate: commit.authoredDate,
      authors: [{ login: pr.author, name: commit.name, email: commit.email }],
    })),
    comments: pr.comments.map((comment) => commentView(state, pr.number, comment)),
    reviews: pr.reviews,
    reviewDecision: state.requiresApproval ? 'REVIEW_REQUIRED' : '',
    statusCheckRollup: checksOf(state),
    mergeable: 'MERGEABLE',
    mergeStateStatus: mergeState(state, behind),
    mergedAt: pr.mergedAt ?? null,
    mergeCommit: merged ? { oid: pr.mergedHeadSha } : null,
    autoMergeRequest: null,
    closingIssuesReferences: pr.closes ? [{ number: pr.closes, url: url(state, 'issues', pr.closes) }] : [],
    createdAt: pr.createdAt,
    updatedAt: pr.createdAt,
  };
}

function mergeState(state, behind) {
  if (behind) return 'BEHIND';
  if (state.requiresApproval) return 'BLOCKED';
  if (state.checks.some((check) => check.state !== 'pass')) return 'UNSTABLE';
  return 'CLEAN';
}

export const findIssue = (state, number) => state.issues.find((issue) => issue.number === Number(number));

export function issueView(state, issue) {
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    url: url(state, 'issues', issue.number),
    author: { login: issue.author },
    labels: issue.labels.map((name) => ({ name })),
    assignees: [],
    parent: issue.parent ? { number: issue.parent } : null,
    blockedBy: (issue.blockedBy ?? []).map((number) => ({ number })),
    comments: issue.comments.map((comment) => commentView(state, issue.number, comment)),
    createdAt: issue.createdAt,
    updatedAt: issue.createdAt,
  };
}

export function commentView(state, number, comment) {
  return {
    id: comment.id,
    author: { login: comment.author },
    body: comment.body,
    createdAt: comment.createdAt,
    url: `https://github.com/${state.repo}/issues/${number}#issuecomment-${comment.id}`,
  };
}

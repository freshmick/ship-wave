import { Unsupported } from './errors.mjs';

const THREAD_PREFIX = 'PRRT_';

// The two GraphQL operations the gate needs: list a PR's review threads and
// resolve one. A thread is a top-level review comment plus its replies.
export function graphql(fields, ctx) {
  const query = String(fields.query ?? '');
  if (query.includes('resolveReviewThread')) return resolveThread(query, fields, ctx);
  if (query.includes('reviewThreads')) return listThreads(ctx.store.read());
  throw new Unsupported('fake gh serves only the reviewThreads query and the resolveReviewThread mutation');
}

function listThreads(state) {
  const pr = state.pr;
  const node = (comment) => ({
    id: `PRRC_${comment.id}`, databaseId: comment.id, author: { login: comment.author },
    body: comment.body, path: comment.path, line: comment.line, createdAt: comment.createdAt,
  });
  const nodes = pr.reviewComments
    .filter((comment) => !comment.inReplyTo)
    .map((top) => ({
      id: `${THREAD_PREFIX}${top.id}`,
      isResolved: pr.resolvedThreads.includes(top.id),
      isOutdated: false,
      path: top.path,
      line: top.line,
      comments: { nodes: [top, ...pr.reviewComments.filter((reply) => reply.inReplyTo === top.id)].map(node) },
    }));
  const reviewThreads = { totalCount: nodes.length, pageInfo: { hasNextPage: false, endCursor: null }, nodes };
  return { data: { repository: { pullRequest: { number: pr.number, reviewThreads } } } };
}

function resolveThread(query, fields, ctx) {
  const id = [...Object.values(fields).map(String), query]
    .map((text) => new RegExp(`${THREAD_PREFIX}(\\d+)`).exec(text)?.[1])
    .find(Boolean);
  if (!id) throw new Unsupported('resolveReviewThread: no thread id found');
  ctx.store.update((state) => {
    const unresolve = query.includes('unresolveReviewThread');
    const others = state.pr.resolvedThreads.filter((item) => item !== Number(id));
    state.pr.resolvedThreads = unresolve ? others : [...others, Number(id)];
  });
  return { data: { resolveReviewThread: { thread: { id: `${THREAD_PREFIX}${id}`, isResolved: true } } } };
}

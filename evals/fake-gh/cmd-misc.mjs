import { parseArgs } from './args.mjs';
import { GhFailure, Unsupported } from './errors.mjs';
import { printJson } from './output.mjs';
import { url } from './views.mjs';

const VALUE_FLAGS = ['json', 'jq', 'template', 'repo', 'color', 'description', 'limit', 'branch', 'workflow', 'commit', 'status'];

// The small commands: labels, repo, auth, CI runs.
export function runMisc(argv, ctx) {
  const key = argv.slice(0, 2).join(' ');
  const command = COMMANDS[key] ?? COMMANDS[argv[0]];
  if (!command) throw new Unsupported(`fake gh does not serve "${key}"`);
  return command(parseArgs(argv.slice(COMMANDS[key] ? 2 : 1), VALUE_FLAGS), ctx);
}

const COMMANDS = {
  'label create': labelCreate,
  'label list': labelList,
  'repo view': repoView,
  'auth status': authStatus,
  // The fake repository has no Actions variables or secrets set.
  'variable list': (args, ctx) => (args.has('json') ? ctx.out('[]\n') : undefined),
  'secret list': (args, ctx) => (args.has('json') ? ctx.out('[]\n') : undefined),
  'run list': runList,
  'run view': runList,
  'run rerun': runRerun,
  'run watch': runWatch,
  '--version': (args, ctx) => ctx.out('gh version 2.63.0 (fake, for ship-wave evals)\n'),
};

function labelCreate(args, ctx) {
  ctx.store.update((state) => {
    const name = args.positionals[0];
    if (state.labels.includes(name) && !args.has('force')) {
      throw new GhFailure(`label with name "${name}" already exists; use \`--force\` to update its color and description`);
    }
    state.labels = [...new Set([...state.labels, name])];
    ctx.out(`✓ Label "${name}" created in ${state.repo}\n`);
  });
}

function labelList(args, ctx) {
  const labels = ctx.store.read().labels.map((name) => ({ name, color: 'ededed', description: '' }));
  if (args.has('json')) return printJson(ctx, args, labels, ['name', 'color', 'description']);
  labels.forEach((label) => ctx.out(`${label.name}\t\t#${label.color}\n`));
}

function repoView(args, ctx) {
  const state = ctx.store.read();
  const [owner, name] = state.repo.split('/');
  const repo = {
    name, nameWithOwner: state.repo, owner: { login: owner }, url: `https://github.com/${state.repo}`,
    defaultBranchRef: { name: state.defaultBranch }, isPrivate: false, visibility: 'PUBLIC',
    squashMergeAllowed: true, rebaseMergeAllowed: true, mergeCommitAllowed: true,
    autoMergeAllowed: false, deleteBranchOnMerge: false, viewerPermission: 'WRITE',
  };
  if (args.has('json')) return printJson(ctx, args, repo);
  ctx.out(`name:\t${state.repo}\ndescription:\t\n`);
}

function authStatus(args, ctx) {
  ctx.out(`github.com\n  ✓ Logged in to github.com account ${ctx.store.read().viewer} (keyring)\n  - Active account: true\n  - Token scopes: 'repo', 'workflow'\n`);
}

function runsOf(state) {
  const failed = state.checks.some((check) => check.state === 'fail');
  const pending = state.checks.some((check) => check.state === 'pending');
  return [{
    databaseId: 1, name: 'CI', workflowName: 'CI', headBranch: state.prs[0]?.headRefName ?? state.defaultBranch, event: 'push',
    status: pending ? 'in_progress' : 'completed', conclusion: pending ? '' : failed ? 'failure' : 'success',
    url: `${url(state, 'actions/runs', 1)}`,
  }];
}

function runList(args, ctx) {
  const runs = ctx.store.read().checks.length ? runsOf(ctx.store.read()) : [];
  if (args.has('json')) return printJson(ctx, args, runs, Object.keys(runsOf(ctx.store.read())[0]));
  runs.forEach((run) => ctx.out(`${run.status}\t${run.conclusion}\t${run.name}\t${run.headBranch}\t${run.databaseId}\n`));
}

// A re-run gives the result the case names in `checksAfterRerun`, or the same again.
function runRerun(args, ctx) {
  ctx.store.update((state) => {
    state.reruns = (state.reruns ?? 0) + 1;
    if (state.checksAfterRerun) state.checks = state.checksAfterRerun;
    ctx.out('✓ Requested rerun of run 1\n');
  });
}

function runWatch(args, ctx) {
  const [run] = runsOf(ctx.store.read());
  ctx.out(`Run CI (1) has already completed with '${run.conclusion || 'pending'}'\n`);
  return run.conclusion === 'failure' ? 1 : 0;
}

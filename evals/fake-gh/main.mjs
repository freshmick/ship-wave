import { openStore } from './store.mjs';
import { openGit } from './git.mjs';
import { runPr } from './cmd-pr.mjs';
import { runIssue } from './cmd-issue.mjs';
import { runApi } from './cmd-api.mjs';
import { runMisc } from './cmd-misc.mjs';
import { GhFailure, Unsupported } from './errors.mjs';

const GROUPS = { pr: runPr, issue: runIssue, api: runApi };

// Runs one gh invocation. Returns the exit code.
export async function main(argv, env, io = process) {
  const store = openStore(env.FAKE_GH_STATE, env.FAKE_GH_LOG);
  // Opened on first use: a remote with issues only has no repository behind it.
  let opened;
  const git = new Proxy({}, { get: (_, name) => (opened ??= openGit(env.FAKE_GH_ORIGIN))[name] });
  const [group, ...rest] = argv;
  const run = GROUPS[group] ?? runMisc;
  const ctx = { store, git, argv, out: (text) => io.stdout.write(text) };

  try {
    // A command returns an exit code only when it isn't 0.
    const result = await run(group in GROUPS ? rest : argv, ctx);
    const code = typeof result === 'number' ? result : 0;
    store.log({ argv, handled: true, exit: code });
    return code;
  } catch (error) {
    const expected = error instanceof GhFailure;
    if (!expected && !(error instanceof Unsupported)) throw error;
    store.log({ argv, handled: expected, exit: 1, reason: error.message });
    io.stderr.write(`gh: ${error.message}\n`);
    return 1;
  }
}

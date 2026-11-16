import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every setting comes from the environment; the defaults suit a local run.
export function loadConfig(env = process.env) {
  return {
    evalsDir,
    skillsDir: resolve(evalsDir, '..', 'skills'),
    fakeGhDir: join(evalsDir, 'fake-gh'),
    // Where the source repository for fixtures is cloned, once.
    cacheDir: env.EVAL_CACHE_DIR ?? join(evalsDir, '.cache'),
    // Where each run's fixture repository is built. Kept outside this repo so
    // the agent under test doesn't pick up this repo's instruction files.
    workDir: env.EVAL_WORK_DIR ?? join(tmpdir(), 'ship-wave-evals'),
    resultsDir: env.EVAL_RESULTS_DIR ?? join(evalsDir, 'results'),
    sourceUrl: env.EVAL_SOURCE_URL ?? 'https://github.com/umami-software/umami.git',
    claudeBin: env.EVAL_CLAUDE_BIN ?? 'claude',
    // The model the skill under test runs on: the one waves are run on.
    model: env.EVAL_MODEL ?? 'opus',
    // The model that judges prose (what was asked, whether an outcome is one outcome).
    judgeModel: env.EVAL_JUDGE_MODEL ?? 'sonnet',
    maxUsdPerRun: Number(env.EVAL_MAX_USD_PER_RUN ?? 15),
    timeoutMinutes: Number(env.EVAL_TIMEOUT_MINUTES ?? 30),
    concurrency: Number(env.EVAL_CONCURRENCY ?? 2),
  };
}

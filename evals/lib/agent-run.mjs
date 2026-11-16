import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { GIT_ENV } from './git.mjs';

const TOOLS = 'Bash Read Write Edit Glob Grep Agent Skill';

// Runs one headless Claude Code session in `cwd` with the fake gh first on
// PATH. The session loads only the fixture's own settings and skills. Its
// transcript goes to <dir>/transcript.jsonl. Resolves with how it ended.
export function runAgent({ config, prompt, cwd, dir, ghEnv }) {
  const args = [
    '--print', prompt,
    '--setting-sources', 'project',
    '--permission-mode', 'dontAsk',
    '--allowedTools', TOOLS,
    '--output-format', 'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--max-budget-usd', String(config.maxUsdPerRun),
  ];
  if (config.model) args.push('--model', config.model);

  const ghConfigDir = join(dir, 'gh-config');
  const tmpDir = join(dir, 'tmp');
  mkdirSync(ghConfigDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
  const env = {
    ...process.env,
    ...GIT_ENV,
    ...ghEnv,
    PATH: `${config.fakeGhDir}:${process.env.PATH}`,
    // If the session ever reaches the real gh, it has no login to use.
    GH_TOKEN: 'fake-token-for-evals',
    GH_CONFIG_DIR: ghConfigDir,
    // Each run gets its own temporary directory, so runs side by side don't mix files.
    TMPDIR: tmpDir,
  };
  delete env.GIT_AUTHOR_DATE;
  delete env.GIT_COMMITTER_DATE;
  delete env.AGENT_GITHUB_LOGIN;

  return new Promise((resolve) => {
    const child = spawn(config.claudeBin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(createWriteStream(join(dir, 'transcript.jsonl')));
    child.stderr.pipe(createWriteStream(join(dir, 'stderr.log')));
    const timer = setTimeout(() => child.kill('SIGTERM'), config.timeoutMinutes * 60_000);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code, timedOut: signal === 'SIGTERM' });
    });
  });
}

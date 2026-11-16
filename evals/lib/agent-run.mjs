import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GIT_ENV } from './git.mjs';

const TOOLS = 'Bash Read Write Edit Glob Grep Agent Skill';

// Runs one turn of a headless Claude Code session in `cwd` with the fake gh
// first on PATH. The session loads only the fixture's own settings and skills.
// Pass `resume` (a session id from an earlier turn) to continue that session,
// and `turn` to name this turn's transcript, <dir>/<turn>.jsonl.
// Resolves with how the turn ended, its last message and the session id.
export function runAgent({ config, prompt, cwd, dir, ghEnv, resume, turn = 'transcript', keepSession = false }) {
  const args = [
    '--print',
    '--setting-sources', 'project',
    '--permission-mode', 'dontAsk',
    '--allowedTools', TOOLS,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-budget-usd', String(config.maxUsdPerRun),
  ];
  if (config.model) args.push('--model', config.model);
  if (resume) args.push('--resume', resume);
  else if (!keepSession) args.push('--no-session-persistence');

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
    const child = spawn(config.claudeBin, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    // The prompt goes in on stdin: as an argument, one that starts with a dash reads as an option.
    child.stdin.end(prompt);
    const transcript = join(dir, `${turn}.jsonl`);
    const out = child.stdout.pipe(createWriteStream(transcript));
    child.stderr.pipe(createWriteStream(join(dir, `${turn}.stderr.log`)));
    const timer = setTimeout(() => child.kill('SIGTERM'), config.timeoutMinutes * 60_000);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      out.end(() => resolve({ exitCode: code, timedOut: signal === 'SIGTERM', ...lastResult(transcript) }));
    });
  });
}

// The transcript's last line is the turn's result: its final message and session id.
function lastResult(transcript) {
  const last = readFileSync(transcript, 'utf8').trimEnd().split('\n').at(-1);
  try {
    const { result, session_id: sessionId } = JSON.parse(last);
    return { message: result ?? '', sessionId };
  } catch {
    return { message: '', sessionId: undefined };
  }
}

import { execFileSync } from 'node:child_process';

// The identity and config every fixture commit is made with, so a fixture is
// the same on any machine.
export const GIT_ENV = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_AUTHOR_NAME: 'Fixture Implementer',
  GIT_AUTHOR_EMAIL: 'implementer@example.com',
  GIT_COMMITTER_NAME: 'Fixture Implementer',
  GIT_COMMITTER_EMAIL: 'implementer@example.com',
  GIT_AUTHOR_DATE: '2026-11-02T09:00:00Z',
  GIT_COMMITTER_DATE: '2026-11-02T09:00:00Z',
};

export function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...GIT_ENV },
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trimEnd();
}

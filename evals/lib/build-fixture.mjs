import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { publish } from './fixture.mjs';
import { git } from './git.mjs';

// Builds the repository a building case runs in: a copy of the small project
// in evals/build/fixture-repo, committed on `main`, with a remote and the
// skills under test. Unlike the Umami fixtures, its tests really run.
export function buildSmallRepo({ config, dir }) {
  const repo = join(dir, 'repo');
  cpSync(join(config.evalsDir, 'build', 'fixture-repo'), repo, { recursive: true });
  git(repo, ['init', '--quiet', '--initial-branch', 'main']);
  git(repo, ['add', '--all', '--force']);
  git(repo, ['commit', '--quiet', '-m', 'tripsheet 0.3.0']);
  return publish(config, repo, dir);
}

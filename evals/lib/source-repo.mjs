import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { git } from './git.mjs';

// Clones the open-source repository the fixtures are cut from, once. Nothing
// in it is ever installed or run; only its files are read.
export function ensureSourceRepo(config) {
  const dir = join(config.cacheDir, 'umami.git');
  if (!existsSync(dir)) {
    mkdirSync(config.cacheDir, { recursive: true });
    git(config.cacheDir, ['clone', '--quiet', '--bare', config.sourceUrl, dir]);
  }
  return dir;
}

// Writes the files of commit `sha` into `targetDir`, without their history.
// It uses a throwaway index, so the source repository is left untouched.
export function exportTree(sourceRepo, sha, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const index = join(targetDir, '.export-index');
  const run = (...args) =>
    execFileSync('git', ['--git-dir', sourceRepo, '--work-tree', targetDir, ...args], {
      env: { ...process.env, GIT_INDEX_FILE: index },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  run('read-tree', sha);
  run('checkout-index', '--all', '--force');
  rmSync(index);
}

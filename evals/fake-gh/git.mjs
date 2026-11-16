import { execFileSync } from 'node:child_process';

// Read-mostly access to the bare repository that plays the GitHub remote.
export function openGit(gitDir) {
  if (!gitDir) throw new Error('fake gh needs FAKE_GH_ORIGIN');
  const git = (...args) =>
    execFileSync('git', ['--git-dir', gitDir, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }).trimEnd();

  return {
    sha: (ref) => git('rev-parse', ref),
    hasBranch(branch) {
      try {
        git('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
        return true;
      } catch {
        return false;
      }
    },
    diff: (base, head, ...flags) => git('diff', ...flags, `${base}...${head}`),
    files(base, head) {
      const lines = git('diff', '--numstat', `${base}...${head}`).split('\n').filter(Boolean);
      return lines.map((line) => {
        const [additions, deletions, path] = line.split('\t');
        return { path, additions: Number(additions) || 0, deletions: Number(deletions) || 0 };
      });
    },
    commits(base, head) {
      const format = ['%H', '%s', '%an', '%ae', '%aI'].join('%x1f');
      const lines = git('log', '--reverse', `--format=${format}`, `${base}..${head}`);
      return lines.split('\n').filter(Boolean).map((line) => {
        const [oid, messageHeadline, name, email, authoredDate] = line.split('\x1f');
        return { oid, messageHeadline, name, email, authoredDate };
      });
    },
    isBehind: (base, head) => git('merge-base', base, head) !== git('rev-parse', base),
    // A commit on top of `base` holding the merge of `head`, or null on a conflict.
    squash(base, head, message) {
      try {
        const tree = git('merge-tree', '--write-tree', base, head).split('\n')[0];
        return git('-c', 'user.name=fake-gh', '-c', 'user.email=fake-gh@example.com', 'commit-tree', tree, '-p', base, '-m', message);
      } catch {
        return null;
      }
    },
    moveBranch: (branch, sha) => git('update-ref', `refs/heads/${branch}`, sha),
    deleteBranch: (branch) => git('update-ref', '-d', `refs/heads/${branch}`),
  };
}

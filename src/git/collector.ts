import { execSync } from 'node:child_process';
import type { FileChange, GitMetadata, RepositorySnapshot } from '../types.js';

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export async function collectSnapshot(
  repositoryPath: string,
  diffBase: string,
): Promise<RepositorySnapshot> {
  const branch = execGit('git rev-parse --abbrev-ref HEAD', repositoryPath) || 'HEAD';
  const headSha = execGit('git rev-parse --short HEAD', repositoryPath) || 'no-commits';
  const statusOutput = execGit('git status --porcelain', repositoryPath);
  const isDirty = statusOutput.length > 0;

  const diffNameStatus = execGit(`git diff --name-status ${diffBase}`, repositoryPath);
  const entries = diffNameStatus.split('\n').filter(Boolean).map(line => {
    const [status, file] = line.split('\t');
    return { status: status.charAt(0), file };
  });

  const created: FileChange[] = [];
  const modified: FileChange[] = [];
  const deleted: FileChange[] = [];

  for (const entry of entries) {
    if (entry.file.match(/(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.lock$|^dist\/|^build\/|^out\/)/i)) {
      continue;
    }

    const diffText = execGit(`git diff ${diffBase} -- "${entry.file}"`, repositoryPath);
    let additions = 0;
    let deletions = 0;

    for (const line of diffText.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    const change: FileChange = {
      path: entry.file,
      diff: diffText,
      additions,
      deletions,
    };

    if (entry.status === 'A') {
      created.push(change);
    } else if (entry.status === 'D') {
      deleted.push(change);
    } else {
      modified.push(change);
    }
  }

  const metadata: GitMetadata = {
    headSha,
    isDirty,
    diffBase,
    totalFilesChanged: created.length + modified.length + deleted.length,
  };

  return {
    repositoryRoot: repositoryPath,
    branch,
    created,
    modified,
    deleted,
    metadata,
  };
}

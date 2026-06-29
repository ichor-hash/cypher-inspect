/**
 * Git Collector — Builds a RepositorySnapshot from the current repository state.
 *
 * Uses `simple-git` to gather branch info, HEAD SHA, dirty status,
 * diff output, and package file contents. Produces the single source
 * of truth consumed by all downstream analyzers.
 *
 * @module git/collector
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { simpleGit, type DiffResultTextFile, type SimpleGit } from 'simple-git';
import type {
  FileChange,
  GitMetadata,
  RepositorySnapshot,
} from '../models/index.js';
import { debug, warn } from '../utils/logger.js';



/**
 * Read a file from disk, returning `null` if the file does not exist.
 */
async function readFileOrNull(absolutePath: string): Promise<string | null> {
  try {
    return await readFile(absolutePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Retrieve a file's content at a given git ref, returning `null`
 * if the file does not exist at that ref.
 */
async function showAtRef(
  git: SimpleGit,
  ref: string,
  relativePath: string,
): Promise<string | null> {
  try {
    return await git.show(`${ref}:${relativePath}`);
  } catch {
    return null;
  }
}

/**
 * Determine the current branch name, falling back to 'HEAD' for
 * detached HEAD states or new repositories with no commits.
 */
async function getCurrentBranch(git: SimpleGit): Promise<string> {
  try {
    const branchSummary = await git.branchLocal();
    return branchSummary.current || 'HEAD';
  } catch {
    return 'HEAD';
  }
}

/**
 * Retrieve the short SHA of the current HEAD commit.
 * Returns 'no-commits' for repositories without any commits.
 */
async function getHeadSha(git: SimpleGit): Promise<string> {
  try {
    const sha = await git.revparse(['--short', 'HEAD']);
    return sha.trim();
  } catch {
    return 'no-commits';
  }
}

/**
 * Check whether the working tree has uncommitted changes.
 */
async function isDirty(git: SimpleGit): Promise<boolean> {
  try {
    const status = await git.status();
    return !status.isClean();
  } catch {
    return false;
  }
}

/**
 * Retrieve the raw diff text for a single file against the given base.
 * Returns an empty string for binary files or if the diff cannot be obtained.
 */
async function getFileDiff(
  git: SimpleGit,
  diffBase: string,
  filePath: string,
): Promise<string> {
  try {
    const diff = await git.diff([diffBase, '--', filePath]);
    return diff;
  } catch {
    debug(`Could not get diff for ${filePath}`);
    return '';
  }
}

/**
 * Build a {@link FileChange} from a diff summary entry.
 */
async function buildFileChange(
  git: SimpleGit,
  diffBase: string,
  entry: DiffResultTextFile,
): Promise<FileChange> {
  const diff = await getFileDiff(git, diffBase, entry.file);
  return {
    path: entry.file,
    diff,
    additions: entry.insertions,
    deletions: entry.deletions,
  };
}


/**
 * Collect a complete {@link RepositorySnapshot} for the given repository.
 *
 * @param repositoryPath - Absolute path to the repository root.
 * @param diffBase       - Git ref to diff against (e.g. 'HEAD', 'main', a SHA).
 * @returns A fully-populated snapshot ready for analysis.
 */
export async function collectSnapshot(
  repositoryPath: string,
  diffBase: string,
): Promise<RepositorySnapshot> {
  const git: SimpleGit = simpleGit(repositoryPath);

  // Gather metadata concurrently.
  const [branch, headSha, dirty] = await Promise.all([
    getCurrentBranch(git),
    getHeadSha(git),
    isDirty(git),
  ]);

  debug(`Branch: ${branch} | HEAD: ${headSha} | Dirty: ${String(dirty)}`);

  // Get the diff summary to categorize changed files.
  let diffEntries: readonly DiffResultTextFile[] = [];
  try {
    const summary = await git.diffSummary([diffBase]);
    // Filter out binary files (they have no meaningful text diff).
    diffEntries = summary.files.filter(
      (f): f is DiffResultTextFile => !('binary' in f && (f as { binary: boolean }).binary),
    );
  } catch (err) {
    warn(`Could not compute diff against '${diffBase}': ${String(err)}`);
  }

  // Categorize files by their change status.
  const createdEntries: DiffResultTextFile[] = [];
  const modifiedEntries: DiffResultTextFile[] = [];
  const deletedEntries: DiffResultTextFile[] = [];

  for (const entry of diffEntries) {
    // Lazy pruning: silently ignore lockfiles and dist folders
    if (entry.file.match(/(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.lock$|^dist\/|^build\/|^out\/)/i)) {
      continue;
    }

    // Determine status by attempting to show the file at the base ref.
    const existedBefore = await showAtRef(git, diffBase, entry.file) !== null;

    if (entry.deletions > 0 && entry.insertions === 0 && !existedBefore) {
      // Edge case: shouldn't happen, but guard against it.
      continue;
    }

    if (!existedBefore) {
      createdEntries.push(entry);
    } else {
      // Check if it still exists on disk (i.e. not deleted).
      const existsNow = await readFileOrNull(join(repositoryPath, entry.file)) !== null;
      if (existsNow) {
        modifiedEntries.push(entry);
      } else {
        deletedEntries.push(entry);
      }
    }
  }

  debug(
    `Files — created: ${createdEntries.length}, modified: ${modifiedEntries.length}, deleted: ${deletedEntries.length}`,
  );

  // Build FileChange arrays concurrently per category.
  const [created, modified, deleted] = await Promise.all([
    Promise.all(createdEntries.map((e) => buildFileChange(git, diffBase, e))),
    Promise.all(modifiedEntries.map((e) => buildFileChange(git, diffBase, e))),
    Promise.all(deletedEntries.map((e) => buildFileChange(git, diffBase, e))),
  ]);

  const totalFilesChanged = created.length + modified.length + deleted.length;

  const metadata: GitMetadata = {
    headSha,
    isDirty: dirty,
    diffBase,
    totalFilesChanged,
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

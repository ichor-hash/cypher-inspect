/**
 * Repository Snapshot — The single source of truth.
 *
 * Created by the Git Collector, consumed by every downstream analyzer.
 * Contains all raw data about the current state of changes in the repository.
 */

export interface FileChange {
  /** Relative path from the repository root */
  readonly path: string;
  /** The raw diff content for this file */
  readonly diff: string;
  /** Number of lines added */
  readonly additions: number;
  /** Number of lines removed */
  readonly deletions: number;
}

export interface RepositorySnapshot {
  /** Absolute path to the repository root */
  readonly repositoryRoot: string;
  /** Current branch name */
  readonly branch: string;
  /** Files that were created (did not exist before) */
  readonly created: readonly FileChange[];
  /** Files that were modified (existed before, changed now) */
  readonly modified: readonly FileChange[];
  /** Files that were deleted */
  readonly deleted: readonly FileChange[];
  /** Git metadata */
  readonly metadata: GitMetadata;
}

export interface GitMetadata {
  /** Short SHA of the latest commit */
  readonly headSha: string;
  /** Whether the working tree has uncommitted changes */
  readonly isDirty: boolean;
  /** Comparison base — what the diff is computed against */
  readonly diffBase: string;
  /** Total number of files changed */
  readonly totalFilesChanged: number;
}

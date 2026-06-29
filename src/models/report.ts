/**
 * Analysis Report — The structured output of the entire pipeline.
 *
 * This is a renderer-agnostic data structure. It contains everything
 * needed to produce terminal, JSON, Markdown, or HTML output.
 * No rendering logic belongs here.
 */

export type Severity = 'high' | 'medium' | 'low';

export interface RiskIssue {
  /** The file(s) related to this risk */
  readonly files: readonly string[];
  /** Human-readable description of the risk */
  readonly description: string;
  /** Severity level */
  readonly severity: Severity;
  /** Which rule produced this risk */
  readonly rule: string;
}


export interface FileSummary {
  /** Relative path of the file */
  readonly path: string;
  /** Human-readable explanation of what changed in this file */
  readonly explanation: string;
  /** Tags describing the nature of the change (e.g., 'auth', 'config', 'routing') */
  readonly tags: readonly string[];
}

export interface AnalysisReport {
  /** High-level project summary lines */
  readonly summary: readonly string[];
  /** Per-file summaries */
  readonly files: {
    readonly created: readonly FileSummary[];
    readonly modified: readonly FileSummary[];
    readonly deleted: readonly FileSummary[];
  };

  /** Potential risks identified by the rule engine */
  readonly risks: readonly RiskIssue[];
  /** Files recommended for manual review, ordered by importance */
  readonly reviewRecommended: readonly string[];
  
  /** Estimated review time in minutes */
  readonly reviewTimeMinutes: number;
  
  /** Overall confidence score (0-100) */
  readonly confidenceScore: number;
  
  /** High-level category statuses */
  readonly categories: {
    readonly authentication: 'Modified' | 'Unchanged';
    readonly database: 'Modified' | 'Unchanged';
    readonly configuration: 'Modified' | 'Unchanged';
  };
  
  /** Metadata about the analysis run */
  readonly meta: AnalysisMeta;
}

export interface AnalysisMeta {
  /** Timestamp of the analysis */
  readonly timestamp: string;
  /** Duration of the analysis in milliseconds */
  readonly durationMs: number;
  /** Version of Cypher Inspect that produced this report */
  readonly version: string;
  /** The diff base used */
  readonly diffBase: string;
  /** Branch name */
  readonly branch: string;
}

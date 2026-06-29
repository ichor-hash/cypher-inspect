export interface CypherConfig {
  readonly diffBase: string;
  readonly repositoryPath: string;
  readonly verbose: boolean;
  readonly ai: boolean;
  readonly apiProvider: 'groq' | 'openai' | 'openrouter' | 'gemini' | 'auto';
  readonly apiKey?: string;
}

export const DEFAULT_CONFIG: CypherConfig = {
  diffBase: 'HEAD',
  repositoryPath: process.cwd(),
  verbose: false,
  ai: false,
  apiProvider: 'auto',
};

export type Severity = 'high' | 'medium' | 'low';

export interface RiskIssue {
  readonly files: readonly string[];
  readonly description: string;
  readonly severity: Severity;
  readonly rule: string;
}

export interface FileSummary {
  readonly path: string;
  readonly explanation: string;
  readonly tags: readonly string[];
}

export interface AnalysisReport {
  readonly summary: readonly string[];
  readonly files: {
    readonly created: readonly FileSummary[];
    readonly modified: readonly FileSummary[];
    readonly deleted: readonly FileSummary[];
  };
  readonly risks: readonly RiskIssue[];
  readonly reviewRecommended: readonly string[];
  readonly reviewTimeMinutes: number;
  readonly confidenceScore: number;
  readonly categories: {
    readonly authentication: 'Modified' | 'Unchanged';
    readonly database: 'Modified' | 'Unchanged';
    readonly configuration: 'Modified' | 'Unchanged';
  };
  readonly meta: AnalysisMeta;
}

export interface AnalysisMeta {
  readonly timestamp: string;
  readonly durationMs: number;
  readonly version: string;
  readonly diffBase: string;
  readonly branch: string;
}

export interface FileChange {
  readonly path: string;
  readonly diff: string;
  readonly additions: number;
  readonly deletions: number;
}

export interface RepositorySnapshot {
  readonly repositoryRoot: string;
  readonly branch: string;
  readonly created: readonly FileChange[];
  readonly modified: readonly FileChange[];
  readonly deleted: readonly FileChange[];
  readonly metadata: GitMetadata;
}

export interface GitMetadata {
  readonly headSha: string;
  readonly isDirty: boolean;
  readonly diffBase: string;
  readonly totalFilesChanged: number;
}

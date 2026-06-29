/**
 * Configuration — CLI options and runtime settings.
 */

export interface CypherConfig {
  /** The base git ref to compare against (e.g., HEAD, main). */
  readonly diffBase: string;

  /** The root directory of the repository to analyze. */
  readonly repositoryPath: string;

  /** If true, enables verbose debug logging. */
  readonly verbose: boolean;

  /** If true, uses Groq LLM to generate intelligent summaries. */
  readonly ai: boolean;

  /** The AI Provider to use (groq, openai, openrouter, gemini, auto). */
  readonly apiProvider: 'groq' | 'openai' | 'openrouter' | 'gemini' | 'auto';

  /** The API key for the selected provider. */
  readonly apiKey?: string;
}

/** Default configuration values. */
export const DEFAULT_CONFIG: CypherConfig = {
  diffBase: 'HEAD',
  repositoryPath: process.cwd(),
  verbose: false,
  ai: false,
  apiProvider: 'auto',
};

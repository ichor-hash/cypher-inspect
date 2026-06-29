/**
 * CLI Commands — Commander.js setup for Cypher Inspect.
 *
 * Defines the top-level command, options, and action handler.
 * Delegates all logic to the core pipeline.
 *
 * @module cli/commands
 */

import { Command } from 'commander';
import { resolve, join } from 'node:path';
import fs from 'node:fs';
import type { CypherConfig } from '../models/index.js';
import { DEFAULT_CONFIG } from '../models/config.js';
import { runPipeline } from '../core/pipeline.js';
import { error } from '../utils/logger.js';

/**
 * Create and configure the CLI program.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('cypher-inspect')
    .description(
      'Git Diff for AI — Understand what your AI coding assistant changed, why, and what to review.',
    )
    .version('0.1.0', '-v, --version', 'Display the current version')
    .option(
      '-b, --base <ref>',
      'Git ref to diff against (e.g. HEAD, main, a commit SHA)',
      DEFAULT_CONFIG.diffBase,
    )

    .option(
      '-p, --path <path>',
      'Path to the repository root',
      DEFAULT_CONFIG.repositoryPath,
    )
    .option(
      '--verbose',
      'Show verbose debug output',
      DEFAULT_CONFIG.verbose,
    )
    .option(
      '--ai',
      'Enable AI-powered summaries using Groq',
      DEFAULT_CONFIG.ai,
    )
    .option(
      '--provider <name>',
      'AI Provider to use (groq, openai, openrouter, gemini, auto)',
      DEFAULT_CONFIG.apiProvider,
    )
    .option(
      '--api-key <key>',
      'API key for the selected provider (defaults to auto-detecting env vars)',
    )
    .option(
      '--init',
      'Initialize GitHub Actions workflow file in the current repository',
      false,
    )
    .action(async (options: { base: string; path: string; verbose: boolean; ai: boolean; provider: string; apiKey?: string; init: boolean }) => {
      if (options.init) {
        const wfDir = join(resolve(options.path), '.github', 'workflows');
        const wfPath = join(wfDir, 'cypher-inspect.yml');
        const yaml = `name: Cypher Inspect
on: [pull_request]
jobs:
  inspect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx @cypher/inspect --ai
        env:
          GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
        fs.mkdirSync(wfDir, { recursive: true });
        fs.writeFileSync(wfPath, yaml, 'utf8');
        console.log(`\x1b[32m✓\x1b[0m Initialized GitHub Actions workflow at .github/workflows/cypher-inspect.yml`);
        return;
      }

      let finalApiKey = options.apiKey;
      let finalProvider = options.provider as CypherConfig['apiProvider'];

      if (options.ai) {
        if (!finalApiKey) {
          // Auto-detect keys
          if (process.env.GROQ_API_KEY) { finalApiKey = process.env.GROQ_API_KEY; if (finalProvider === 'auto') finalProvider = 'groq'; }
          else if (process.env.OPENAI_API_KEY) { finalApiKey = process.env.OPENAI_API_KEY; if (finalProvider === 'auto') finalProvider = 'openai'; }
          else if (process.env.OPENROUTER_API_KEY) { finalApiKey = process.env.OPENROUTER_API_KEY; if (finalProvider === 'auto') finalProvider = 'openrouter'; }
          else if (process.env.GEMINI_API_KEY) { finalApiKey = process.env.GEMINI_API_KEY; if (finalProvider === 'auto') finalProvider = 'gemini'; }
        }

        if (!finalApiKey) {
          console.warn('\x1b[33m⚠\x1b[0m AI mode requested but no API key found (OPENAI_API_KEY, GROQ_API_KEY, etc). Falling back to deterministic mode.');
          options.ai = false;
        }
      }

      const config: CypherConfig = {
        diffBase: options.base,
        repositoryPath: resolve(options.path),
        verbose: options.verbose,
        ai: options.ai,
        apiProvider: finalProvider,
        apiKey: finalApiKey,
      };

      try {
        const { output, report } = await runPipeline(config);
        if (output) {
          console.log(output);
        }
        
        // The "Ship It" CI exit code
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
          if (report.confidenceScore < 80) {
            console.error(`\x1b[31m✖\x1b[0m Confidence score (${report.confidenceScore}%) is below 80%. CI failed. Manual review required.`);
            process.exitCode = 1;
          } else {
            console.log(`\x1b[32m✓\x1b[0m Confidence score (${report.confidenceScore}%) is passing. Auto-merge approved.`);
          }
        }
      } catch (err) {
        error(`Analysis failed: ${String(err)}`);
        process.exitCode = 1;
      }
    });

  return program;
}

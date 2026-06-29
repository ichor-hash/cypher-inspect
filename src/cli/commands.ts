/**
 * CLI Commands — Commander.js setup for Cypher Inspect.
 *
 * Defines the top-level command, options, and action handler.
 * Delegates all logic to the core pipeline.
 *
 * @module cli/commands
 */

import { resolve, join } from 'node:path';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import type { CypherConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';
import { runPipeline } from '../core/pipeline.js';

/**
 * Create and configure the CLI program.
 */
export async function runCLI(): Promise<void> {
  const { values } = parseArgs({
    options: {
      version: { type: 'boolean', short: 'v' },
      base: { type: 'string', short: 'b', default: DEFAULT_CONFIG.diffBase },
      path: { type: 'string', short: 'p', default: DEFAULT_CONFIG.repositoryPath },
      verbose: { type: 'boolean', default: DEFAULT_CONFIG.verbose },
      ai: { type: 'boolean', default: DEFAULT_CONFIG.ai },
      provider: { type: 'string', default: DEFAULT_CONFIG.apiProvider },
      'api-key': { type: 'string' },
      init: { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.version) {
    console.log('0.1.0');
    return;
  }

  if (values.init) {
    const wfDir = join(resolve(values.path as string), '.github', 'workflows');
    const wfPath = join(wfDir, 'cypher-inspect.yml');
    const yaml = `name: Cypher Inspect
on: [pull_request]
jobs:
  inspect:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v3
      - run: npx -y cypher-inspect --ai
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

  let finalApiKey = values['api-key'] as string | undefined;
  let finalProvider = values.provider as CypherConfig['apiProvider'];

  if (values.ai) {
    if (!finalApiKey) {
      if (process.env.GROQ_API_KEY) { finalApiKey = process.env.GROQ_API_KEY; if (finalProvider === 'auto') finalProvider = 'groq'; }
      else if (process.env.OPENAI_API_KEY) { finalApiKey = process.env.OPENAI_API_KEY; if (finalProvider === 'auto') finalProvider = 'openai'; }
      else if (process.env.OPENROUTER_API_KEY) { finalApiKey = process.env.OPENROUTER_API_KEY; if (finalProvider === 'auto') finalProvider = 'openrouter'; }
      else if (process.env.GEMINI_API_KEY) { finalApiKey = process.env.GEMINI_API_KEY; if (finalProvider === 'auto') finalProvider = 'gemini'; }
    }

    if (!finalApiKey) {
      console.warn('\x1b[33m⚠\x1b[0m AI mode requested but no API key found (OPENAI_API_KEY, GROQ_API_KEY, etc). Falling back to deterministic mode.');
      values.ai = false;
    }
  }

  let diffBase = values.base as string;
  if (diffBase === DEFAULT_CONFIG.diffBase && process.env.GITHUB_ACTIONS && process.env.GITHUB_EVENT_NAME === 'pull_request') {
    diffBase = 'HEAD^1';
  }

  const config: CypherConfig = {
    diffBase,
    repositoryPath: resolve(values.path as string),
    verbose: values.verbose as boolean,
    ai: values.ai as boolean,
    apiProvider: finalProvider,
    apiKey: finalApiKey,
  };

  try {
    const { output, report } = await runPipeline(config);
    if (output) {
      console.log(output);
    }
    
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      if (report.confidenceScore < 80) {
        console.error(`\x1b[31m✖\x1b[0m Confidence score (${report.confidenceScore}%) is below 80%. CI failed. Manual review required.`);
        process.exitCode = 1;
      } else {
        console.log(`\x1b[32m✓\x1b[0m Confidence score (${report.confidenceScore}%) is passing. Auto-merge approved.`);
      }
    }
  } catch (err) {
    console.error(`\x1b[31m✗\x1b[0m Analysis failed: ${String(err)}`);
    process.exitCode = 1;
  }
}

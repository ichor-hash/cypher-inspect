#!/usr/bin/env node

/**
 * Cypher Inspect — Git Diff for AI.
 *
 * Entry point for the CLI tool. Bootstraps Commander and runs the pipeline.
 *
 * @module index
 */

import { runCLI } from './cli/commands.js';

runCLI().catch(err => {
  console.error(`\x1b[31m✗\x1b[0m Fatal Error: ${String(err)}`);
  process.exitCode = 1;
});

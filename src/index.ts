#!/usr/bin/env node

/**
 * Cypher Inspect — Git Diff for AI.
 *
 * Entry point for the CLI tool. Bootstraps Commander and runs the pipeline.
 *
 * @module index
 */

import { createProgram } from './cli/commands.js';

const program = createProgram();
program.parse();

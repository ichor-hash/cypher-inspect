/**
 * Terminal Renderer — The core vibe coder output.
 * Minimalist cognitive load reduction.
 */

import chalk from 'chalk';
import path from 'node:path';
import type { AnalysisReport } from '../models/index.js';

const SEP = chalk.dim('━━━━━━━━━━━━━━━━━━━━');
const BLANK = '';

function formatCategory(name: string, status: 'Modified' | 'Unchanged'): string {
  const value = status === 'Modified' ? chalk.yellow('Modified') : chalk.dim('Unchanged');
  return `${name}\n  ${value}`;
}


export const terminalRenderer = {
  name: 'terminal',

  render(report: AnalysisReport): string {
    const totalFiles = report.files.created.length + report.files.modified.length + report.files.deleted.length;
    const filesToRead = report.reviewRecommended;
    
    const lines: string[] = [
      BLANK,
      chalk.bold.cyan('Cypher Inspect'),
      BLANK,
      chalk.bold('Repository Summary'),
      `${totalFiles} files changed`,
      SEP,
      chalk.bold('Review Time'),
      `${report.reviewTimeMinutes} minute${report.reviewTimeMinutes === 1 ? '' : 's'}`,
      SEP,
      chalk.bold('Files Worth Reading'),
      `${filesToRead.length}`,
    ];

    if (filesToRead.length > 0) {
      lines.push(BLANK);
      for (const file of filesToRead) {
        const fullPath = path.resolve(file).replace(/\\/g, '/');
        const basename = file.split('/').pop() || file;
        lines.push(`\x1b]8;;file://${fullPath}\x1b\\${basename}\x1b]8;;\x1b\\`);
      }
    }

    lines.push(
      SEP,
      formatCategory('Authentication', report.categories.authentication),
      formatCategory('Database', report.categories.database),
      formatCategory('Configuration', report.categories.configuration),
      SEP,
      chalk.bold('Confidence'),
      `${report.confidenceScore}%`,
      BLANK
    );

    // If AI context exists, we can append it at the very end as a subtle addition
    const hasAiContext = [...report.files.created, ...report.files.modified].some(f => f.explanation);
    if (hasAiContext) {
      lines.push(SEP);
      lines.push(chalk.bold('AI Explanations'));
      
      const allFiles = [...report.files.created, ...report.files.modified];
      for (const f of allFiles) {
        if (f.explanation) {
          const fullPath = path.resolve(f.path).replace(/\\/g, '/');
          const basename = f.path.split('/').pop() || f.path;
          const link = `\x1b]8;;file://${fullPath}\x1b\\${basename}\x1b]8;;\x1b\\`;
          lines.push(`${link} ${chalk.dim(f.explanation)}`);
        }
      }
      lines.push(BLANK);
    }

    // Add indentation
    return lines.map(line => line === BLANK || line === SEP ? line : `  ${line}`).join('\n');
  },
};

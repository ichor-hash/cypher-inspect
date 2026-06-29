/**
 * Terminal Renderer — The core vibe coder output.
 * Minimalist cognitive load reduction.
 */

import path from 'node:path';
import type { AnalysisReport } from '../types.js';

const SEP = '\x1b[90m━━━━━━━━━━━━━━━━━━━━\x1b[0m';
const BLANK = '';

function formatCategory(name: string, status: 'Modified' | 'Unchanged'): string {
  const value = status === 'Modified' ? '\x1b[33mModified\x1b[0m' : '\x1b[90mUnchanged\x1b[0m';
  return `${name.padEnd(16)} ${value}`;
}


export const terminalRenderer = {
  name: 'terminal',

  render(report: AnalysisReport): string {
    const totalFiles = report.files.created.length + report.files.modified.length + report.files.deleted.length;
    const filesToRead = report.reviewRecommended;
    
    const lines: string[] = [
      BLANK,
      `\x1b[1;36mCypher Inspect\x1b[0m`,
      BLANK,
      `\x1b[1mRepository Summary\x1b[0m`,
      `${totalFiles} files changed`,
      SEP,
      `\x1b[1mReview Time\x1b[0m`,
      `${report.reviewTimeMinutes} minute${report.reviewTimeMinutes === 1 ? '' : 's'}`,
      SEP,
      `\x1b[1mFiles Worth Reading\x1b[0m`,
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
      `\x1b[1mConfidence\x1b[0m`,
      `${report.confidenceScore}%`,
      BLANK
    );

    // If AI context exists, we can append it at the very end as a subtle addition
    const hasAiContext = [...report.files.created, ...report.files.modified].some(f => f.explanation);
    if (hasAiContext) {
      lines.push(SEP);
      lines.push(`\x1b[1mAI Explanations\x1b[0m`);
      
      const allFiles = [...report.files.created, ...report.files.modified];
      for (const f of allFiles) {
        if (f.explanation) {
          const fullPath = path.resolve(f.path).replace(/\\/g, '/');
          const basename = f.path.split('/').pop() || f.path;
          const link = `\x1b]8;;file://${fullPath}\x1b\\${basename}\x1b]8;;\x1b\\`;
          lines.push(`${link} \x1b[90m${f.explanation}\x1b[0m`);
        }
      }
      lines.push(BLANK);
    }

    // Add indentation
    return lines.map(line => line === BLANK || line === SEP ? line : `  ${line}`).join('\n');
  },
};

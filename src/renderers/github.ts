import fs from 'node:fs';
import type { AnalysisReport } from '../models/index.js';
import { terminalRenderer } from './terminal.js';
import { debug, error } from '../utils/logger.js';

export async function postGitHubComment(report: AnalysisReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    debug('GITHUB_TOKEN not found, skipping PR comment.');
    return;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    debug('GITHUB_EVENT_PATH not found, skipping PR comment.');
    return;
  }

  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const prNumber = event.pull_request?.number;
    if (!prNumber) {
      debug('Not a pull request event, skipping PR comment.');
      return;
    }

    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) return;

    const rawOutput = terminalRenderer.render(report);
    // Strip ANSI codes for markdown
    const stripped = rawOutput.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const body = `## 🕵️‍♂️ Cypher Inspect Report\n\n\`\`\`text\n${stripped}\n\`\`\``;

    const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    });

    if (!res.ok) {
      const err = await res.text();
      error(`Failed to post PR comment: ${res.status} ${err}`);
    } else {
      debug('Successfully posted PR comment.');
    }
  } catch (err) {
    error(`GitHub API Error: ${String(err)}`);
  }
}

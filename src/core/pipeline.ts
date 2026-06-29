import type {
  AnalysisReport,
  CypherConfig,
} from '../types.js';

import { collectSnapshot } from '../git/collector.js';
import { riskAnalyzer } from '../analysis/risks/analyzer.js';
import { postGitHubComment } from '../renderers/github.js';
import { enhanceReportWithLlm } from '../summary/llm.js';
import { terminalRenderer } from '../renderers/terminal.js';

let verboseMode = false;
function debug(msg: string) { if (verboseMode) console.log(`\x1b[90m⋯ ${msg}\x1b[0m`); }

export async function runPipeline(config: CypherConfig): Promise<{ output: string, report: AnalysisReport }> {
  const startTime = Date.now();
  verboseMode = config.verbose;

  debug(`Pipeline starting — diffBase: ${config.diffBase}`);
  debug(`Repository: ${config.repositoryPath}`);

  console.log('- Collecting repository snapshot…');
  let snapshot;
  try {
    snapshot = await collectSnapshot(config.repositoryPath, config.diffBase);
  } catch (err) {
    console.error(`\x1b[31m✗\x1b[0m Failed to collect repository snapshot: ${String(err)}`);
    throw err;
  }

  if (snapshot.metadata.totalFilesChanged === 0) {
    const report = createEmptyReport(config, startTime);
    return { output: terminalRenderer.render(report), report };
  }

  console.log('- Analyzing changes…');
  
  // Inline the analysis passes. (No need for 4 separate analyzer objects).
  // Kept riskAnalyzer to house the regexes.
  const riskAnalysis = await riskAnalyzer.analyze(snapshot);

  debug('Generating report…');

  let report: AnalysisReport = {
    summary: [],
    files: {
      created: snapshot.created.map(f => ({ path: f.path, tags: [], summary: 'Created', explanation: '' })),
      modified: snapshot.modified.map(f => ({ path: f.path, tags: [], summary: 'Modified', explanation: '' })),
      deleted: snapshot.deleted.map(f => ({ path: f.path, tags: [], summary: 'Deleted', explanation: '' })),
    },
    risks: riskAnalysis.risks,
    reviewRecommended: [...new Set(riskAnalysis.risks.filter((r: any) => r.severity === 'high').map((r: any) => r.files?.[0] || ''))].filter(Boolean) as string[],
    
    reviewTimeMinutes: Math.max(1, Math.ceil(
      (snapshot.created.reduce((acc, f) => acc + f.additions + f.deletions, 0) +
       snapshot.modified.reduce((acc, f) => acc + f.additions + f.deletions, 0) +
       snapshot.deleted.reduce((acc, f) => acc + f.additions + f.deletions, 0)) / 200
    )),
    
    confidenceScore: Math.max(10, 100 - (
      riskAnalysis.risks.filter((r: any) => r.severity === 'high').length * 5 +
      riskAnalysis.risks.filter((r: any) => r.severity === 'medium').length * 2
    )),
    
    categories: {
      authentication: riskAnalysis.risks.some((r: any) => r.rule === 'auth') ? 'Modified' : 'Unchanged',
      database: riskAnalysis.risks.some((r: any) => r.rule === 'database') ? 'Modified' : 'Unchanged',
      configuration: riskAnalysis.risks.some((r: any) => r.rule === 'env') ? 'Modified' : 'Unchanged',
    },

    meta: {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      version: '0.1.0',
      diffBase: config.diffBase,
      branch: 'unknown',
    }
  };

  report = await enhanceReportWithLlm(config, snapshot, report);
  
  if (process.env.GITHUB_ACTIONS === 'true') {
    await postGitHubComment(report);
  }

  console.clear();
  const output = terminalRenderer.render(report);
  
  return { output, report };
}

function createEmptyReport(config: CypherConfig, startTime: number): AnalysisReport {
  return {
    summary: ['No changes detected.'],
    files: { created: [], modified: [], deleted: [] },
    risks: [],
    reviewRecommended: [],
    reviewTimeMinutes: 1,
    confidenceScore: 100,
    categories: {
      authentication: 'Unchanged',
      database: 'Unchanged',
      configuration: 'Unchanged',
    },
    meta: {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      version: '0.1.0',
      diffBase: config.diffBase,
      branch: 'unknown',
    },
  };
}

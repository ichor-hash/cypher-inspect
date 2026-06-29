import type {
  AnalysisReport,
  CypherConfig,
  RepositorySnapshot,
} from '../models/index.js';
import { debug, createSpinner } from '../utils/logger.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface LlmResponse {
  file_explanations: Record<string, string>;
}

/**
 * Formats the git snapshot into a prompt string for the LLM.
 * Implements truncation to fit standard context windows.
 */
function buildContextString(snapshot: RepositorySnapshot): string {
  const parts: string[] = [];

  parts.push(`Total Files Changed: ${snapshot.metadata.totalFilesChanged}`);
  parts.push(`Files Created: ${snapshot.created.map((f) => f.path).join(', ') || 'None'}`);
  parts.push(`Files Deleted: ${snapshot.deleted.map((f) => f.path).join(', ') || 'None'}`);
  parts.push(`Files Modified: ${snapshot.modified.map((f) => f.path).join(', ') || 'None'}`);

  let totalChars = parts.join('\n').length;
  const MAX_CHARS = 10000; // Keep it well within fast context windows

  for (const f of [...snapshot.created, ...snapshot.modified]) {
    // Take at most 50 lines, but also respect total char limit
    const diffSnip = f.diff.split('\n').slice(0, 50).join('\n');
    const addition = `\n--- ${f.path} ---\n${diffSnip}`;
    
    if (totalChars + addition.length > MAX_CHARS) {
      parts.push(`\n--- [TRUNCATED] Diffs exceed context limit ---`);
      break;
    }
    
    parts.push(addition);
    totalChars += addition.length;
  }

  return parts.join('\n');
}

/**
 * Attempts to parse LLM JSON output, handling markdown wrappers (```json ... ```).
 */
function parseLlmJson(content: string): LlmResponse {
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return JSON.parse(cleaned.trim()) as LlmResponse;
}

/**
 * Maps the abstract provider name to its OpenAI-compatible endpoint and model.
 */
function getProviderConfig(provider: CypherConfig['apiProvider']) {
  switch (provider) {
    case 'openai':
      return { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' };
    case 'openrouter':
      return { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-3.5-sonnet' };
    case 'gemini':
      return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' };
    case 'groq':
    case 'auto':
    default:
      return { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' };
  }
}

/**
 * Enhances the heuristic report with AI-generated file explanations using a universal fetch client.
 */
export async function enhanceReportWithLlm(
  config: CypherConfig,
  snapshot: RepositorySnapshot,
  heuristicReport: AnalysisReport,
): Promise<AnalysisReport> {
  if (!config.ai || !config.apiKey) {
    return heuristicReport;
  }

  const spinner = createSpinner('Generating AI context…').start();
  debug(`Using AI Provider: ${config.apiProvider}`);

  try {
    const contextStr = buildContextString(snapshot);
    const hash = crypto.createHash('sha256').update(contextStr).digest('hex');
    const cacheDir = path.join(config.repositoryPath, 'node_modules', '.cache', 'cypher');
    const cachePath = path.join(cacheDir, `${hash}.json`);

    let parsed: LlmResponse;

    if (fs.existsSync(cachePath)) {
      debug('Cache hit! Reading from 0-second cache.');
      parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } else {
      const prompt = `You are an expert Staff Engineer reviewing a Git Diff.
You will be provided with a summary of changed files and short snippets of their diffs.

CONTEXT OF CHANGES:
${contextStr}

TASK:
Return a JSON object matching this exact TypeScript interface:
{
  "file_explanations": Record<string, string> // Map each file path to a concise 1-sentence explanation of what changed in it. Be highly specific but brief. (e.g. "cypher-inspect/src/core/pipeline.ts": "Inlined risk engine and removed LLM step")
}

Only return raw JSON. No markdown backticks, no explanations.`;

      const { url, model } = getProviderConfig(config.apiProvider);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API returned ${res.status}: ${err}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from LLM');

      parsed = parseLlmJson(content);
      
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(parsed), 'utf8');
    }

    spinner.stop();

    // Merge LLM explanations into the file lists
    const mapExplanations = (files: readonly any[]) => 
      files.map(f => ({ ...f, explanation: parsed.file_explanations?.[f.path] || f.explanation }));

    return {
      ...heuristicReport,
      files: {
        created: mapExplanations(heuristicReport.files.created),
        modified: mapExplanations(heuristicReport.files.modified),
        deleted: mapExplanations(heuristicReport.files.deleted),
      }
    };

  } catch (err) {
    spinner.stop();
    debug(`LLM Error: ${String(err)}`);
    return heuristicReport;
  }
}

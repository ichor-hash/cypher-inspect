/**
 * Risk Analyzer — Inline risk detection.
 */

import type {
  RiskIssue,
  RepositorySnapshot,
} from '../../models/index.js';

export interface RiskAnalysisResult {
  risks: RiskIssue[];
}



interface InlineRule {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  dirs?: RegExp;
  files?: RegExp;
  keywords?: RegExp[];
  msg: string;
}

const RULES: readonly InlineRule[] = [
  {
    id: 'auth',
    name: 'Authentication/Authorization',
    severity: 'high',
    dirs: /(?:^|[\\/])(?:auth|authentication|login)[\\/]/i,
    files: /(?:auth|login|session|token|jwt|oauth|passport)/i,
    keywords: [/password/i, /hash/i, /\bsalt\b/i, /bcrypt/i, /\bjwt\b/i, /\btoken\b/i, /\bsession\b/i, /\bcookie\b/i, /\bcsrf\b/i, /cors\s+origin/i, /authenticate/i, /authorize/i],
    msg: 'Auth-sensitive change'
  },
  {
    id: 'database',
    name: 'Database/Schema',
    severity: 'high',
    dirs: /(?:^|[\\/])(?:db|database|migrations|schema)[\\/]/i,
    files: /(?:schema|migration|seed|model)/i,
    keywords: [/\bSELECT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bINSERT\b/i, /\bDROP\b/i, /\bALTER\b/i, /TypeORM/i, /Prisma/i, /Mongoose/i, /Sequelize/i],
    msg: 'Database schema or query change'
  },
  {
    id: 'env',
    name: 'Environment/Config',
    severity: 'medium',
    dirs: /(?:^|[\\/])(?:config|env)[\\/]/i,
    files: /(?:\.env|config|secrets)/i,
    keywords: [/process\.env/i, /apiKey/i, /secret/i, /password/i, /token/i],
    msg: 'Configuration/environment change'
  },
  {
    id: 'network',
    name: 'Network/External API',
    severity: 'low',
    files: /(?:api|client|fetch|http)/i,
    keywords: [/fetch\(/i, /axios/i, /http\./i, /https\./i, /XMLHttpRequest/i, /WebSocket/i],
    msg: 'Network/API communication change'
  },
  {
    id: 'security',
    name: 'General Security',
    severity: 'high',
    keywords: [/eval\(/i, /innerHTML/i, /dangerouslySetInnerHTML/i, /exec\(/i, /spawn\(/i, /execSync/i, /setTimeout\([^,]+,/i, /setInterval\([^,]+,/i],
    msg: 'Potentially unsafe API usage'
  }
];

export const riskAnalyzer = {
  name: 'Risk Analyzer',

  async analyze(snapshot: RepositorySnapshot): Promise<RiskAnalysisResult> {
    const risks: RiskIssue[] = [];

    const allChanges = [...snapshot.created, ...snapshot.modified, ...snapshot.deleted];
    for (const change of allChanges) {
      for (const rule of RULES) {
        let match = false;
        let detail = '';

        if (rule.dirs && rule.dirs.test(change.path)) {
          match = true;
          detail = 'Matched directory pattern';
        } else if (rule.files && rule.files.test(change.path)) {
          match = true;
          detail = 'Matched file pattern';
        } else if (rule.keywords) {
          for (const kw of rule.keywords) {
            if (change.diff && kw.test(change.diff)) {
              match = true;
              detail = `Matched keyword ${kw.toString()}`;
              break;
            }
          }
        }

        if (match) {
          risks.push({
            rule: rule.id,
            severity: rule.severity,
            description: `${rule.name}: ${rule.msg} in ${change.path}: ${detail}`,
            files: [change.path]
          });
        }
      }
    }

    return { risks };
  },
};

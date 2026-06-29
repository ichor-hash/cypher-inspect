import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/core/pipeline.js';
import * as collector from '../src/git/collector.js';
import type { RepositorySnapshot, CypherConfig } from '../src/types.js';

// Mock the Git collector so we can inject arbitrary diffs
vi.mock('../src/git/collector.js', () => ({
  collectSnapshot: vi.fn(),
}));

const mockConfig: CypherConfig = {
  diffBase: 'HEAD',
  repositoryPath: '/mock/repo',
  verbose: false,
  ai: false,
  apiProvider: 'auto',
};

function createMockSnapshot(files: { path: string, diff: string, type: 'created' | 'modified' | 'deleted' }[]): RepositorySnapshot {
  const created = files.filter(f => f.type === 'created').map(f => ({ path: f.path, diff: f.diff, additions: 10, deletions: 0 }));
  const modified = files.filter(f => f.type === 'modified').map(f => ({ path: f.path, diff: f.diff, additions: 5, deletions: 5 }));
  const deleted = files.filter(f => f.type === 'deleted').map(f => ({ path: f.path, diff: f.diff, additions: 0, deletions: 10 }));

  return {
    repositoryRoot: '/mock/repo',
    branch: 'main',
    created,
    modified,
    deleted,
    metadata: {
      headSha: '1234567',
      isDirty: false,
      diffBase: 'HEAD',
      totalFilesChanged: files.length,
    }
  };
}

describe('Cypher Inspect - Edge Cases', () => {
  it('should handle zero files changed gracefully', async () => {
    vi.mocked(collector.collectSnapshot).mockResolvedValueOnce(createMockSnapshot([]));
    
    const { report } = await runPipeline(mockConfig);
    expect(report.confidenceScore).toBe(100);
    expect(report.files.created).toHaveLength(0);
    expect(report.summary[0]).toBe('No changes detected.');
  });

  it('should correctly flag a true Database modification in a pure deletion', async () => {
    vi.mocked(collector.collectSnapshot).mockResolvedValueOnce(createMockSnapshot([
      { path: 'src/db/migrations/001.sql', diff: '- DROP TABLE users;', type: 'deleted' }
    ]));
    
    const { report } = await runPipeline(mockConfig);
    expect(report.categories.database).toBe('Modified');
    expect(report.risks.some(r => r.rule === 'database')).toBe(true);
  });

  it('should not flag innocent variable names as Authentication risks', async () => {
    vi.mocked(collector.collectSnapshot).mockResolvedValueOnce(createMockSnapshot([
      { path: 'src/utils/helpers.ts', diff: '+ const hash_map = new Map();', type: 'created' }
    ]));
    
    const { report } = await runPipeline(mockConfig);
    expect(report.categories.authentication).toBe('Unchanged');
  });

  it('should flag true Authentication risks', async () => {
    vi.mocked(collector.collectSnapshot).mockResolvedValueOnce(createMockSnapshot([
      { path: 'src/auth/jwt.ts', diff: '+ const jwt_token = sign(payload);', type: 'created' }
    ]));
    
    const { report } = await runPipeline(mockConfig);
    expect(report.categories.authentication).toBe('Modified');
  });
});

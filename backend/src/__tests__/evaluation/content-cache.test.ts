import { describe, it, expect } from 'vitest';
import { hashContent, buildCacheKey } from '../../services/evaluation/content-cache';

describe('ContentCache', () => {
  it('should hash content consistently', () => {
    const content = 'same content';
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different content', () => {
    const hash1 = hashContent('content A');
    const hash2 = hashContent('content B');
    expect(hash1).not.toBe(hash2);
  });

  it('should build cache key with dispute id and content hash', () => {
    const hash = hashContent('test');
    const key = buildCacheKey('dispute-123', hash);
    expect(key).toContain('dispute-123');
    expect(key).toContain(hash.slice(0, 10));
  });
});

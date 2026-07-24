import { describe, it, expect } from 'vitest';
import { EVAL_PROMPT_V3_2, EVAL_PROMPT_VERSION } from '../../prompts/eval-v3.2';

describe('Prompt Version String Format', () => {
  it('EVAL_PROMPT_VERSION should be eval-v3.2', () => {
    expect(EVAL_PROMPT_VERSION).toBe('eval-v3.2');
  });

  it('EVAL_PROMPT_V3_2 should start with MERITVIEW_EVAL_V3_2 identifier', () => {
    expect(EVAL_PROMPT_V3_2.startsWith('MERITVIEW_EVAL_V3_2')).toBe(true);
  });

  it('EVAL_PROMPT_V3_2 should contain a version identifier on the first line', () => {
    const firstLine = EVAL_PROMPT_V3_2.split('\n')[0];
    expect(firstLine).toBe('MERITVIEW_EVAL_V3_2');
  });

  it('EVAL_PROMPT_V3_2 should have a version line', () => {
    const lines = EVAL_PROMPT_V3_2.split('\n');
    const hasVersionLine = lines.some(line => line.includes('MERITVIEW_EVAL_V3_2'));
    expect(hasVersionLine).toBe(true);
  });

  it('should be a const string, not modified after definition', () => {
    const original = EVAL_PROMPT_V3_2;
    expect(typeof original).toBe('string');
    expect(original.length).toBeGreaterThan(100);
    expect(original).toContain('{brief}');
  });
});

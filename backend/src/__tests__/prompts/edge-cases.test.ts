import { describe, it, expect } from 'vitest';
import { EVAL_PROMPT_V3_2, getEvalPrompt } from '../../prompts/eval-v3.2';

describe('Edge Case: ~50-word brief', () => {
  const brief50 = 'I lent my neighbor $500. He agreed to pay back in 30 days. It has been 60 days. He refuses to answer my calls. I want my money back.';

  it('should accept a 50-word brief without error', () => {
    const result = getEvalPrompt(brief50);
    expect(result).toContain(brief50);
    expect(result).not.toContain('{brief}');
  });

  it('should produce a prompt shorter than normal', () => {
    const normal = getEvalPrompt('A'.repeat(1000));
    const short = getEvalPrompt(brief50);
    expect(short.length).toBeLessThan(normal.length);
  });
});

describe('Edge Case: ~5000-word brief', () => {
  const longBrief = Array(1000).fill('This is a sentence that provides factual background for a contract dispute scenario. The party claims that the other party failed to deliver goods as promised under the agreement.').join(' ');

  it('should accept a long brief without error', () => {
    const result = getEvalPrompt(longBrief);
    expect(result).not.toContain('{brief}');
    expect(result.length).toBeGreaterThan(10000);
  });

  it('should still contain the prompt instructions', () => {
    const result = getEvalPrompt(longBrief);
    expect(result).toContain('strongestArguments');
    expect(result).toContain('confidenceScore');
  });
});

describe('Edge Case: Third-party PII in brief', () => {
  const piiBrief = `I had a contract with John Smith (SSN: 123-45-6789, DOB: 01/15/1980) 
regarding the sale of his property at 123 Main St, Anytown, USA. 
His email is john.smith@email.com and his phone is (555) 123-4567. 
He breached the agreement by not transferring the title.`;

  it('should pass PII-containing brief to prompt', () => {
    const result = getEvalPrompt(piiBrief);
    expect(result).toContain(piiBrief);
  });

  it('should still produce valid prompt structure', () => {
    const result = getEvalPrompt(piiBrief);
    expect(result).toContain('## RULES');
    expect(result).toContain('## OUTPUT STRUCTURE');
  });
});

describe('Edge Case: Illegal activity description in brief', () => {
  const illegalBrief = `I paid my neighbor $5000 to burn down the competitor's warehouse. 
He took the money but did not perform the arson. I want my money back 
plus damages for the lost opportunity. We had a verbal contract.`;

  it('should pass illegal-content brief to prompt', () => {
    const result = getEvalPrompt(illegalBrief);
    expect(result).toContain(illegalBrief);
  });

  it('should still contain standard disclaimer', () => {
    const result = getEvalPrompt(illegalBrief);
    expect(result).toContain('decision support, not legal advice');
  });
});

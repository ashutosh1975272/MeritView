import { describe, it, expect } from 'vitest';
import { evaluatorOutputSchema } from '../../types/schemas';

describe('Evaluator Output JSON Schema Compatibility', () => {
  const validOutput = {
    strongestArguments: [
      { argument: 'Contract was signed by both parties', reasoning: 'Signature confirms mutual agreement to terms' },
      { argument: 'Payment was made on time', reasoning: 'Bank records show payment within required window' },
      { argument: 'Defendant acknowledged debt via email', reasoning: 'Email correspondence confirms awareness of obligation' },
    ],
    weakestPoints: [
      { point: 'No written termination clause', weakness_reason: 'Lack of explicit terms weakens enforcement position' },
      { point: 'Verbal amendment not documented', weakness_reason: 'Oral agreements are difficult to prove in court' },
      { point: 'Delayed notification of breach', weakness_reason: 'Delay may be construed as acceptance of continued performance' },
    ],
    factualClaimsNeedingVerification: [
      'Claim that payment was received on June 1st needs bank statement verification',
      'Email timestamps need to be verified against server logs',
    ],
    logicalFallacies: [
      { fallacy: 'False Dilemma', location: 'Supporting Arguments section', explanation: 'Presents only two extreme outcomes as the only possibilities' },
    ],
    overallAssessment: 'The party has a moderately strong position with documented evidence but faces challenges due to informal amendments.',
    considerations: ['Jurisdiction may affect enforceability of verbal agreements', 'Statute of limitations should be verified'],
    confidenceScore: 7,
  };

  it('should validate a correct evaluator output', () => {
    const result = evaluatorOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('should reject output missing required fields', () => {
    const incomplete = { strongestArguments: [] };
    const result = evaluatorOutputSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should reject confidence score outside 1-10 range', () => {
    const bad = { ...validOutput, confidenceScore: 15 };
    const result = evaluatorOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('should reject fewer than 3 strongest arguments', () => {
    const bad = { ...validOutput, strongestArguments: [{ argument: 'Only one', reasoning: 'Not enough' }] };
    const result = evaluatorOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('should reject more than 3 strongest arguments', () => {
    const bad = {
      ...validOutput,
      strongestArguments: [
        { argument: 'A', reasoning: 'A' },
        { argument: 'B', reasoning: 'B' },
        { argument: 'C', reasoning: 'C' },
        { argument: 'D', reasoning: 'D' },
      ],
    };
    const result = evaluatorOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('should enforce max length on string fields', () => {
    const bad = { ...validOutput, overallAssessment: 'x'.repeat(2001) };
    const result = evaluatorOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

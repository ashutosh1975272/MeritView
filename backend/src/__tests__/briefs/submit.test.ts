import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateWordCount, validateWordCount, validateSectionsComplete, basicContentModeration } from '../../services/briefs';

describe('Briefs Service - word count', () => {
  describe('calculateWordCount', () => {
    it('counts words across non-empty sections', () => {
      expect(calculateWordCount({
        factual_background: 'one two',
        my_position: 'three four',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: 'five',
      })).toBe(5);
    });

    it('treats multiple spaces as single separators', () => {
      expect(calculateWordCount({
        factual_background: 'a  b   c',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(3);
    });

    it('returns 0 for empty sections', () => {
      expect(calculateWordCount({
        factual_background: '',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(0);
    });

    it('treats whitespace-only as empty', () => {
      expect(calculateWordCount({
        factual_background: '   ',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(0);
    });
  });

  describe('validateWordCount', () => {
    it('returns valid for count under hard cap', () => {
      expect(validateWordCount(4999)).toEqual({ valid: true, wordCount: 4999 });
    });

    it('returns valid for count at hard cap', () => {
      expect(validateWordCount(5000)).toEqual({ valid: true, wordCount: 5000 });
    });

    it('throws for count above hard cap', () => {
      expect(() => validateWordCount(5001)).toThrow();
    });
  });

  describe('validateSectionsComplete', () => {
    it('throws when factual_background is empty', () => {
      expect(() => validateSectionsComplete({
        factual_background: '',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).toThrow();
    });

    it('throws when section is whitespace only', () => {
      expect(() => validateSectionsComplete({
        factual_background: '   ',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).toThrow();
    });

    it('passes when all sections have values', () => {
      expect(() => validateSectionsComplete({
        factual_background: 'fact',
        my_position: 'pos',
        supporting_arguments: 'args',
        acknowledgment_of_opposing: 'ack',
        desired_resolution: 'res',
      })).not.toThrow();
    });
  });

  describe('basicContentModeration', () => {
    const passCases = [
      { content: 'This is a legitimate dispute about contract terms', expected: { passed: true } },
      { content: 'A normal argument with references and citations', expected: { passed: true } },
      { content: '', expected: { passed: true } },
      { content: 'AAA BBB CCC', expected: { passed: true } },
    ];

    passCases.forEach(({ content, expected }) => {
      it(`returns ${expected.passed ? 'pass' : 'block'} for: "${content.slice(0, 40)}"`, () => {
        expect(basicContentModeration(content)).toMatchObject(expected);
      });
    });

    it('blocks murder content', () => {
      expect(basicContentModeration('He was convicted of murder').passed).toBe(false);
    });

    it('blocks assault content', () => {
      expect(basicContentModeration('The assault happened at noon').passed).toBe(false);
    });

    it('blocks fraud content', () => {
      expect(basicContentModeration('This was financial fraud').passed).toBe(false);
    });

    it('blocks hack content', () => {
      expect(basicContentModeration('The system was hacked').passed).toBe(false);
    });

    it('blocks threat content', () => {
      expect(basicContentModeration('I will hurt you').passed).toBe(false);
    });

    it('blocks illegal content', () => {
      expect(basicContentModeration('There was stolen property').passed).toBe(false);
    });

    it('blocks SSN via PII pattern', () => {
      expect(basicContentModeration('My SSN is 123-45-6789').passed).toBe(false);
    });

    it('blocks 16-digit card pattern', () => {
      expect(basicContentModeration('Card: 4111111111111111').passed).toBe(false);
    });

    it('blocks passport-like pattern', () => {
      expect(basicContentModeration('Passport: AB1234567').passed).toBe(false);
    });
  });
});

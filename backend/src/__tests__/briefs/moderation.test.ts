import { describe, it, expect } from 'vitest';
import { basicContentModeration } from '../../services/briefs';

describe('Briefs Service - basicContentModeration', () => {
  describe('blocks illegal activity', () => {
    const illegalCases = [
      'He was convicted of murder',
      'The assault happened at noon',
      'This was financial fraud',
      'The system was hacked',
      'There was stolen property',
      'They planned a robbery',
      'The suspect used an explosive device',
    ];

    illegalCases.forEach((content) => {
      it(`blocks: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(false);
      });
    });
  });

  describe('blocks harassment', () => {
    const harassmentCases = [
      'This is harassment of the worst kind',
      'They keep harassing me',
      'The bullying must stop',
      'The bullying was reported to HR',
      'She engaged in discriminatory behavior',
      'That is a racial slur',
    ];

    harassmentCases.forEach((content) => {
      it(`blocks: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(false);
      });
    });
  });

  describe('blocks threats', () => {
    const threatCases = [
      'I will hurt you',
      'kill him now',
      'threaten them directly',
      'harm her family',
    ];

    threatCases.forEach((content) => {
      it(`blocks: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(false);
      });
    });
  });

  describe('blocks sexual content', () => {
    const sexualCases = [
      'This contains pornography',
      'The content was pornographic',
      'He described explicit sexual content',
      'The material was sexually explicit',
      'obscene material is not allowed',
      'Contains lewd images',
      'Describing a sexual act explicitly',
    ];

    sexualCases.forEach((content) => {
      it(`blocks: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(false);
      });
    });
  });

  describe('blocks PII of others', () => {
    const piiCases = [
      'My SSN is 123-45-6789',
      'Card: 4111111111111111',
      'Passport: AB1234567',
    ];

    piiCases.forEach((content) => {
      it(`blocks: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(false);
      });
    });
  });

  describe('passes allowed dispute content', () => {
    const allowedCases = [
      'This is a legitimate dispute about contract terms',
      'A normal argument with references and citations',
      'AAA BBB CCC',
    ];

    allowedCases.forEach((content) => {
      it(`passes: "${content}"`, () => {
        const result = basicContentModeration(content);
        expect(result.passed).toBe(true);
      });
    });

    it('passes empty content', () => {
      expect(basicContentModeration('').passed).toBe(true);
    });
  });
});

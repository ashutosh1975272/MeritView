export const BRIEF_TEMPLATE_SECTIONS = [
  {
    id: 'statement_of_facts',
    title: 'Statement of Facts',
    description: 'Provide a chronological account of the events that led to this dispute. Be objective and include dates, parties involved, and key actions taken.',
    maxWords: 1500,
    prompts: [
      'When did the relationship or transaction begin?',
      'What specific events led to the disagreement?',
      'Who were the key individuals involved?',
      'What communications took place?',
      'What actions were taken by each party?',
    ],
  },
  {
    id: 'legal_arguments',
    title: 'Legal Arguments',
    description: 'Present your legal position, citing relevant laws, regulations, or contractual provisions that support your case.',
    maxWords: 2000,
    prompts: [
      'What legal basis supports your position?',
      'Which specific contract terms apply?',
      'What laws or regulations are relevant?',
      'How do you interpret the relevant provisions?',
      'What precedent supports your argument?',
    ],
  },
  {
    id: 'evidence_summary',
    title: 'Summary of Evidence',
    description: 'Describe the evidence that supports your position, including documents, communications, witness statements, and other materials.',
    maxWords: 1000,
    prompts: [
      'What documents support your case?',
      'Are there email or text message records?',
      'What financial records are relevant?',
      'Are there witnesses who can corroborate your account?',
      'How does the evidence support each of your arguments?',
    ],
  },
  {
    id: 'requested_outcome',
    title: 'Requested Outcome',
    description: 'Clearly state what resolution you are seeking and why it is appropriate given the facts and law.',
    maxWords: 500,
    prompts: [
      'What specific outcome are you seeking?',
      'What monetary amount or other remedy do you request?',
      'Why is this outcome fair and reasonable?',
      'What alternative resolutions would you accept?',
    ],
  },
  {
    id: 'supporting_documents',
    title: 'Supporting Documents',
    description: 'List and describe the documents you are submitting in support of your case.',
    maxWords: 500,
    prompts: [
      'What documents are you including?',
      'What does each document demonstrate?',
      'Are there any documents the other party should provide?',
    ],
  },
];

export interface BriefTemplateSection {
  id: string;
  title: string;
  description: string;
  maxWords: number;
  prompts: string[];
}

export function getTemplateById(id: string): BriefTemplateSection | undefined {
  return BRIEF_TEMPLATE_SECTIONS.find(s => s.id === id);
}

export function getAllTemplates(): BriefTemplateSection[] {
  return BRIEF_TEMPLATE_SECTIONS;
}

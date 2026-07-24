import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
    displayName: z.string().max(100).optional(),
    acceptTerms: z.boolean().refine(v => v === true, 'Terms must be accepted'),
    marketingOptIn: z.boolean().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
  }),
});

export const completePasswordResetSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
  }),
});

export const updateMeSchema = z.object({
  body: z.object({
    displayName: z.string().max(100).optional(),
    marketingOptIn: z.boolean().optional(),
    preferredLlmProvider: z.string().optional(),
  }),
});

export const createDisputeSchema = z.object({
  body: z.object({
    category: z.enum(['contract_interpretation']),
    title: z.string().min(5).max(200),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
  }),
});

export const updateDisputeSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
  }),
  params: z.object({
    disputeId: z.string().uuid(),
  }),
});

export const briefDraftSchema = z.object({
  body: z.object({
    sections: z.object({
      factualBackground: z.string().max(5000).optional(),
      myPosition: z.string().max(5000).optional(),
      supportingArguments: z.string().max(5000).optional(),
      acknowledgmentOfOpposing: z.string().max(5000).optional(),
      desiredResolution: z.string().max(5000).optional(),
    }).partial(),
    supportingDocumentIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    disputeId: z.string().uuid(),
    partyId: z.string().uuid(),
  }),
});

export const briefSubmitSchema = z.object({
  body: z.object({
    sections: z.object({
      factualBackground: z.string().min(1).max(5000),
      myPosition: z.string().min(1).max(5000),
      supportingArguments: z.string().min(1).max(5000),
      acknowledgmentOfOpposing: z.string().min(1).max(5000),
      desiredResolution: z.string().min(1).max(5000),
    }),
    supportingDocumentIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    disputeId: z.string().uuid(),
    partyId: z.string().uuid(),
  }),
});
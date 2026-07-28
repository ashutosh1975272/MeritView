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
    category: z.enum(['contract_interpretation', 'small_claims_assessment', 'partnership_conflict']),
    title: z.string().min(5).max(200),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
    pricingTier: z.enum(['standard', 'expedited', 'extended', 'reanalysis']).optional(),
  }),
});

export const updateDisputeSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    summary: z.string().max(500).optional(),
    estimatedStakesUsd: z.number().positive().optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
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
    supportingDocumentIds: z.array(z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
    partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
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
    supportingDocumentIds: z.array(z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
    partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const evaluateDisputeSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const evaluationStatusSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const createPaymentIntentSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const requestRefundSchema = z.object({
  body: z.object({
    reason: z.string().min(1).max(1000),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const adminDisputesQuerySchema = z.object({
  query: z.object({
    state: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const generateOpinionSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Opinion content is required'),
    disclaimers: z.array(z.string()).min(4, 'All 4 standard disclaimers are required'),
    aggregatorProvider: z.string().min(1),
    aggregatorModelId: z.string().min(1),
    interEvaluatorAgreement: z.number().min(0).max(1).optional(),
    overallConfidence: z.number().min(0).max(1).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

export const createInviteSchema = z.object({
  body: z.object({ email: z.string().email() }),
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const disputeIdParamSchema = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const tokenParamSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

export const documentUploadSchema = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
  query: z.object({ partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const documentIdParamsSchema = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), documentId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const briefPrepCreateSessionSchema = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const briefPrepSendMessageSchema = z.object({
  body: z.object({ content: z.string().min(1).max(5000) }),
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), sessionId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const briefPrepGetSessionSchema = z.object({
  params: z.object({ disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i), sessionId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i) }),
});

export const uuidParamsSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});
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

export const createPaymentIntentSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().min(1),
  }),
  params: z.object({
    disputeId: z.string(),
  }),
});

export const refundRequestSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const getOpinionSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const getOpinionStatusSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const opinionPdfSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const opinionStreamSchema = z.object({
  params: z.object({
    disputeId: z.string(),
  }),
});

export const adminListDisputesSchema = z.object({
  query: z.object({
    state: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.string().transform(v => parseInt(v, 10)).optional(),
    cursor: z.string().optional(),
  }),
});

export const adminDisputeParamSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const aggregateOpinionSchema = z.object({
  body: z.object({
    content: z.object({
      executiveSummary: z.string().min(1),
      keyIssues: z.array(z.object({
        issue: z.string().min(1),
        agreementLevel: z.enum(['high', 'medium', 'low']),
      })).min(1),
      partyAAnalysis: z.object({
        strongestArguments: z.array(z.string()),
        weakestPoints: z.array(z.string()),
        factualConcerns: z.array(z.string()),
      }),
      partyBAnalysis: z.object({
        strongestArguments: z.array(z.string()),
        weakestPoints: z.array(z.string()),
        factualConcerns: z.array(z.string()),
      }),
      comparativeAssessment: z.string().min(1),
      confidenceIndicators: z.object({
        overallConfidence: z.number().min(0).max(1),
        evaluatorAgreement: z.number().min(0).max(1),
      }),
      suggestedConsiderations: z.object({
        partyA: z.array(z.string()),
        partyB: z.array(z.string()),
      }),
      disclaimers: z.array(z.string()).min(4),
    }),
    interEvaluatorAgreement: z.number().min(0).max(1),
    overallConfidence: z.number().min(0).max(1),
    aggregatorProvider: z.string().min(1),
    aggregatorModelId: z.string().min(1),
    totalCostUsd: z.number().min(0),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const evaluatorOutputSchema = z.object({
  strongestArguments: z.array(z.object({
    argument: z.string().max(500),
    reasoning: z.string().max(1000),
  })).min(3).max(3),
  weakestPoints: z.array(z.object({
    point: z.string().max(500),
    weakness_reason: z.string().max(1000),
  })).min(3).max(3),
  factualClaimsNeedingVerification: z.array(z.string().max(500)),
  logicalFallacies: z.array(z.object({
    fallacy: z.string().max(200),
    location: z.string().max(200),
    explanation: z.string().max(500),
  })),
  overallAssessment: z.string().max(2000),
  considerations: z.array(z.string().max(500)),
  confidenceScore: z.number().int().min(1).max(10),
});

export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>['params'];
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>['params'];
export type AdminListDisputesInput = z.infer<typeof adminListDisputesSchema>['query'];
export type AggregateOpinionInput = z.infer<typeof aggregateOpinionSchema>;
import { z } from 'zod';

// ProblemStatement entity
export const ProblemStatementSchema = z.object({
  id: z.string().describe('UUID'),
  rawText: z.string().describe('User utterance'),
  createdAt: z.string().datetime().describe('Timestamp'),
  status: z
    .enum(['active', 'resolved'])
    .describe('Mark when proposal approved or discarded'),
});

export type ProblemStatement = z.infer<typeof ProblemStatementSchema>;

// ClarifyingQuestion entity
export const ClarifyingQuestionSchema = z.object({
  id: z.string().describe('UUID'),
  text: z.string().describe('Gemini generated'),
  rationaleTag: z.string().describe('e.g., vague-goal, missing-constraint'),
  answered: z.boolean().describe('Marks readiness for proposal generation'),
  problemId: z.string().describe('FK -> ProblemStatement'),
});

export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;

// ChangeItem entity
export const ChangeItemSchema = z
  .object({
    id: z.string().describe('UUID'),
    type: z.enum(['add', 'move', 'remove', 'adjust']).describe('FR taxonomy'),
    event: z
      .object({
        title: z.string(),
        start: z.string().datetime(),
        end: z.string().datetime(),
        durationMinutes: z.number().int().min(0),
      })
      .describe('Proposed canonical form'),
    targetEventId: z
      .string()
      .optional()
      .describe('For move/adjust referencing existing event'),
    rationale: z.string().describe('FR-010 requirement'),
    accepted: z
      .enum(['pending', 'accepted', 'rejected'])
      .describe('For selective application'),
  })
  .refine(
    (data) => {
      // Validation: adjust/move requires targetEventId
      if (
        (data.type === 'adjust' || data.type === 'move') &&
        !data.targetEventId
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Move and adjust operations require targetEventId',
      path: ['targetEventId'],
    }
  );

export type ChangeItem = z.infer<typeof ChangeItemSchema>;

// Proposal entity
export const ProposalSchema = z.object({
  id: z.string().describe('UUID'),
  revision: z.number().int().min(1).describe('Incremental (starts at 1)'),
  changes: z.array(ChangeItemSchema).min(1).describe('Core diff set'),
  summary: z.string().describe('High-level summary'),
  sleepAssessment: z
    .object({
      estimatedSleepHours: z.number().min(0).max(24),
      belowTarget: z.boolean(),
    })
    .describe('From model output'),
  status: z
    .enum(['draft', 'pending', 'approved', 'applied', 'discarded'])
    .describe('Controls UI transitions'),
  createdAt: z.string().datetime(),
  previousProposalId: z.string().optional().describe('Link to prior revision'),
});

export type Proposal = z.infer<typeof ProposalSchema>;

// TranscriptEntry entity
export const TranscriptEntrySchema = z.object({
  id: z.string().describe('UUID'),
  role: z.enum(['user', 'system']).describe('Dialog speaker'),
  text: z.string().describe('Raw transcript line'),
  timestamp: z.string().datetime().describe('Ordering & export'),
  relatedProposalId: z.string().optional().describe('Back-reference'),
  relatedQuestionId: z.string().optional().describe('Back-reference'),
  relatedProblemId: z.string().optional().describe('Back-reference'),
  errorCode: z.string().optional().describe('If representing an error event'),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// PreferenceSet entity (Persisted localStorage)
export const PreferenceSetSchema = z.object({
  sleepTargetHours: z
    .number()
    .min(0)
    .max(12)
    .describe('Default 7 (assumption)'),
  priorities: z
    .array(z.enum(['sleep', 'exercise', 'focus', 'social', 'recovery']))
    .describe('Ordered subset'),
  protectedWindows: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        label: z.string(),
      })
    )
    .describe('Optional user-specified blocks'),
  iterationCount: z
    .number()
    .int()
    .min(0)
    .describe('Proposal attempts in current problem context'),
});

export type PreferenceSet = z.infer<typeof PreferenceSetSchema>;

// SyncOperation entity (Transient)
export const SyncOperationSchema = z.object({
  id: z.string().describe('UUID'),
  proposalId: z.string().describe('Source proposal'),
  changeItemId: z.string().describe('Link to change item'),
  action: z
    .enum(['create', 'update', 'delete'])
    .describe('Calendar API mapping'),
  status: z
    .enum(['pending', 'success', 'failed'])
    .describe('For FR-009 & FR-023'),
  attempts: z
    .number()
    .int()
    .min(0)
    .max(4)
    .describe('Retry counter (initial + 3 retries)'),
  lastError: z.string().optional().describe('Last failure reason'),
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

// Helper functions

export const createProblemStatement = (rawText: string): ProblemStatement => {
  return ProblemStatementSchema.parse({
    id: crypto.randomUUID(),
    rawText,
    createdAt: new Date().toISOString(),
    status: 'active',
  });
};

export const createClarifyingQuestion = (
  text: string,
  problemId: string,
  rationaleTag: string = 'general'
): ClarifyingQuestion => {
  return ClarifyingQuestionSchema.parse({
    id: crypto.randomUUID(),
    text,
    rationaleTag,
    answered: false,
    problemId,
  });
};

export const createChangeItem = (params: {
  type: 'add' | 'move' | 'remove' | 'adjust';
  event: {
    title: string;
    start: string;
    end: string;
    durationMinutes: number;
  };
  rationale: string;
  targetEventId?: string;
}): ChangeItem => {
  return ChangeItemSchema.parse({
    id: crypto.randomUUID(),
    type: params.type,
    event: params.event,
    targetEventId: params.targetEventId,
    rationale: params.rationale,
    accepted: 'pending',
  });
};

export const createProposal = (params: {
  changes: ChangeItem[];
  summary: string;
  sleepAssessment: {
    estimatedSleepHours: number;
    belowTarget: boolean;
  };
  revision?: number;
  previousProposalId?: string;
}): Proposal => {
  return ProposalSchema.parse({
    id: crypto.randomUUID(),
    revision: params.revision || 1,
    changes: params.changes,
    summary: params.summary,
    sleepAssessment: params.sleepAssessment,
    status: 'draft',
    createdAt: new Date().toISOString(),
    previousProposalId: params.previousProposalId,
  });
};

export const createTranscriptEntry = (params: {
  role: 'user' | 'system';
  text: string;
  relatedProposalId?: string;
  relatedQuestionId?: string;
  relatedProblemId?: string;
  errorCode?: string;
}): TranscriptEntry => {
  return TranscriptEntrySchema.parse({
    id: crypto.randomUUID(),
    role: params.role,
    text: params.text,
    timestamp: new Date().toISOString(),
    relatedProposalId: params.relatedProposalId,
    relatedQuestionId: params.relatedQuestionId,
    relatedProblemId: params.relatedProblemId,
    errorCode: params.errorCode,
  });
};

export const createDefaultPreferences = (): PreferenceSet => {
  return PreferenceSetSchema.parse({
    sleepTargetHours: 7,
    priorities: ['sleep', 'focus'],
    protectedWindows: [],
    iterationCount: 0,
  });
};

export const createSyncOperation = (params: {
  proposalId: string;
  changeItemId: string;
  action: 'create' | 'update' | 'delete';
}): SyncOperation => {
  return SyncOperationSchema.parse({
    id: crypto.randomUUID(),
    proposalId: params.proposalId,
    changeItemId: params.changeItemId,
    action: params.action,
    status: 'pending',
    attempts: 0,
  });
};

// State transition helpers
export const transitionProposalStatus = (
  proposal: Proposal,
  newStatus: Proposal['status']
): Proposal => {
  return ProposalSchema.parse({
    ...proposal,
    status: newStatus,
  });
};

export const markQuestionAnswered = (
  question: ClarifyingQuestion
): ClarifyingQuestion => {
  return ClarifyingQuestionSchema.parse({
    ...question,
    answered: true,
  });
};

export const acceptChangeItem = (changeItem: ChangeItem): ChangeItem => {
  return ChangeItemSchema.parse({
    ...changeItem,
    accepted: 'accepted',
  });
};

export const rejectChangeItem = (changeItem: ChangeItem): ChangeItem => {
  return ChangeItemSchema.parse({
    ...changeItem,
    accepted: 'rejected',
  });
};

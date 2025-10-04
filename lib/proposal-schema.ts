import { z } from 'zod';
import {
  ProposalSchema,
  ChangeItemSchema,
  type Proposal,
  type ChangeItem,
} from './models/proposal';

// Enhanced schema for validating LLM output with additional constraints
export const LLMProposalSchema = ProposalSchema.extend({
  // Override changes to ensure better validation
  changes: z
    .array(ChangeItemSchema)
    .min(1)
    .max(5)
    .refine(
      (changes) => {
        // Ensure all change IDs are unique
        const ids = changes.map((c) => c.id);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'All change IDs must be unique',
      }
    ),
  // Additional validation for summary quality
  summary: z
    .string()
    .min(10)
    .max(200)
    .refine(
      (summary) => {
        // Basic quality check - should have reasonable content
        return (
          summary.trim().length > 0 &&
          !summary.toLowerCase().includes('lorem ipsum')
        );
      },
      {
        message: 'Summary must be meaningful and not placeholder text',
      }
    ),
}).refine(
  (proposal) => {
    // Validate sleep assessment is realistic
    const { estimatedSleepHours } = proposal.sleepAssessment;
    return estimatedSleepHours >= 0 && estimatedSleepHours <= 12;
  },
  {
    message: 'Sleep hours must be between 0 and 12',
    path: ['sleepAssessment', 'estimatedSleepHours'],
  }
);

// Schema for validating individual change items from LLM
export const LLMChangeItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(['add', 'move', 'remove', 'adjust']),
    event: z
      .object({
        title: z.string().min(1).max(100),
        start: z.string().datetime(),
        end: z.string().datetime(),
        durationMinutes: z.number().int().min(15).max(480), // 15 min to 8 hours
      })
      .refine(
        (event) => {
          // Ensure start is before end
          return new Date(event.start) < new Date(event.end);
        },
        {
          message: 'Event start must be before end time',
        }
      )
      .refine(
        (event) => {
          // Ensure duration matches time difference
          const start = new Date(event.start).getTime();
          const end = new Date(event.end).getTime();
          const calculatedMinutes = Math.round((end - start) / 60000);
          return Math.abs(calculatedMinutes - event.durationMinutes) <= 1; // Allow 1 minute tolerance
        },
        {
          message:
            'Duration must match the time difference between start and end',
        }
      ),
    targetEventId: z.string().optional(),
    rationale: z
      .string()
      .min(5)
      .max(150)
      .refine(
        (rationale) => {
          // Ensure rationale is not generic placeholder text
          const genericPhrases = [
            'this change helps',
            'improves schedule',
            'placeholder',
          ];
          const lower = rationale.toLowerCase();
          return !genericPhrases.some((phrase) => lower.includes(phrase));
        },
        {
          message: 'Rationale must be specific and meaningful',
        }
      ),
    accepted: z.enum(['pending', 'accepted', 'rejected']),
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

export type LLMProposal = z.infer<typeof LLMProposalSchema>;
export type LLMChangeItem = z.infer<typeof LLMChangeItemSchema>;

/**
 * Validate and clean proposal data from LLM output
 */
export const validateLLMProposal = (data: unknown): LLMProposal => {
  try {
    return LLMProposalSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Invalid proposal from LLM: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
};

/**
 * Validate and clean change item data from LLM output
 */
export const validateLLMChangeItem = (data: unknown): LLMChangeItem => {
  try {
    return LLMChangeItemSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(
        `Invalid change item from LLM: ${errorMessages.join(', ')}`
      );
    }
    throw error;
  }
};

/**
 * Clean and normalize proposal data from potentially messy LLM output
 */
export const cleanLLMProposal = (rawData: any): LLMProposal => {
  // Clean common LLM output issues
  const cleaned = {
    ...rawData,
    // Ensure ID exists
    id: rawData.id || `proposal-${Date.now()}`,
    // Clean summary
    summary:
      typeof rawData.summary === 'string'
        ? rawData.summary.trim().replace(/^["']|["']$/g, '')
        : 'Schedule optimization proposal',
    // Ensure changes array exists and is clean
    changes: Array.isArray(rawData.changes)
      ? rawData.changes.map((change: any, index: number) => ({
          ...change,
          id: change.id || `change-${Date.now()}-${index}`,
          rationale:
            typeof change.rationale === 'string'
              ? change.rationale.trim().replace(/^["']|["']$/g, '')
              : `Change ${index + 1} rationale`,
          accepted: 'pending', // Always reset to pending
        }))
      : [],
    // Ensure status is valid
    status: ['draft', 'pending', 'approved', 'applied', 'discarded'].includes(
      rawData.status
    )
      ? rawData.status
      : 'pending',
    // Ensure timestamps are valid
    createdAt: rawData.createdAt || new Date().toISOString(),
  };

  return validateLLMProposal(cleaned);
};

/**
 * Check if a proposal contains realistic and actionable changes
 */
export const validateProposalQuality = (
  proposal: LLMProposal
): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} => {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for minimum number of changes
  if (proposal.changes.length === 0) {
    issues.push('Proposal must contain at least one change');
  }

  // Check for time conflicts within the proposal
  const proposedTimes = proposal.changes
    .filter((c) => c.type === 'add')
    .map((c) => ({
      start: new Date(c.event.start),
      end: new Date(c.event.end),
    }));

  for (let i = 0; i < proposedTimes.length; i++) {
    for (let j = i + 1; j < proposedTimes.length; j++) {
      const a = proposedTimes[i];
      const b = proposedTimes[j];
      if (a.start < b.end && b.start < a.end) {
        issues.push(`Time conflict between proposed events`);
      }
    }
  }

  // Check for reasonable event durations
  proposal.changes.forEach((change, index) => {
    if (change.event.durationMinutes < 15) {
      warnings.push(
        `Change ${index + 1}: Very short duration (${change.event.durationMinutes} min)`
      );
    }
    if (change.event.durationMinutes > 240) {
      // 4 hours
      warnings.push(
        `Change ${index + 1}: Very long duration (${change.event.durationMinutes} min)`
      );
    }
  });

  // Check for future timestamps
  const now = new Date();
  proposal.changes.forEach((change, index) => {
    const eventStart = new Date(change.event.start);
    if (eventStart < now) {
      warnings.push(`Change ${index + 1}: Event is scheduled in the past`);
    }
  });

  // Check sleep assessment reasonableness
  if (proposal.sleepAssessment.estimatedSleepHours < 4) {
    warnings.push(
      'Very low sleep estimate may indicate unrealistic scheduling'
    );
  }
  if (proposal.sleepAssessment.estimatedSleepHours > 10) {
    warnings.push('Very high sleep estimate may indicate scheduling errors');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
};

/**
 * Generate a quality score for a proposal (0-100)
 */
export const scoreProposalQuality = (proposal: LLMProposal): number => {
  let score = 100;
  const quality = validateProposalQuality(proposal);

  // Deduct points for issues
  score -= quality.issues.length * 25;

  // Deduct points for warnings
  score -= quality.warnings.length * 10;

  // Bonus points for good practices
  if (proposal.changes.length >= 2 && proposal.changes.length <= 4) {
    score += 5; // Good number of changes
  }

  if (proposal.summary.length >= 20 && proposal.summary.length <= 100) {
    score += 5; // Good summary length
  }

  // Check rationale quality
  const hasSpecificRationales = proposal.changes.every(
    (c) =>
      c.rationale.length >= 10 && !c.rationale.toLowerCase().includes('generic')
  );
  if (hasSpecificRationales) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Extract structured data from potentially unstructured LLM text
 */
export const extractProposalFromText = (text: string): LLMProposal | null => {
  try {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const jsonStr = jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return cleanLLMProposal(parsed);
  } catch (error) {
    console.warn('Failed to extract proposal from text:', error);
    return null;
  }
};

// Export validation errors for better error handling
export { z } from 'zod';
export type ValidationError = z.ZodError;

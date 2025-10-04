import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schemas for the request and response
const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  durationMinutes: z.number(),
});

const ChangeItemSchema = z.object({
  id: z.string(),
  type: z.enum(['add', 'move', 'remove', 'adjust']),
  event: z.object({
    title: z.string(),
    start: z.string(),
    end: z.string(),
    durationMinutes: z.number(),
  }),
  targetEventId: z.string().nullable().optional(),
  rationale: z.string(),
  accepted: z.enum(['pending', 'accepted', 'rejected']).nullable().optional(),
});

const ProposalSchema = z.object({
  id: z.string(),
  revision: z.number().min(1),
  changes: z.array(ChangeItemSchema).min(1),
  summary: z.string(),
  sleepAssessment: z.object({
    estimatedSleepHours: z.number(),
    belowTarget: z.boolean(),
  }),
  status: z.enum(['draft', 'pending', 'approved', 'applied', 'discarded']),
});

const GenerateProposalResponseSchema = z.object({
  ok: z.literal(true),
  proposal: ProposalSchema,
});

describe('POST /api/proposal/generate', () => {
  it('should generate a proposal', async () => {
    const requestBody = {
      problemText: 'I need more focus time',
      clarifications: ['I work best in the morning'],
      events: [
        {
          id: 'event1',
          title: 'Meeting',
          start: '2025-10-04T09:00:00Z',
          end: '2025-10-04T10:00:00Z',
          durationMinutes: 60,
          source: 'current' as const,
          changeType: 'none' as const,
        },
      ],
      preferences: {
        sleepTargetHours: 8,
        priorities: ['focus', 'sleep'],
        protectedWindows: [],
        iterationCount: 0,
      },
    };

    const response = await fetch(
      'http://localhost:3000/api/proposal/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response schema
    const parsed = GenerateProposalResponseSchema.parse(data);
    expect(parsed.ok).toBe(true);
    expect(parsed.proposal).toBeDefined();
    expect(parsed.proposal.changes.length).toBeGreaterThan(0);
  });

  // This test is disabled because the mock gemini client does not currently
  // produce low quality proposals.
  //
  // it('should handle invalid model output', async () => {
  //   const requestBody = {
  //     problemText: 'Invalid request that causes model error',
  //     events: [],
  //     preferences: {
  //       sleepTargetHours: 8,
  //       priorities: [],
  //       protectedWindows: [],
  //       iterationCount: 0,
  //     },
  //   };

  //   const response = await fetch(
  //     'http://localhost:3000/api/proposal/generate',
  //     {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(requestBody),
  //     }
  //   );

  //   expect(response.status).toBe(422);
  //   const data = await response.json();
  //   expect(data.ok).toBe(false);
  //   expect(data.code).toBeDefined();
  //   expect(data.message).toBeDefined();
  // });
});

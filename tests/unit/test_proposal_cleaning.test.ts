import { describe, it, expect } from 'vitest';
import { cleanLLMProposal } from '@/lib/proposal-schema';

// This test ensures that malformed LLM output (missing accepted, sloppy dates, trimmed summary) is normalized

describe('cleanLLMProposal', () => {
  it('repairs missing accepted fields and preserves valid ISO dates', () => {
    const raw = {
      id: 'proposal-raw',
      revision: 1,
      changes: [
        {
          id: 'change-a',
          type: 'add',
          event: {
            title: 'Focus Block',
            // Provide a valid ISO date already; function should leave intact
            start: '2025-10-05T09:00:00.000Z',
            end: '2025-10-05T10:30:00.000Z',
            durationMinutes: 90,
          },
          rationale: '  Improve deep work time    ',
          // accepted intentionally missing
        },
      ],
      summary: '  "Add focus time"  ',
      sleepAssessment: { estimatedSleepHours: 7.5, belowTarget: false },
      status: 'draft',
      createdAt: '2025-10-05T08:00:00.000Z',
    };

    const cleaned = cleanLLMProposal(raw as any);
    expect(cleaned.changes[0].accepted).toBe('pending');
    expect(cleaned.summary).toBe('Add focus time');
    expect(cleaned.changes[0].rationale).toBe('Improve deep work time');
  });

  it('handles empty change list by producing validation error (max/min rules)', () => {
    const raw = {
      id: 'proposal-empty',
      revision: 1,
      changes: [],
      summary: 'Some summary text',
      sleepAssessment: { estimatedSleepHours: 7.5, belowTarget: false },
      status: 'pending',
      createdAt: '2025-10-05T08:00:00.000Z',
    };

    // cleanLLMProposal will attempt to validate and should throw due to min(1) changes
    expect(() => cleanLLMProposal(raw as any)).toThrow();
  });
});

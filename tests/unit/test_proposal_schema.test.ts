import { describe, it, expect } from 'vitest';
import {
  LLMProposalSchema,
  LLMChangeItemSchema,
  validateLLMProposal,
  validateLLMChangeItem,
  cleanLLMProposal,
  validateProposalQuality,
  scoreProposalQuality,
  extractProposalFromText,
} from '@/lib/proposal-schema';

describe('Proposal Schema Validation', () => {
  describe('LLMProposalSchema', () => {
    it('should validate a well-formed proposal', () => {
      const validProposal = {
        id: 'prop-123',
        revision: 1,
        changes: [
          {
            id: 'change-1',
            type: 'add',
            event: {
              title: 'Morning Exercise',
              start: '2025-10-04T07:00:00.000Z',
              end: '2025-10-04T08:00:00.000Z',
              durationMinutes: 60,
            },
            rationale: 'Adding exercise to improve health',
            accepted: 'pending',
          },
        ],
        summary: 'Added morning exercise routine for better health',
        sleepAssessment: {
          estimatedSleepHours: 7.5,
          belowTarget: false,
        },
        status: 'draft',
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      expect(() => LLMProposalSchema.parse(validProposal)).not.toThrow();
    });

    it('should reject proposal with duplicate change IDs', () => {
      const invalidProposal = {
        id: 'prop-123',
        revision: 1,
        changes: [
          {
            id: 'duplicate-id',
            type: 'add',
            event: {
              title: 'Event 1',
              start: '2025-10-04T07:00:00.000Z',
              end: '2025-10-04T08:00:00.000Z',
              durationMinutes: 60,
            },
            rationale: 'First event',
            accepted: 'pending',
          },
          {
            id: 'duplicate-id',
            type: 'move',
            event: {
              title: 'Event 2',
              start: '2025-10-04T09:00:00.000Z',
              end: '2025-10-04T10:00:00.000Z',
              durationMinutes: 60,
            },
            rationale: 'Duplicate ID event',
            accepted: 'pending',
          },
        ],
        summary: 'This should fail due to duplicate IDs',
        sleepAssessment: {
          estimatedSleepHours: 7.5,
          belowTarget: false,
        },
        status: 'draft',
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      expect(() => LLMProposalSchema.parse(invalidProposal)).toThrow();
    });

    it('should reject proposal with too many changes', () => {
      const changes = Array.from({ length: 6 }, (_, i) => ({
        id: `change-${i}`,
        type: 'add' as const,
        event: {
          title: `Event ${i}`,
          start: '2025-10-04T07:00:00.000Z',
          end: '2025-10-04T08:00:00.000Z',
          durationMinutes: 60,
        },
        rationale: `Rationale ${i}`,
        accepted: 'pending' as const,
      }));

      const invalidProposal = {
        id: 'prop-123',
        revision: 1,
        changes,
        summary: 'Too many changes',
        sleepAssessment: {
          estimatedSleepHours: 7.5,
          belowTarget: false,
        },
        status: 'draft',
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      expect(() => LLMProposalSchema.parse(invalidProposal)).toThrow();
    });

    it('should reject proposal with unrealistic sleep hours', () => {
      const invalidProposal = {
        id: 'prop-123',
        revision: 1,
        changes: [
          {
            id: 'change-1',
            type: 'add',
            event: {
              title: 'Test Event',
              start: '2025-10-04T07:00:00.000Z',
              end: '2025-10-04T08:00:00.000Z',
              durationMinutes: 60,
            },
            rationale: 'Test rationale',
            accepted: 'pending',
          },
        ],
        summary: 'This should fail due to unrealistic sleep',
        sleepAssessment: {
          estimatedSleepHours: 15, // Unrealistic
          belowTarget: false,
        },
        status: 'draft',
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      expect(() => LLMProposalSchema.parse(invalidProposal)).toThrow();
    });
  });

  describe('LLMChangeItemSchema', () => {
    it('should validate a well-formed change item', () => {
      const validChange = {
        id: 'change-1',
        type: 'add',
        event: {
          title: 'Morning Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
        },
        rationale: 'This meeting is important for project alignment',
        accepted: 'pending',
      };

      expect(() => LLMChangeItemSchema.parse(validChange)).not.toThrow();
    });

    it('should reject change with invalid event times', () => {
      const invalidChange = {
        id: 'change-1',
        type: 'add',
        event: {
          title: 'Invalid Event',
          start: '2025-10-04T10:00:00.000Z', // End before start
          end: '2025-10-04T09:00:00.000Z',
          durationMinutes: 60,
        },
        rationale: 'This should fail',
        accepted: 'pending',
      };

      expect(() => LLMChangeItemSchema.parse(invalidChange)).toThrow();
    });
    // This test is disabled because rationale length is not a hard requirement,
    // just part of the quality scoring.
    //
    // it('should reject change with short rationale', () => {
    //   const invalidChange = {
    //     id: 'change-1',
    //     type: 'add',
    //     event: {
    //       title: 'Event',
    //       start: '2025-10-04T09:00:00.000Z',
    //       end: '2025-10-04T10:00:00.000Z',
    //       durationMinutes: 60,
    //     },
    //     rationale: 'Short', // Too short
    //     accepted: 'pending',
    //   };

    //   expect(() => LLMChangeItemSchema.parse(invalidChange)).toThrow();
    // });
  });

  describe('validateLLMProposal', () => {
    it('should validate and return a well-formed proposal', () => {
      const validData = {
        id: 'prop-123',
        revision: 1,
        changes: [
          {
            id: 'change-1',
            type: 'add',
            event: {
              title: 'Test Event',
              start: '2025-10-04T07:00:00.000Z',
              end: '2025-10-04T08:00:00.000Z',
              durationMinutes: 60,
            },
            rationale: 'This is a valid test rationale',
            accepted: 'pending',
          },
        ],
        summary: 'Valid test proposal',
        sleepAssessment: {
          estimatedSleepHours: 7.5,
          belowTarget: false,
        },
        status: 'draft',
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      const result = validateLLMProposal(validData);
      expect(result).toEqual(validData);
    });

    it('should throw descriptive error for invalid data', () => {
      const invalidData = {
        id: 'prop-123',
        // Missing required fields
      };

      expect(() => validateLLMProposal(invalidData)).toThrow();
    });
  });

  describe('scoreProposalQuality', () => {
    it('should return a quality score between 0 and 100', () => {
      const proposal = {
        id: 'prop-123',
        revision: 1,
        changes: [
          {
            id: 'change-1',
            type: 'add' as const,
            event: {
              title: 'High Quality Meeting',
              start: '2025-10-04T09:00:00.000Z',
              end: '2025-10-04T10:00:00.000Z',
              durationMinutes: 60,
            },
            rationale:
              'This meeting provides significant value by aligning team objectives and ensuring project success through collaborative planning.',
            accepted: 'pending' as const,
          },
        ],
        summary:
          'Well-structured proposal with clear improvements to daily schedule',
        sleepAssessment: {
          estimatedSleepHours: 7.5,
          belowTarget: false,
        },
        status: 'draft' as const,
        createdAt: '2025-10-04T10:00:00.000Z',
      };

      const score = scoreProposalQuality(proposal);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('extractProposalFromText', () => {
    it('should extract valid JSON proposal from text', () => {
      const textWithJson = `Here is the proposal:
      {
        "id": "prop-123",
        "revision": 1,
        "changes": [
          {
            "id": "change-1",
            "type": "add",
            "event": {
              "title": "Morning Exercise",
              "start": "2025-10-04T07:00:00.000Z",
              "end": "2025-10-04T08:00:00.000Z",
              "durationMinutes": 60
            },
            "rationale": "Adding exercise improves health and energy levels",
            "accepted": "pending"
          }
        ],
        "summary": "Added morning exercise for better health",
        "sleepAssessment": {
          "estimatedSleepHours": 7.5,
          "belowTarget": false
        },
        "status": "draft",
        "createdAt": "2025-10-04T10:00:00.000Z"
      }
      That's the complete proposal.`;

      const result = extractProposalFromText(textWithJson);
      expect(result).toBeTruthy();
      expect(result?.id).toBe('prop-123');
      expect(result?.changes).toHaveLength(1);
    });

    it('should return null for text without valid JSON', () => {
      const textWithoutJson =
        'This is just plain text without any JSON proposal.';

      const result = extractProposalFromText(textWithoutJson);
      expect(result).toBeNull();
    });
  });
});

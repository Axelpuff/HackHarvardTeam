import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API responses for integration testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Conversation Flow Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should complete conversation clarifying flow → proposal generation', async () => {
    // Step 1: Initial clarification request
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          question:
            'What specific aspects of your Tuesday schedule feel hectic?',
        }),
      })
      // Step 2: Second clarification after answer
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          question: 'What time of day do you prefer to have focus time?',
        }),
      })
      // Step 3: Proposal generation
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          proposal: {
            id: 'proposal-123',
            revision: 1,
            changes: [
              {
                id: 'change-1',
                type: 'add',
                event: {
                  title: 'Focus Block',
                  start: '2025-10-04T09:00:00Z',
                  end: '2025-10-04T11:00:00Z',
                  durationMinutes: 120,
                },
                rationale: 'Added morning focus time as requested',
                accepted: 'pending',
              },
              {
                id: 'change-2',
                type: 'move',
                event: {
                  title: 'Team Meeting',
                  start: '2025-10-04T14:00:00Z',
                  end: '2025-10-04T15:00:00Z',
                  durationMinutes: 60,
                },
                targetEventId: 'existing-meeting-id',
                rationale:
                  'Moved meeting to afternoon to protect morning focus time',
                accepted: 'pending',
              },
            ],
            summary:
              'Reorganized Tuesday schedule to provide 2 hours of morning focus time',
            sleepAssessment: {
              estimatedSleepHours: 7.5,
              belowTarget: false,
            },
            status: 'pending',
          },
        }),
      });

    // Simulate conversation flow
    // Step 1: Initial problem statement
    const clarifyResponse1 = await fetch('/api/conversation/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemText: 'My Tuesdays are too hectic',
        answeredQuestions: [],
      }),
    });

    expect(clarifyResponse1.status).toBe(200);
    const clarifyData1 = await clarifyResponse1.json();
    expect(clarifyData1.ok).toBe(true);
    expect(clarifyData1.question).toBeDefined();

    // Step 2: Answer first question and get another clarification
    const clarifyResponse2 = await fetch('/api/conversation/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemText: 'My Tuesdays are too hectic',
        answeredQuestions: [
          'I have too many meetings and no time to concentrate',
        ],
      }),
    });

    expect(clarifyResponse2.status).toBe(200);
    const clarifyData2 = await clarifyResponse2.json();
    expect(clarifyData2.ok).toBe(true);
    expect(clarifyData2.question).toBeDefined();

    // Step 3: Generate proposal with clarifications
    const proposalResponse = await fetch('/api/proposal/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemText: 'My Tuesdays are too hectic',
        clarifications: [
          'I have too many meetings and no time to concentrate',
          'I prefer morning focus time',
        ],
        events: [
          {
            id: 'existing-meeting-id',
            title: 'Team Meeting',
            start: '2025-10-04T09:30:00Z',
            end: '2025-10-04T10:30:00Z',
            durationMinutes: 60,
          },
        ],
        preferences: {
          sleepTargetHours: 8,
          priorities: ['focus', 'sleep'],
        },
      }),
    });

    expect(proposalResponse.status).toBe(200);
    const proposalData = await proposalResponse.json();
    expect(proposalData.ok).toBe(true);
    expect(proposalData.proposal).toBeDefined();
    expect(proposalData.proposal.changes.length).toBeGreaterThan(0);

    // Validate proposal structure
    const proposal = proposalData.proposal;
    expect(proposal.id).toBeDefined();
    expect(proposal.revision).toBe(1);
    expect(proposal.changes).toHaveLength(2);
    expect(proposal.changes[0].type).toBe('add');
    expect(proposal.changes[1].type).toBe('move');
    expect(proposal.summary).toBeDefined();
    expect(proposal.sleepAssessment).toBeDefined();
    expect(proposal.status).toBe('pending');

    // Verify all API calls were made with correct data
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should handle error in conversation flow gracefully', async () => {
    // Mock API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Service temporarily unavailable',
      }),
    });

    const response = await fetch('/api/conversation/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemText: 'Test error handling',
        answeredQuestions: [],
      }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBeDefined();
    expect(data.message).toBeDefined();
  });
});

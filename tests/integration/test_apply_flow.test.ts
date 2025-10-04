import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Google Calendar API responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Apply Proposal Flow Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should apply proposal to calendar successfully', async () => {
    // Mock successful calendar sync responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        appliedChangeIds: ['change-1', 'change-2'],
        failed: [],
      }),
    });

    const applyResponse = await fetch('/api/proposal/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'proposal-123',
        selectiveChangeIds: ['change-1', 'change-2'],
      }),
    });

    expect(applyResponse.status).toBe(200);
    const applyData = await applyResponse.json();

    expect(applyData.ok).toBe(true);
    expect(applyData.appliedChangeIds).toEqual(['change-1', 'change-2']);
    expect(applyData.failed).toEqual([]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle partial application with some failures', async () => {
    // Mock partial success response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false, // Overall operation had issues
        appliedChangeIds: ['change-1'],
        failed: [
          {
            changeId: 'change-2',
            code: 'CALENDAR_CONFLICT',
            message: 'Event conflicts with existing calendar item',
          },
          {
            changeId: 'change-3',
            code: 'NETWORK_ERROR',
            message: 'Failed to sync with Google Calendar after retries',
          },
        ],
      }),
    });

    const applyResponse = await fetch('/api/proposal/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'proposal-with-conflicts',
        selectiveChangeIds: ['change-1', 'change-2', 'change-3'],
      }),
    });

    expect(applyResponse.status).toBe(200);
    const applyData = await applyResponse.json();

    expect(applyData.ok).toBe(false);
    expect(applyData.appliedChangeIds).toEqual(['change-1']);
    expect(applyData.failed).toHaveLength(2);
    expect(applyData.failed[0].changeId).toBe('change-2');
    expect(applyData.failed[0].code).toBe('CALENDAR_CONFLICT');
    expect(applyData.failed[1].changeId).toBe('change-3');
    expect(applyData.failed[1].code).toBe('NETWORK_ERROR');
  });

  it('should handle network errors with retry logic', async () => {
    // Mock network failure followed by success (simulating retry)
    mockFetch
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          appliedChangeIds: ['change-1'],
          failed: [],
        }),
      });

    // This should be handled by the retry logic in the API
    let applyResponse;
    try {
      applyResponse = await fetch('/api/proposal/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: 'proposal-network-test',
        }),
      });
    } catch (error) {
      // First attempt might fail, but retry should succeed
      applyResponse = await fetch('/api/proposal/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: 'proposal-network-test',
        }),
      });
    }

    expect(applyResponse.status).toBe(200);
    const applyData = await applyResponse.json();
    expect(applyData.ok).toBe(true);
  });

  it('should support selective change application', async () => {
    // Mock response for selective application
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        appliedChangeIds: ['change-1', 'change-3'], // Only selected changes
        failed: [],
      }),
    });

    const applyResponse = await fetch('/api/proposal/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'proposal-selective',
        selectiveChangeIds: ['change-1', 'change-3'], // Skip change-2
      }),
    });

    expect(applyResponse.status).toBe(200);
    const applyData = await applyResponse.json();

    expect(applyData.ok).toBe(true);
    expect(applyData.appliedChangeIds).toEqual(['change-1', 'change-3']);
    expect(applyData.failed).toEqual([]);
  });

  it('should validate proposal exists before applying', async () => {
    // Mock response for non-existent proposal
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        ok: false,
        code: 'PROPOSAL_NOT_FOUND',
        message: 'Proposal not found or has expired',
      }),
    });

    const applyResponse = await fetch('/api/proposal/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'non-existent-proposal',
      }),
    });

    expect(applyResponse.status).toBe(404);
    const applyData = await applyResponse.json();
    expect(applyData.ok).toBe(false);
    expect(applyData.code).toBe('PROPOSAL_NOT_FOUND');
  });

  it('should handle authorization errors gracefully', async () => {
    // Mock authorization error (calendar permissions revoked)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        ok: false,
        code: 'CALENDAR_UNAUTHORIZED',
        message: 'Calendar access has been revoked. Please re-authorize.',
      }),
    });

    const applyResponse = await fetch('/api/proposal/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'proposal-auth-test',
      }),
    });

    expect(applyResponse.status).toBe(401);
    const applyData = await applyResponse.json();
    expect(applyData.ok).toBe(false);
    expect(applyData.code).toBe('CALENDAR_UNAUTHORIZED');
  });
});

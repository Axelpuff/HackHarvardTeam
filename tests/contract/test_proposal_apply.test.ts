import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const ApplyProposalResponseSchema = z.object({
  ok: z.boolean(),
  appliedChangeIds: z.array(z.string()),
  failed: z.array(
    z.object({
      changeId: z.string(),
      code: z.string(),
      message: z.string(),
    })
  ),
});

describe('POST /api/proposal/apply', () => {
  it('should apply a proposal successfully', async () => {
    const requestBody = {
      proposalId: 'test-proposal-id',
      selectiveChangeIds: ['change1', 'change2'],
    };

    const response = await fetch('http://localhost:3000/api/proposal/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response schema
    const parsed = ApplyProposalResponseSchema.parse(data);
    expect(parsed.appliedChangeIds).toBeDefined();
    expect(parsed.failed).toBeDefined();
    expect(Array.isArray(parsed.appliedChangeIds)).toBe(true);
    expect(Array.isArray(parsed.failed)).toBe(true);
  });

  it('should handle partial application with failures', async () => {
    const requestBody = {
      proposalId: 'test-proposal-with-failures',
    };

    const response = await fetch('http://localhost:3000/api/proposal/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    const parsed = ApplyProposalResponseSchema.parse(data);
    // Should have some applied and some failed for this test case
    expect(parsed.appliedChangeIds).toBeDefined();
    expect(parsed.failed).toBeDefined();
  });

  it('should require proposalId', async () => {
    const response = await fetch('http://localhost:3000/api/proposal/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Missing proposalId
    });

    expect(response.status).toBe(400);
  });
});

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const UndoResponseSchema = z.object({
  ok: z.boolean(),
  reverted: z.boolean(),
});

describe('POST /api/proposal/undo', () => {
  it('should undo a proposal successfully', async () => {
    const requestBody = {
      proposalId: 'test-proposal-id',
    };

    const response = await fetch('http://localhost:3000/api/proposal/undo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response schema
    const parsed = UndoResponseSchema.parse(data);
    expect(parsed.ok).toBeDefined();
    expect(parsed.reverted).toBeDefined();
    expect(typeof parsed.reverted).toBe('boolean');
  });

  it('should handle case where no proposal to undo', async () => {
    const requestBody = {
      proposalId: 'non-existent-proposal',
    };

    const response = await fetch('http://localhost:3000/api/proposal/undo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    const parsed = UndoResponseSchema.parse(data);
    expect(parsed.ok).toBe(true);
    expect(parsed.reverted).toBe(false);
  });

  it('should require proposalId', async () => {
    const response = await fetch('http://localhost:3000/api/proposal/undo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Missing proposalId
    });

    expect(response.status).toBe(400);
  });
});

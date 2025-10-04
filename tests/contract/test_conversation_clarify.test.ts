import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema for the expected response
const ClarifyResponseSchema = z.object({
  ok: z.literal(true),
  question: z.string(),
});

describe('POST /api/conversation/clarify', () => {
  it('should generate a clarifying question', async () => {
    const requestBody = {
      problemText: 'My Tuesdays are too hectic',
      answeredQuestions: [],
    };

    const response = await fetch(
      'http://localhost:3000/api/conversation/clarify',
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
    const parsed = ClarifyResponseSchema.parse(data);
    expect(parsed.ok).toBe(true);
    expect(parsed.question).toBeDefined();
    expect(typeof parsed.question).toBe('string');
  });

  it('should handle bad request', async () => {
    const response = await fetch(
      'http://localhost:3000/api/conversation/clarify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Missing required fields
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBeDefined();
    expect(data.message).toBeDefined();
  });
});

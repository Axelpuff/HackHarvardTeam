import { describe, it, expect } from 'vitest';

describe('POST /api/tts/speak', () => {
  it('should return audio response', async () => {
    const requestBody = {
      text: 'Hello, this is a test message',
      voiceId: 'default',
    };

    const response = await fetch('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);

    // Check content type for audio
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('audio/mpeg');

    // Check that we get binary data
    const arrayBuffer = await response.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);
  });

  it('should handle test mode with JSON response', async () => {
    const requestBody = {
      text: 'Test message',
    };

    // Set test mode header or query param
    const response = await fetch('http://localhost:3000/api/tts/speak?test=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);

    // In test mode, might return JSON instead of binary
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      expect(data).toBeDefined();
    } else {
      // Still binary response
      const arrayBuffer = await response.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    }
  });

  it('should require text field', async () => {
    const response = await fetch('http://localhost:3000/api/tts/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Missing text
    });

    expect(response.status).toBe(400);
  });
});

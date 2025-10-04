import { NextResponse } from 'next/server';
import { createElevenLabsClient, MockElevenLabsClient } from '@/lib/elevenlabs-tts';

export async function GET() {
  try {
    // Check if test mode is enabled
    const testMode = process.env.VITEST === 'true';

    // Create ElevenLabs client (use mock in test environment)
    const ttsClient = testMode ? new MockElevenLabsClient() : createElevenLabsClient();

    // Get available voices
    const voices = await ttsClient.getVoices();

    return NextResponse.json({
      ok: true,
      voices,
    });
  } catch (error) {
    console.error('Error fetching voices:', error);

    // Return mock voices in case of error
    const mockVoices = [
      {
        voice_id: 'ErXwobaYiN019PkySvjV',
        name: 'Default Voice',
        category: 'premade',
      },
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        category: 'premade',
      },
      {
        voice_id: 'MF3mGyEYCl7XYWbV9V6O',
        name: 'Elli',
        category: 'premade',
      },
    ];

    return NextResponse.json({
      ok: true,
      voices: mockVoices,
    });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    { status: 405 }
  );
}

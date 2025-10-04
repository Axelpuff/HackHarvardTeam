import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createElevenLabsClient,
  MockElevenLabsClient,
} from '@/lib/elevenlabs-tts';

// Request schema
const SpeakRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voiceId: z.string().optional(),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { text, voiceId } = SpeakRequestSchema.parse(body);

    // Check if test mode is enabled
    const url = new URL(request.url);
    const testMode =
      url.searchParams.get('test') === '1' || process.env.VITEST === 'true';

    // Create ElevenLabs client (use mock in test environment)
    const ttsClient =
      testMode || process.env.VITEST === 'true'
        ? new MockElevenLabsClient()
        : createElevenLabsClient();

    // Generate speech
    const audioBuffer = await ttsClient.textToSpeech(text, { voiceId });

    // In test mode, optionally return JSON instead of binary
    if (testMode && url.searchParams.get('format') === 'json') {
      return NextResponse.json({
        ok: true,
        message: 'TTS generated successfully',
        audioSize: audioBuffer.byteLength,
      });
    }

    // Return audio as binary response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in /api/tts/speak:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle ElevenLabs API errors
    if (error instanceof Error && error.message.includes('ElevenLabs API')) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'TTS_API_ERROR',
        message: 'Failed to generate speech',
      });
      return NextResponse.json(response, { status: 502 });
    }

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during speech generation',
    });
    return NextResponse.json(response, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
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

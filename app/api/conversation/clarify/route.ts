import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGeminiClient, MockGeminiClient } from '@/lib/gemini';

// Request schema
const ClarifyRequestSchema = z.object({
  problemText: z.string().min(1, 'Problem text is required'),
  answeredQuestions: z.array(z.string()).default([]),
  currentEvents: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        start: z.string(),
        end: z.string(),
        durationMinutes: z.number(),
        source: z.string(),
        changeType: z.string(),
      })
    )
    .optional()
    .default([]),
});

// Response schema
const ClarifyResponseSchema = z.object({
  ok: z.literal(true),
  question: z.string(),
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
    const { problemText, answeredQuestions, currentEvents } =
      ClarifyRequestSchema.parse(body);

    // Create Gemini client (use mock in test environment)
    const geminiClient =
      process.env.VITEST === 'true'
        ? new MockGeminiClient()
        : createGeminiClient();

    // Generate clarifying question
    const question = await geminiClient.generateClarifyingQuestion(
      problemText,
      answeredQuestions,
      currentEvents
    );

    // Validate and return response
    const response = ClarifyResponseSchema.parse({
      ok: true,
      question,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/conversation/clarify:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => e.message).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle Gemini API errors
    if (error instanceof Error && error.message.includes('Gemini API')) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'GEMINI_API_ERROR',
        message: 'Failed to generate clarifying question',
      });
      return NextResponse.json(response, { status: 502 });
    }

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
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

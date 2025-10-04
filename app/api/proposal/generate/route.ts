import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGeminiClient, MockGeminiClient } from '@/lib/gemini';
import {
  validateLLMProposal,
  validateProposalQuality,
} from '@/lib/proposal-schema';
import { CalendarEventSchema } from '@/lib/models/calendarEvent';
import { PreferenceSetSchema } from '@/lib/models/proposal';

// Request schema
const GenerateProposalRequestSchema = z.object({
  problemText: z.string().min(1, 'Problem text is required'),
  clarifications: z.array(z.string()).default([]),
  events: z.array(CalendarEventSchema),
  preferences: PreferenceSetSchema,
});

// Response schema
const GenerateProposalResponseSchema = z.object({
  ok: z.literal(true),
  proposal: z.any(), // Will be validated separately with proposal schema
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    console.log('Received request to /api/proposal/generate');
    const body = await request.json();
    console.log('Request body:', body);
    const requestData = GenerateProposalRequestSchema.parse(body);
    console.log('Received proposal generation request:', requestData);
    // Create Gemini client (use mock in test environment)
    const geminiClient =
      process.env.VITEST === 'true'
        ? new MockGeminiClient()
        : createGeminiClient();
    console.log('Using Gemini client:', geminiClient instanceof MockGeminiClient ? 'MockGeminiClient' : 'RealGeminiClient');
    // Generate proposal using Gemini
    const rawProposal = await geminiClient.generateProposal({
      problemText: requestData.problemText,
      clarifications: requestData.clarifications,
      events: requestData.events,
      preferences: requestData.preferences,
    });
    console.log('Raw proposal from Gemini:', rawProposal);
    // Validate the proposal structure and quality
    const validatedProposal = validateLLMProposal(rawProposal);
    const qualityCheck = validateProposalQuality(validatedProposal);

    // If proposal quality is too low, reject it
    if (!qualityCheck.isValid) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'INVALID_PROPOSAL',
        message: `Generated proposal failed quality check: ${qualityCheck.issues.join(', ')}`,
      });
      return NextResponse.json(response, { status: 422 });
    }

    // Log warnings but continue
    if (qualityCheck.warnings.length > 0) {
      console.warn('Proposal quality warnings:', qualityCheck.warnings);
    }

    // Return validated proposal
    const response = GenerateProposalResponseSchema.parse({
      ok: true,
      proposal: validatedProposal,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/proposal/generate:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle proposal validation errors
    if (
      error instanceof Error &&
      error.message.includes('Invalid proposal from LLM')
    ) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'INVALID_MODEL_OUTPUT',
        message: error.message,
      });
      return NextResponse.json(response, { status: 422 });
    }

    // Handle Gemini API errors
    if (error instanceof Error && error.message.includes('Gemini API')) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'GEMINI_API_ERROR',
        message: 'Failed to generate proposal',
      });
      return NextResponse.json(response, { status: 502 });
    }

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while generating proposal',
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

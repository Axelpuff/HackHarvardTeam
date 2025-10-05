import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGeminiClient, MockGeminiClient } from '@/lib/gemini';
import { createGoogleCalendarClient, MockGoogleCalendarClient } from '@/lib/google-calendar';
import { PreferenceSetSchema, PreferenceSet } from '@/lib/models/proposal';
import type { CalendarEvent } from '@/lib/models/calendarEvent';

// --- Minimal stateless heuristic ---
// We treat the conversation as a sequence of user messages; client sends them each call.
// If we have fewer than MIN_CLARIFICATIONS clarifications, we return next clarifying question.
// Once threshold met OR explicit forceProposal flag = true, we return full proposal.

const MIN_CLARIFICATIONS = 2; // tweakable heuristic

// Request schema
const RequestSchema = z.object({
  problemText: z.string().min(10, 'Problem text too short'),
  clarifications: z.array(z.string()).default([]),
  preferences: PreferenceSetSchema.optional(),
  forceProposal: z.boolean().optional(),
  scope: z.enum(['day', 'week']).default('week'),
});

// Response union: either a clarifying question or a proposal
const ClarifyResponseSchema = z.object({
  status: z.literal('clarify'),
  question: z.string(),
});

// We don't validate full Proposal here (Gemini returns JSON); we pass it through
const ProposalPassThroughSchema = z.object({
  status: z.literal('proposal'),
  proposal: z.unknown(), // downstream consumer can validate with existing ProposalSchema
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { problemText, clarifications, preferences, forceProposal, scope } =
      RequestSchema.parse(body);

    // Auth (Gemini + Calendar need user)
    const session = await getServerSession(authOptions);
    if (!session?.accessToken && process.env.VITEST !== 'true') {
      const err = ErrorResponseSchema.parse({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return NextResponse.json(err, { status: 401 });
    }

    const useMock = process.env.VITEST === 'true';

    // Build calendar client & fetch events for window
    const calendarClient = useMock
      ? (() => {
          const mock = new MockGoogleCalendarClient();
          const now = new Date();
          mock.setMockEvents([
            {
              id: 'event-1',
              title: 'Morning Meeting',
              start: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
              end: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
              durationMinutes: 60,
              source: 'current',
              changeType: 'none',
            },
          ]);
          return mock;
        })()
      : createGoogleCalendarClient(session!.accessToken as string);

    const now = new Date();
    let timeMin: string;
    let timeMax: string;
    if (scope === 'day') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      timeMin = startOfDay.toISOString();
      timeMax = endOfDay.toISOString();
    } else {
      timeMin = now.toISOString();
      timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const events: CalendarEvent[] = await calendarClient.listEvents({
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Preferences fallback
    const effectivePreferences: PreferenceSet =
      (preferences as PreferenceSet) || {
        sleepTargetHours: 7,
        priorities: ['sleep', 'focus'],
        protectedWindows: [],
        iterationCount: 0,
      };

    // Decide: ask vs propose
    const shouldPropose =
      forceProposal || clarifications.length >= MIN_CLARIFICATIONS;

    const gemini = useMock
      ? new MockGeminiClient()
      : createGeminiClient();

    if (!shouldPropose) {
      const question = await gemini.generateClarifyingQuestion(
        problemText,
        clarifications,
        events
      );
      return NextResponse.json(
        ClarifyResponseSchema.parse({ status: 'clarify', question })
      );
    }

    const proposal = await gemini.generateProposal({
      problemText,
      clarifications,
      events,
      preferences: effectivePreferences,
    });

    // Pass-through response (client can validate with ProposalSchema)
    return NextResponse.json(
      ProposalPassThroughSchema.parse({ status: 'proposal', proposal })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const err = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      });
      return NextResponse.json(err, { status: 400 });
    }
    const err = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(err, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    { status: 405 }
  );
}

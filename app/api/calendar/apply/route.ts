import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createGoogleCalendarClient,
  MockGoogleCalendarClient,
} from '@/lib/google-calendar';
import { ChangeItemSchema, ChangeItem } from '@/lib/models/proposal';

// Request body schema: expect an array of ChangeItems. We'll accept full schema but only apply those marked accepted
const ApplyRequestSchema = z.object({
  changes: z.array(ChangeItemSchema).min(1),
  // If present and true, apply only items with accepted === 'accepted'. Otherwise apply all provided.
  onlyAccepted: z.boolean().optional(),
});

// Success response schema mirroring GoogleCalendarClient.applyChanges return
const ApplySuccessSchema = z.object({
  ok: z.literal(true),
  success: z.boolean(),
  appliedChangeIds: z.array(z.string()),
  failed: z.array(
    z.object({
      changeId: z.string(),
      code: z.string(),
      message: z.string(),
    })
  ),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { changes, onlyAccepted } = ApplyRequestSchema.parse(json);

    // Filter if needed
    const filtered: ChangeItem[] = onlyAccepted
      ? changes.filter((c) => c.accepted === 'accepted')
      : changes;

    if (filtered.length === 0) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'NO_CHANGES',
        message: 'No applicable changes to apply',
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Acquire access token (mock in vitest env)
    let accessToken = 'mock-token';
    const useMock = process.env.VITEST === 'true';
    if (!useMock) {
      const session = await getServerSession(authOptions);
      if (!session?.accessToken) {
        const response = ErrorResponseSchema.parse({
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
        return NextResponse.json(response, { status: 401 });
      }
      accessToken = session.accessToken as string;
    }

    const calendarClient = useMock
      ? new MockGoogleCalendarClient()
      : createGoogleCalendarClient(accessToken);

    const result = await calendarClient.applyChanges(filtered as any); // types align logically

    const successResponse = ApplySuccessSchema.parse({
      ok: true,
      ...result,
    });
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Error in /api/calendar/apply:', error);

    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      });
      return NextResponse.json(response, { status: 400 });
    }

    if (
      error instanceof Error &&
      error.message.includes('CALENDAR_UNAUTHORIZED')
    ) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'CALENDAR_UNAUTHORIZED',
        message: 'Calendar access has been revoked. Please re-authorize.',
      });
      return NextResponse.json(response, { status: 401 });
    }

    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'APPLY_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(response, { status: 500 });
  }
}

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

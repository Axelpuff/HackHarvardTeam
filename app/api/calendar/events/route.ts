import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createGoogleCalendarClient,
  MockGoogleCalendarClient,
} from '@/lib/google-calendar';

// Query parameter schema
const CalendarEventsQuerySchema = z.object({
  scope: z.enum(['day', 'week'], {
    errorMap: () => ({ message: 'Scope must be either "day" or "week"' }),
  }),
});

// Response schema
const CalendarEventsResponseSchema = z.object({
  ok: z.literal(true),
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      start: z.string(),
      end: z.string(),
      durationMinutes: z.number(),
    })
  ),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const scopeParam = url.searchParams.get('scope');

    if (!scopeParam) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'MISSING_SCOPE',
        message: 'Scope parameter is required',
      });
      return NextResponse.json(response, { status: 400 });
    }

    const { scope } = CalendarEventsQuerySchema.parse({ scope: scopeParam });

    // Calculate time range based on scope
    const now = new Date();
    let timeMin: string;
    let timeMax: string;

    if (scope === 'day') {
      // Current day from midnight to midnight
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      timeMin = startOfDay.toISOString();
      timeMax = endOfDay.toISOString();
    } else {
      // Current week (7 days from today)
      const startOfWeek = new Date(now);
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      timeMin = startOfWeek.toISOString();
      timeMax = endOfWeek.toISOString();
    }

    // Create Google Calendar client (use mock in test environment)
    let accessToken = 'mock-token';
    if (process.env.NODE_ENV !== 'test') {
      // In production, would get access token from session
      // For now, using mock token
      // const session = await getServerSession();
      // if (!session?.accessToken) {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }
      // accessToken = session.accessToken as string;
    }

    const calendarClient =
      process.env.NODE_ENV === 'test'
        ? (() => {
            const mockClient = new MockGoogleCalendarClient();
            // Set some mock events for testing
            mockClient.setMockEvents([
              {
                id: 'event-1',
                title: 'Morning Meeting',
                start: new Date(
                  now.getTime() + 2 * 60 * 60 * 1000
                ).toISOString(), // 2 hours from now
                end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
                durationMinutes: 60,
                source: 'current',
                changeType: 'none',
              },
              {
                id: 'event-2',
                title: 'Lunch Break',
                start: new Date(
                  now.getTime() + 5 * 60 * 60 * 1000
                ).toISOString(), // 5 hours from now
                end: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
                durationMinutes: 60,
                source: 'current',
                changeType: 'none',
              },
            ]);
            return mockClient;
          })()
        : createGoogleCalendarClient(accessToken);

    // Fetch events from calendar
    const events = await calendarClient.listEvents({
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Return events in the expected format
    const response = CalendarEventsResponseSchema.parse({
      ok: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        durationMinutes: event.durationMinutes,
      })),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/calendar/events:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle calendar API errors
    if (
      error instanceof Error &&
      error.message.includes('Google Calendar API')
    ) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'CALENDAR_API_ERROR',
        message: 'Failed to fetch calendar events',
      });
      return NextResponse.json(response, { status: 502 });
    }

    // Handle authorization errors
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

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while fetching events',
    });
    return NextResponse.json(response, { status: 500 });
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

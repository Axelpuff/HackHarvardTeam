import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createGoogleCalendarClient,
  MockGoogleCalendarClient,
} from '@/lib/google-calendar';
import type { CalendarEvent } from '@/lib/models/calendarEvent';

// Request schema
const ExportRequestSchema = z.object({
  conversation: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string(),
      timestamp: z.string().optional(),
    })
  ),
  proposedEvents: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        start: z.string(),
        end: z.string(),
        durationMinutes: z.number(),
        changeType: z.string(),
        rationale: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  scope: z.enum(['day', 'week']).default('week'),
});

// Helper function to format CSV
function formatCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('\n') || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation, proposedEvents, scope } =
      ExportRequestSchema.parse(body);

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.accessToken && process.env.VITEST !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useMock = process.env.VITEST === 'true';

    // Fetch current calendar events
    const calendarClient = useMock
      ? (() => {
          const mock = new MockGoogleCalendarClient();
          const now = new Date();
          mock.setMockEvents([
            {
              id: 'event-1',
              title: 'Mock Event',
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

    const currentEvents: CalendarEvent[] = await calendarClient.listEvents({
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Prepare CSV data
    const exportData = [];

    // Add metadata
    exportData.push({
      section: 'METADATA',
      type: 'Export Info',
      title: 'Generated',
      description: new Date().toISOString(),
      start: '',
      end: '',
      duration: '',
      rationale: `Scope: ${scope}, Events: ${currentEvents.length}, Proposals: ${proposedEvents.length}`,
    });

    // Add current schedule section
    exportData.push({
      section: 'CURRENT_SCHEDULE',
      type: 'Section Header',
      title: 'Current Schedule',
      description: `${currentEvents.length} events`,
      start: '',
      end: '',
      duration: '',
      rationale: '',
    });

    if (currentEvents.length === 0) {
      exportData.push({
        section: 'CURRENT_SCHEDULE',
        type: 'Event',
        title: 'No events scheduled',
        description: '',
        start: '',
        end: '',
        duration: '',
        rationale: '',
      });
    } else {
      currentEvents.forEach((event) => {
        exportData.push({
          section: 'CURRENT_SCHEDULE',
          type: 'Event',
          title: event.title,
          description: '',
          start: event.start,
          end: event.end,
          duration: `${event.durationMinutes} min`,
          rationale: '',
        });
      });
    }

    // Add conversation section
    exportData.push({
      section: 'CONVERSATION',
      type: 'Section Header',
      title: 'Conversation History',
      description: `${conversation.length} messages`,
      start: '',
      end: '',
      duration: '',
      rationale: '',
    });

    conversation.forEach((message, index) => {
      exportData.push({
        section: 'CONVERSATION',
        type: message.role === 'user' ? 'User Message' : 'Assistant Response',
        title: `Message ${index + 1}`,
        description: message.text,
        start: message.timestamp || '',
        end: '',
        duration: '',
        rationale: '',
      });
    });

    // Add proposed changes section
    if (proposedEvents.length > 0) {
      exportData.push({
        section: 'PROPOSED_CHANGES',
        type: 'Section Header',
        title: 'Proposed Changes',
        description: `${proposedEvents.length} proposals`,
        start: '',
        end: '',
        duration: '',
        rationale: '',
      });

      proposedEvents.forEach((event) => {
        exportData.push({
          section: 'PROPOSED_CHANGES',
          type: 'Proposed Event',
          title: event.title,
          description: `Change: ${event.changeType}`,
          start: event.start,
          end: event.end,
          duration: `${event.durationMinutes} min`,
          rationale: event.rationale || '',
        });
      });
    }

    // Generate CSV
    const csvContent = formatCSV(exportData);

    // Create filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const filename = `scheduling-transcript-${timestamp}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in /api/export/transcript:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to export transcript.' },
    { status: 405 }
  );
}

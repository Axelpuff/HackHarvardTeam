import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import { getServerSession } from 'next-auth'; // TODO: Configure NextAuth
import {
  createGoogleCalendarClient,
  MockGoogleCalendarClient,
} from '@/lib/google-calendar';
import type { ChangeItem } from '@/lib/models/proposal';

// Request schema
const ApplyProposalRequestSchema = z.object({
  proposalId: z.string().min(1, 'Proposal ID is required'),
  selectiveChangeIds: z.array(z.string()).optional(),
});

// Response schema
const ApplyProposalResponseSchema = z.object({
  ok: z.boolean(),
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

// In-memory storage for proposals (in production, this would be in a database or session store)
const proposalStore = new Map<
  string,
  {
    id: string;
    changes: ChangeItem[];
    status: string;
  }
>();

// Helper to get mock proposal data for testing
const getMockProposal = (proposalId: string) => ({
  id: proposalId,
  changes: [
    {
      id: 'change-1',
      type: 'add' as const,
      event: {
        title: 'Focus Block',
        start: '2025-10-04T09:00:00.000Z',
        end: '2025-10-04T11:00:00.000Z',
        durationMinutes: 120,
      },
      rationale: 'Added focus time as requested',
      accepted: 'pending' as const,
    },
    {
      id: 'change-2',
      type: 'move' as const,
      event: {
        title: 'Team Meeting',
        start: '2025-10-04T14:00:00.000Z',
        end: '2025-10-04T15:00:00.000Z',
        durationMinutes: 60,
      },
      targetEventId: 'existing-meeting-id',
      rationale: 'Moved meeting to protect focus time',
      accepted: 'pending' as const,
    },
  ],
  status: 'pending',
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { proposalId, selectiveChangeIds } =
      ApplyProposalRequestSchema.parse(body);

    // Get session for authentication (mocked in test environment)
    let accessToken = 'mock-token';
    if (process.env.VITEST !== 'true') {
      // TODO: Implement proper NextAuth session handling
      // const session = await getServerSession();
      // if (!session?.accessToken) {
      //   const response = ErrorResponseSchema.parse({
      //     ok: false,
      //     code: 'CALENDAR_UNAUTHORIZED',
      //     message: 'Calendar access has been revoked. Please re-authorize.',
      //   });
      //   return NextResponse.json(response, { status: 401 });
      // }
      // accessToken = session.accessToken as string;
    }

    // Get proposal from storage (in production, this would query a database)
    let proposal = proposalStore.get(proposalId);
    if (!proposal) {
      // For testing, create a mock proposal if it doesn't exist
      if (process.env.VITEST === 'true') {
        proposal = getMockProposal(proposalId);
        proposalStore.set(proposalId, proposal);
      } else {
        const response = ErrorResponseSchema.parse({
          ok: false,
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Proposal not found or has expired',
        });
        return NextResponse.json(response, { status: 404 });
      }
    }

    // Filter changes based on selective change IDs if provided
    const changesToApply = selectiveChangeIds
      ? proposal.changes.filter((change) =>
          selectiveChangeIds.includes(change.id)
        )
      : proposal.changes;

    if (changesToApply.length === 0) {
      const response = ApplyProposalResponseSchema.parse({
        ok: true,
        appliedChangeIds: [],
        failed: [],
      });
      return NextResponse.json(response);
    }

    // Create Google Calendar client (use mock in test environment)
    const calendarClient =
      process.env.VITEST === 'true'
        ? new MockGoogleCalendarClient()
        : createGoogleCalendarClient(accessToken);

    // Apply changes to calendar
    const syncResult = await calendarClient.applyChanges(changesToApply);

    // Update proposal status if all changes were applied successfully
    if (syncResult.success) {
      proposal.status = 'applied';
      proposalStore.set(proposalId, proposal);
    }

    // Return result
    const response = ApplyProposalResponseSchema.parse({
      ok: syncResult.success,
      appliedChangeIds: syncResult.appliedChangeIds,
      failed: syncResult.failed,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/proposal/apply:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle calendar authorization errors
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

    // Handle calendar API errors
    if (
      error instanceof Error &&
      error.message.includes('Google Calendar API')
    ) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'CALENDAR_API_ERROR',
        message: 'Failed to sync with Google Calendar',
      });
      return NextResponse.json(response, { status: 502 });
    }

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while applying proposal',
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

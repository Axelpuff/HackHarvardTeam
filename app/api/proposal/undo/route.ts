import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request schema
const UndoRequestSchema = z.object({
  proposalId: z.string().min(1, 'Proposal ID is required'),
});

// Response schema
const UndoResponseSchema = z.object({
  ok: z.boolean(),
  reverted: z.boolean(),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

// In-memory storage for undo operations (in production, this would be in a database)
const undoStore = new Map<
  string,
  {
    proposalId: string;
    canUndo: boolean;
    undoData?: any;
  }
>();

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { proposalId } = UndoRequestSchema.parse(body);

    // Check if this proposal can be undone
    const undoInfo = undoStore.get(proposalId);

    if (!undoInfo || !undoInfo.canUndo) {
      // No undo available, but this is not an error
      const response = UndoResponseSchema.parse({
        ok: true,
        reverted: false,
      });
      return NextResponse.json(response);
    }

    // Perform undo operation (in production, this would call Google Calendar API to revert changes)
    try {
      // Mock undo operation for now
      console.log(`Undoing proposal ${proposalId}...`);

      // Mark as undone
      undoStore.set(proposalId, {
        ...undoInfo,
        canUndo: false, // Can only undo once
      });

      const response = UndoResponseSchema.parse({
        ok: true,
        reverted: true,
      });
      return NextResponse.json(response);
    } catch (undoError) {
      console.error('Error during undo operation:', undoError);

      const response = UndoResponseSchema.parse({
        ok: true,
        reverted: false, // Failed to revert, but request was valid
      });
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Error in /api/proposal/undo:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = ErrorResponseSchema.parse({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid request: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
      return NextResponse.json(response, { status: 400 });
    }

    // Handle generic errors
    const response = ErrorResponseSchema.parse({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during undo operation',
    });
    return NextResponse.json(response, { status: 500 });
  }
}

// Helper function to register an undo operation (called from apply route)
// This should be moved to a separate utility file in production
function registerUndo(proposalId: string, undoData: any) {
  undoStore.set(proposalId, {
    proposalId,
    canUndo: true,
    undoData,
  });
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

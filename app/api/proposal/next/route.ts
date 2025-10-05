import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGeminiClient, MockGeminiClient } from '@/lib/gemini';
import {
  createGoogleCalendarClient,
  MockGoogleCalendarClient,
} from '@/lib/google-calendar';
import { PreferenceSetSchema, PreferenceSet } from '@/lib/models/proposal';
import {
  cleanLLMProposal,
  validateLLMProposal,
  type LLMProposal,
} from '@/lib/proposal-schema';
import type { CalendarEvent } from '@/lib/models/calendarEvent';
import { findTimeConflicts } from '@/lib/diff';

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

    const gemini = useMock ? new MockGeminiClient() : createGeminiClient();

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

    // NEW: Clean & validate raw LLM proposal before any further logic
    let cleanedProposal: LLMProposal | null = null;
    try {
      cleanedProposal = cleanLLMProposal(proposal as any);
    } catch (e) {
      // If cleaning/validation fails, surface a controlled error
      const err = ErrorResponseSchema.parse({
        ok: false,
        code: 'PROPOSAL_INVALID',
        message:
          e instanceof Error
            ? `Invalid LLM proposal: ${e.message}`
            : 'Invalid LLM proposal',
      });
      return NextResponse.json(err, { status: 502 });
    }

    // Optional drift logging (non-production): detect corrections vs original
    if (process.env.NODE_ENV !== 'production') {
      const diffs: Record<string, { before: unknown; after: unknown }> = {};
      const rawAny = proposal as any;
      const cleanedAny = cleanedProposal as any;

      const topLevelKeys: (keyof LLMProposal)[] = [
        'id',
        'revision',
        'summary',
        'status',
        'createdAt',
      ];
      topLevelKeys.forEach((k) => {
        if (rawAny[k] !== cleanedAny[k]) {
          diffs[String(k)] = {
            before: rawAny[k],
            after: cleanedAny[k],
          };
        }
      });

      if (Array.isArray(rawAny.changes) && Array.isArray(cleanedAny.changes)) {
        rawAny.changes.forEach((c: any, idx: number) => {
          const cleanedC = cleanedAny.changes[idx];
          if (!c || !cleanedC) return;

          const changeFields: (keyof typeof cleanedC)[] = [
            'accepted',
            'rationale',
            'type',
          ];
          changeFields.forEach((field) => {
            if (c[field] !== cleanedC[field]) {
              diffs[`changes[${idx}].${String(field)}`] = {
                before: c[field],
                after: cleanedC[field],
              };
            }
          });

          if (c.event && cleanedC.event) {
            const eventFields: (keyof typeof cleanedC.event)[] = [
              'start',
              'end',
              'title',
              'durationMinutes',
            ];
            eventFields.forEach((ef) => {
              if (c.event[ef] !== cleanedC.event[ef]) {
                diffs[`changes[${idx}].event.${String(ef)}`] = {
                  before: c.event[ef],
                  after: cleanedC.event[ef],
                };
              }
            });
          }
        });
      }

      const diffKeys = Object.keys(diffs);
      if (diffKeys.length) {
        console.info('[proposal.next] LLM proposal cleaned adjustments', {
          correctedFields: diffKeys,
          diffs,
        });
      }
    }

    // Check for conflicts in the proposed changes
    if (cleanedProposal.changes && cleanedProposal.changes.length > 0) {
      // Create a test schedule with the proposed changes to check for conflicts
      const testEvents = [...events];

      // Apply proposed changes to test for conflicts
      for (const change of cleanedProposal.changes) {
        if (change.type === 'add' && change.event) {
          testEvents.push({
            id: change.id,
            title: change.event.title,
            start: change.event.start,
            end: change.event.end,
            durationMinutes: change.event.durationMinutes,
            source: 'proposed',
            changeType: 'add',
          });
        } else if (change.type === 'remove' && change.targetEventId) {
          const index = testEvents.findIndex(
            (e) => e.id === change.targetEventId
          );
          if (index !== -1) testEvents.splice(index, 1);
        } else if (
          (change.type === 'move' || change.type === 'adjust') &&
          change.targetEventId &&
          change.event
        ) {
          const index = testEvents.findIndex(
            (e) => e.id === change.targetEventId
          );
          if (index !== -1) {
            testEvents[index] = {
              ...testEvents[index],
              start: change.event.start,
              end: change.event.end,
              durationMinutes: change.event.durationMinutes,
            };
          }
        }
      }

      // Check for conflicts in the test schedule
      const conflicts = findTimeConflicts(testEvents);

      if (conflicts.length > 0) {
        // Generate a conflict-aware clarifying question
        const conflict = conflicts[0]; // Focus on the first conflict
        const conflictQuestion = `I notice a scheduling conflict: \"${conflict.event1.title}\" (${new Date(conflict.event1.start).toLocaleTimeString()} - ${new Date(conflict.event1.end).toLocaleTimeString()}) overlaps with \"${conflict.event2.title}\" (${new Date(conflict.event2.start).toLocaleTimeString()} - ${new Date(conflict.event2.end).toLocaleTimeString()}) for ${conflict.overlapMinutes} minutes. How would you like me to resolve this conflict?`;

        return NextResponse.json(
          ClarifyResponseSchema.parse({
            status: 'clarify',
            question: conflictQuestion,
          })
        );
      }
    }

    // Pass-through response (client can validate with ProposalSchema)
    return NextResponse.json(
      ProposalPassThroughSchema.parse({
        status: 'proposal',
        proposal: cleanedProposal,
      })
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

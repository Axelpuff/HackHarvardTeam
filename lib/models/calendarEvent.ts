import { z } from 'zod';

// CalendarEvent entity
export const CalendarEventSchema = z
  .object({
    id: z
      .string()
      .describe('Google event id (existing) or temp id (proposed add)'),
    title: z.string().describe('Event summary'),
    start: z.string().datetime().describe('ISO datetime aligned to primary TZ'),
    end: z.string().datetime().describe('ISO datetime derived or adjusted'),
    durationMinutes: z.number().int().min(0).describe('Cached for heuristics'),
    source: z.enum(['current', 'proposed']).describe('Distinguish panels'),
    changeType: z
      .enum(['none', 'add', 'move', 'remove', 'adjust'])
      .describe('For diff rendering'),
    originalEventId: z
      .string()
      .optional()
      .describe('Link for moved/adjusted items'),
    accepted: z.boolean().optional().describe('Per-change acceptance (FR-007)'),
  })
  .refine(
    (data) => {
      // Validation: start < end
      const startTime = new Date(data.start).getTime();
      const endTime = new Date(data.end).getTime();
      return startTime < endTime;
    },
    {
      message: 'Event start time must be before end time',
      path: ['end'],
    }
  )
  .refine(
    (data) => {
      // Validation: durationMinutes == (end-start)/60000
      const startTime = new Date(data.start).getTime();
      const endTime = new Date(data.end).getTime();
      const calculatedDuration = Math.round((endTime - startTime) / 60000);
      return data.durationMinutes === calculatedDuration;
    },
    {
      message:
        'Duration in minutes must match the time difference between start and end',
      path: ['durationMinutes'],
    }
  );

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// Helper to create a new calendar event
export const createCalendarEvent = (params: {
  id: string;
  title: string;
  start: string;
  end: string;
  source?: 'current' | 'proposed';
  changeType?: 'none' | 'add' | 'move' | 'remove' | 'adjust';
  originalEventId?: string;
}): CalendarEvent => {
  const startTime = new Date(params.start).getTime();
  const endTime = new Date(params.end).getTime();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  return CalendarEventSchema.parse({
    id: params.id,
    title: params.title,
    start: params.start,
    end: params.end,
    durationMinutes,
    source: params.source || 'current',
    changeType: params.changeType || 'none',
    originalEventId: params.originalEventId,
  });
};

// Helper to calculate duration from start/end times
export const calculateDuration = (start: string, end: string): number => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / 60000);
};

// Helper to validate calendar event data
export const validateCalendarEvent = (data: unknown): CalendarEvent => {
  return CalendarEventSchema.parse(data);
};

// Helper to convert event to proposed version
export const toProposedEvent = (
  event: CalendarEvent,
  changeType: 'add' | 'move' | 'remove' | 'adjust',
  originalEventId?: string
): CalendarEvent => {
  return CalendarEventSchema.parse({
    ...event,
    source: 'proposed',
    changeType,
    originalEventId:
      originalEventId || (changeType !== 'add' ? event.id : undefined),
  });
};

import { CalendarEvent } from '@/lib/models/calendarEvent';
import { ChangeItem } from '@/lib/models/proposal';

export interface EventDiff {
  current: CalendarEvent[];
  proposed: CalendarEvent[];
  changes: ChangeItem[];
}

export interface DiffResult {
  added: CalendarEvent[];
  removed: CalendarEvent[];
  moved: Array<{ original: CalendarEvent; updated: CalendarEvent }>;
  adjusted: Array<{ original: CalendarEvent; updated: CalendarEvent }>;
}

/**
 * Compare two sets of calendar events and identify the differences
 */
export function diffEvents(
  current: CalendarEvent[],
  proposed: CalendarEvent[]
): DiffResult {
  const added: CalendarEvent[] = [];
  const removed: CalendarEvent[] = [];
  const moved: Array<{ original: CalendarEvent; updated: CalendarEvent }> = [];
  const adjusted: Array<{ original: CalendarEvent; updated: CalendarEvent }> =
    [];

  // Create maps for efficient lookup
  const currentMap = new Map(current.map((event) => [event.id, event]));
  const proposedMap = new Map(proposed.map((event) => [event.id, event]));

  // Find added events (exist in proposed but not in current)
  for (const event of proposed) {
    if (!currentMap.has(event.id)) {
      added.push(event);
    }
  }

  // Find removed events (exist in current but not in proposed)
  for (const event of current) {
    if (!proposedMap.has(event.id)) {
      removed.push(event);
    }
  }

  // Find moved/adjusted events (exist in both but have changes)
  for (const event of current) {
    const proposedEvent = proposedMap.get(event.id);
    if (proposedEvent) {
      const hasTimeChange =
        event.start !== proposedEvent.start || event.end !== proposedEvent.end;
      const hasTitleChange = event.title !== proposedEvent.title;

      if (hasTimeChange && !hasTitleChange) {
        // Same title, different time = moved
        moved.push({ original: event, updated: proposedEvent });
      } else if (hasTimeChange || hasTitleChange) {
        // Other changes = adjusted
        adjusted.push({ original: event, updated: proposedEvent });
      }
    }
  }

  return { added, removed, moved, adjusted };
}

/**
 * Apply changes to a calendar event list based on ChangeItems
 */
export function applyChangesToEvents(
  currentEvents: CalendarEvent[],
  changes: ChangeItem[]
): CalendarEvent[] {
  let result = [...currentEvents];

  for (const change of changes) {
    if (change.accepted !== 'accepted') {
      continue; // Skip non-accepted changes
    }

    switch (change.type) {
      case 'add':
        result.push({
          id: change.id, // Use change ID as event ID for new events
          title: change.event.title,
          start: change.event.start,
          end: change.event.end,
          durationMinutes: change.event.durationMinutes,
          source: 'proposed',
          changeType: 'add',
        });
        break;

      case 'remove':
        if (change.targetEventId) {
          result = result.filter((event) => event.id !== change.targetEventId);
        }
        break;

      case 'move':
      case 'adjust':
        if (change.targetEventId) {
          const eventIndex = result.findIndex(
            (event) => event.id === change.targetEventId
          );
          if (eventIndex !== -1) {
            result[eventIndex] = {
              ...result[eventIndex],
              title: change.event.title,
              start: change.event.start,
              end: change.event.end,
              durationMinutes: change.event.durationMinutes,
              changeType: change.type,
            };
          }
        }
        break;
    }
  }

  return result;
}

/**
 * Calculate time conflicts between events
 */
export function findTimeConflicts(events: CalendarEvent[]): Array<{
  event1: CalendarEvent;
  event2: CalendarEvent;
  overlapMinutes: number;
}> {
  const conflicts = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      const start1 = new Date(event1.start);
      const end1 = new Date(event1.end);
      const start2 = new Date(event2.start);
      const end2 = new Date(event2.end);

      // Check for overlap
      const overlapStart = new Date(
        Math.max(start1.getTime(), start2.getTime())
      );
      const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

      if (overlapStart < overlapEnd) {
        const overlapMinutes =
          (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
        conflicts.push({
          event1,
          event2,
          overlapMinutes: Math.round(overlapMinutes),
        });
      }
    }
  }

  return conflicts;
}

/**
 * Estimate sleep time based on event schedule
 */
export function estimateSleepHours(
  events: CalendarEvent[],
  targetSleepStart: string = '22:00',
  targetWakeUp: string = '07:00'
): {
  estimatedSleepHours: number;
  lastEventEnd: string | null;
  firstEventStart: string | null;
  belowRecommended: boolean;
} {
  if (events.length === 0) {
    return {
      estimatedSleepHours: 9, // Full night if no events
      lastEventEnd: null,
      firstEventStart: null,
      belowRecommended: false,
    };
  }

  // Sort events by start time
  const sortedEvents = events
    .slice()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  const firstEventStart = firstEvent.start;
  const lastEventEnd = lastEvent.end;

  // Calculate potential sleep window
  const lastEventEndTime = new Date(lastEventEnd);
  const firstEventStartTime = new Date(firstEventStart);

  // Add a day to first event if it's the next day
  if (firstEventStartTime <= lastEventEndTime) {
    firstEventStartTime.setDate(firstEventStartTime.getDate() + 1);
  }

  const sleepHours =
    (firstEventStartTime.getTime() - lastEventEndTime.getTime()) /
    (1000 * 60 * 60);
  const estimatedSleepHours = Math.max(0, sleepHours);
  const belowRecommended = estimatedSleepHours < 7;

  return {
    estimatedSleepHours: Math.round(estimatedSleepHours * 10) / 10, // Round to 1 decimal
    lastEventEnd,
    firstEventStart,
    belowRecommended,
  };
}

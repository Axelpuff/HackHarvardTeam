import { describe, it, expect } from 'vitest';
import {
  diffEvents,
  applyChangesToEvents,
  findTimeConflicts,
  estimateSleepHours,
} from '@/lib/diff';
import type { CalendarEvent } from '@/lib/models/calendarEvent';
import type { ChangeItem } from '@/lib/models/proposal';

describe('Diff Utilities', () => {
  describe('diffEvents', () => {
    it('should identify added events', () => {
      const current: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Existing Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const proposed: CalendarEvent[] = [
        ...current,
        {
          id: 'event-2',
          title: 'New Meeting',
          start: '2025-10-04T11:00:00.000Z',
          end: '2025-10-04T12:00:00.000Z',
          durationMinutes: 60,
          source: 'proposed',
          changeType: 'add',
        },
      ];

      const diff = diffEvents(current, proposed);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].id).toBe('event-2');
      expect(diff.removed).toHaveLength(0);
      expect(diff.moved).toHaveLength(0);
      expect(diff.adjusted).toHaveLength(0);
    });

    it('should identify removed events', () => {
      const current: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Meeting to Remove',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Staying Meeting',
          start: '2025-10-04T11:00:00.000Z',
          end: '2025-10-04T12:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const proposed: CalendarEvent[] = [
        {
          id: 'event-2',
          title: 'Staying Meeting',
          start: '2025-10-04T11:00:00.000Z',
          end: '2025-10-04T12:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const diff = diffEvents(current, proposed);

      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].id).toBe('event-1');
      expect(diff.added).toHaveLength(0);
      expect(diff.moved).toHaveLength(0);
      expect(diff.adjusted).toHaveLength(0);
    });

    it('should identify moved events (same title, different time)', () => {
      const current: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Team Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const proposed: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Team Meeting',
          start: '2025-10-04T14:00:00.000Z', // Different time
          end: '2025-10-04T15:00:00.000Z',
          durationMinutes: 60,
          source: 'proposed',
          changeType: 'move',
        },
      ];

      const diff = diffEvents(current, proposed);

      expect(diff.moved).toHaveLength(1);
      expect(diff.moved[0].original.start).toBe(current[0].start);
      expect(diff.moved[0].updated.start).toBe(proposed[0].start);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.adjusted).toHaveLength(0);
    });

    it('should identify adjusted events (title or other changes)', () => {
      const current: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Team Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const proposed: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Extended Team Meeting', // Different title
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T11:00:00.000Z', // Different end time
          durationMinutes: 120,
          source: 'proposed',
          changeType: 'adjust',
        },
      ];

      const diff = diffEvents(current, proposed);

      expect(diff.adjusted).toHaveLength(1);
      expect(diff.adjusted[0].original.title).toBe('Team Meeting');
      expect(diff.adjusted[0].updated.title).toBe('Extended Team Meeting');
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.moved).toHaveLength(0);
    });
  });

  describe('applyChangesToEvents', () => {
    it('should apply accepted add changes', () => {
      const currentEvents: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Existing Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const changes: ChangeItem[] = [
        {
          id: 'change-1',
          type: 'add',
          event: {
            title: 'New Meeting',
            start: '2025-10-04T11:00:00.000Z',
            end: '2025-10-04T12:00:00.000Z',
            durationMinutes: 60,
          },
          rationale: 'Adding important meeting',
          accepted: 'accepted',
        },
      ];

      const result = applyChangesToEvents(currentEvents, changes);

      expect(result).toHaveLength(2);
      expect(result[1].title).toBe('New Meeting');
      expect(result[1].changeType).toBe('add');
    });

    it('should apply accepted remove changes', () => {
      const currentEvents: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Meeting to Remove',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Staying Meeting',
          start: '2025-10-04T11:00:00.000Z',
          end: '2025-10-04T12:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const changes: ChangeItem[] = [
        {
          id: 'change-1',
          type: 'remove',
          event: {
            title: 'Meeting to Remove',
            start: '2025-10-04T09:00:00.000Z',
            end: '2025-10-04T10:00:00.000Z',
            durationMinutes: 60,
          },
          targetEventId: 'event-1',
          rationale: 'No longer needed',
          accepted: 'accepted',
        },
      ];

      const result = applyChangesToEvents(currentEvents, changes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event-2');
    });

    it('should skip non-accepted changes', () => {
      const currentEvents: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Existing Meeting',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const changes: ChangeItem[] = [
        {
          id: 'change-1',
          type: 'add',
          event: {
            title: 'Rejected Meeting',
            start: '2025-10-04T11:00:00.000Z',
            end: '2025-10-04T12:00:00.000Z',
            durationMinutes: 60,
          },
          rationale: 'This was rejected',
          accepted: 'rejected',
        },
      ];

      const result = applyChangesToEvents(currentEvents, changes);

      expect(result).toHaveLength(1); // No changes applied
      expect(result[0].id).toBe('event-1');
    });
  });

  describe('findTimeConflicts', () => {
    it('should detect overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Meeting A',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:30:00.000Z',
          durationMinutes: 90,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Meeting B',
          start: '2025-10-04T10:00:00.000Z',
          end: '2025-10-04T11:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const conflicts = findTimeConflicts(events);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].overlapMinutes).toBe(30);
      expect(conflicts[0].event1.id).toBe('event-1');
      expect(conflicts[0].event2.id).toBe('event-2');
    });

    it('should not detect conflicts for non-overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Meeting A',
          start: '2025-10-04T09:00:00.000Z',
          end: '2025-10-04T10:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Meeting B',
          start: '2025-10-04T11:00:00.000Z',
          end: '2025-10-04T12:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const conflicts = findTimeConflicts(events);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('estimateSleepHours', () => {
    it('should calculate sleep hours between last event and first event next day', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Evening Meeting',
          start: '2025-10-04T20:00:00.000Z',
          end: '2025-10-04T21:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Morning Meeting',
          start: '2025-10-04T08:00:00.000Z',
          end: '2025-10-04T09:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const sleepEstimate = estimateSleepHours(events);

      expect(sleepEstimate.estimatedSleepHours).toBe(11.0); // 21:00 to 08:00 next day
      expect(sleepEstimate.belowRecommended).toBe(false);
      expect(sleepEstimate.lastEventEnd).toBe('2025-10-04T21:00:00.000Z');
      expect(sleepEstimate.firstEventStart).toBe('2025-10-04T08:00:00.000Z');
    });

    it('should return 9 hours for empty event list', () => {
      const events: CalendarEvent[] = [];

      const sleepEstimate = estimateSleepHours(events);

      expect(sleepEstimate.estimatedSleepHours).toBe(9);
      expect(sleepEstimate.belowRecommended).toBe(false);
      expect(sleepEstimate.lastEventEnd).toBeNull();
      expect(sleepEstimate.firstEventStart).toBeNull();
    });

    it('should mark as below recommended when sleep is less than 7 hours', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          title: 'Late Meeting',
          start: '2025-10-04T23:00:00.000Z',
          end: '2025-10-04T24:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
        {
          id: 'event-2',
          title: 'Early Meeting',
          start: '2025-10-04T06:00:00.000Z',
          end: '2025-10-04T07:00:00.000Z',
          durationMinutes: 60,
          source: 'current',
          changeType: 'none',
        },
      ];

      const sleepEstimate = estimateSleepHours(events);

      expect(sleepEstimate.estimatedSleepHours).toBe(6.0);
      expect(sleepEstimate.belowRecommended).toBe(true);
    });
  });
});

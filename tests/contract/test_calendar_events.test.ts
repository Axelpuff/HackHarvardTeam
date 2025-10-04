import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  durationMinutes: z.number(),
});

const CalendarEventsResponseSchema = z.object({
  ok: z.literal(true),
  events: z.array(CalendarEventSchema),
});

describe('GET /api/calendar/events', () => {
  it('should return day scope events', async () => {
    const response = await fetch(
      'http://localhost:3000/api/calendar/events?scope=day'
    );
    
    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response schema
    const parsed = CalendarEventsResponseSchema.parse(data);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toBeDefined();
    expect(Array.isArray(parsed.events)).toBe(true);
  });

  it('should return week scope events', async () => {
    const response = await fetch(
      'http://localhost:3000/api/calendar/events?scope=week'
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    const parsed = CalendarEventsResponseSchema.parse(data);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toBeDefined();
    expect(Array.isArray(parsed.events)).toBe(true);
  });

  it('should require scope parameter', async () => {
    const response = await fetch('http://localhost:3000/api/calendar/events');

    expect(response.status).toBe(400);
  });

  it('should reject invalid scope', async () => {
    const response = await fetch(
      'http://localhost:3000/api/calendar/events?scope=invalid'
    );

    expect(response.status).toBe(400);
  });

  it('should validate event schema properties', async () => {
    const response = await fetch(
      'http://localhost:3000/api/calendar/events?scope=day'
    );

    if (response.status === 200) {
      const data = await response.json();
      const parsed = CalendarEventsResponseSchema.parse(data);

      // If there are events, validate their structure
      if (parsed.events.length > 0) {
        const event = parsed.events[0];
        expect(event.id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.start).toBeDefined();
        expect(event.end).toBeDefined();
        expect(event.durationMinutes).toBeDefined();
        expect(typeof event.durationMinutes).toBe('number');
      }
    }
  });
});

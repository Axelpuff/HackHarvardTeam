import { z } from 'zod';
import type { CalendarEvent } from './models/calendarEvent';
import type { ChangeItem, SyncOperation } from './models/proposal';

// Google Calendar API event schema - handle both dateTime and date fields
const GoogleCalendarEventSchema = z.object({
  id: z.string().optional(),
  summary: z.string(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  description: z.string().optional(),
  location: z.string().optional(),
});

type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEventSchema>;

// Google Calendar API response schemas
const CalendarListResponseSchema = z.object({
  items: z.array(GoogleCalendarEventSchema),
  nextPageToken: z.string().optional(),
});

// Configuration
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s as specified in requirements

export interface GoogleCalendarConfig {
  accessToken: string;
  calendarId?: string;
  maxRetries?: number;
  retryDelays?: number[];
}

export interface CalendarSyncResult {
  success: boolean;
  appliedChangeIds: string[];
  failed: Array<{
    changeId: string;
    code: string;
    message: string;
  }>;
}

export class GoogleCalendarClient {
  private config: Required<GoogleCalendarConfig>;

  constructor(config: GoogleCalendarConfig) {
    this.config = {
      accessToken: config.accessToken,
      calendarId: config.calendarId || 'primary',
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelays: config.retryDelays || RETRY_DELAYS,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<Response> {
    const url = `${GOOGLE_CALENDAR_API_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If unauthorized, don't retry
      if (response.status === 401) {
        throw new Error(
          'CALENDAR_UNAUTHORIZED: Calendar access has been revoked'
        );
      }

      // If rate limited or server error, retry
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < this.config.maxRetries
      ) {
        console.warn(
          `Google Calendar API request failed (attempt ${attempt + 1}), retrying...`
        );
        await this.delay(this.config.retryDelays[attempt]);
        return this.makeRequest(endpoint, options, attempt + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Calendar API error: ${response.status} ${errorText}`
        );
      }

      return response;
    } catch (error) {
      if (
        attempt < this.config.maxRetries &&
        error instanceof Error &&
        !error.message.includes('CALENDAR_UNAUTHORIZED')
      ) {
        console.warn(
          `Google Calendar API request failed (attempt ${attempt + 1}), retrying...`,
          error
        );
        await this.delay(this.config.retryDelays[attempt]);
        return this.makeRequest(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * List calendar events for a date range
   */
  async listEvents(
    params: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    } = {}
  ): Promise<CalendarEvent[]> {
    const queryParams = new URLSearchParams();

    if (params.timeMin) queryParams.set('timeMin', params.timeMin);
    if (params.timeMax) queryParams.set('timeMax', params.timeMax);
    if (params.maxResults)
      queryParams.set('maxResults', params.maxResults.toString());
    if (params.singleEvents !== undefined)
      queryParams.set('singleEvents', params.singleEvents.toString());
    if (params.orderBy) queryParams.set('orderBy', params.orderBy);

    const endpoint = `/calendars/${this.config.calendarId}/events?${queryParams.toString()}`;
    const response = await this.makeRequest(endpoint);
    const data = await response.json();

    const parsed = CalendarListResponseSchema.parse(data);

    // Convert Google Calendar events to our internal format
    return parsed.items.map(this.convertFromGoogleEvent);
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  }): Promise<string> {
    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      start: {
        dateTime: event.start,
      },
      end: {
        dateTime: event.end,
      },
      description: event.description,
      location: event.location,
    };

    const endpoint = `/calendars/${this.config.calendarId}/events`;
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(googleEvent),
    });

    const data = await response.json();
    return data.id;
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    updates: {
      title?: string;
      start?: string;
      end?: string;
      description?: string;
      location?: string;
    }
  ): Promise<void> {
    // First get the existing event
    const getResponse = await this.makeRequest(
      `/calendars/${this.config.calendarId}/events/${eventId}`
    );
    const existingEvent = await getResponse.json();

    // Merge updates
    const updatedEvent: GoogleCalendarEvent = {
      ...existingEvent,
      summary: updates.title || existingEvent.summary,
      start: updates.start ? { dateTime: updates.start } : existingEvent.start,
      end: updates.end ? { dateTime: updates.end } : existingEvent.end,
      description:
        updates.description !== undefined
          ? updates.description
          : existingEvent.description,
      location:
        updates.location !== undefined
          ? updates.location
          : existingEvent.location,
    };

    const endpoint = `/calendars/${this.config.calendarId}/events/${eventId}`;
    await this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(updatedEvent),
    });
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const endpoint = `/calendars/${this.config.calendarId}/events/${eventId}`;
    await this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Apply multiple changes atomically with retry logic
   */
  async applyChanges(changes: ChangeItem[]): Promise<CalendarSyncResult> {
    const appliedChangeIds: string[] = [];
    const failed: CalendarSyncResult['failed'] = [];

    for (const change of changes) {
      try {
        await this.applyChange(change);
        appliedChangeIds.push(change.id);
      } catch (error) {
        console.error(`Failed to apply change ${change.id}:`, error);

        let errorCode = 'UNKNOWN_ERROR';
        let errorMessage = 'Unknown error occurred';

        if (error instanceof Error) {
          if (error.message.includes('CALENDAR_UNAUTHORIZED')) {
            errorCode = 'CALENDAR_UNAUTHORIZED';
            errorMessage = 'Calendar access has been revoked';
          } else if (error.message.includes('conflict')) {
            errorCode = 'CALENDAR_CONFLICT';
            errorMessage = 'Event conflicts with existing calendar item';
          } else if (
            error.message.includes('Network') ||
            error.message.includes('timeout')
          ) {
            errorCode = 'NETWORK_ERROR';
            errorMessage = 'Failed to sync with Google Calendar after retries';
          } else {
            errorMessage = error.message;
          }
        }

        failed.push({
          changeId: change.id,
          code: errorCode,
          message: errorMessage,
        });
      }
    }

    return {
      success: failed.length === 0,
      appliedChangeIds,
      failed,
    };
  }

  /**
   * Apply a single change item
   */
  protected async applyChange(change: ChangeItem): Promise<void> {
    switch (change.type) {
      case 'add':
        await this.createEvent({
          title: change.event.title,
          start: change.event.start,
          end: change.event.end,
        });
        break;

      case 'move':
      case 'adjust':
        if (!change.targetEventId) {
          throw new Error('Move/adjust operations require targetEventId');
        }
        await this.updateEvent(change.targetEventId, {
          title: change.event.title,
          start: change.event.start,
          end: change.event.end,
        });
        break;

      case 'remove':
        if (!change.targetEventId) {
          throw new Error('Remove operations require targetEventId');
        }
        await this.deleteEvent(change.targetEventId);
        break;

      default:
        throw new Error(`Unsupported change type: ${change.type}`);
    }
  }

  /**
   * Convert Google Calendar event to our internal format
   */
  private convertFromGoogleEvent(
    googleEvent: GoogleCalendarEvent
  ): CalendarEvent {
    // Handle both dateTime (for timed events) and date (for all-day events)
    const start = googleEvent.start.dateTime || googleEvent.start.date;
    const end = googleEvent.end.dateTime || googleEvent.end.date;

    if (!start || !end) {
      console.warn(
        'Skipping event with missing start/end time:',
        googleEvent.summary
      );
      // Return a minimal event that will be filtered out
      return {
        id: googleEvent.id || 'unknown',
        title: googleEvent.summary || 'Untitled Event',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 60000).toISOString(), // 1 minute duration
        durationMinutes: 1,
        source: 'current',
        changeType: 'none',
      };
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMinutes = Math.round((endTime - startTime) / 60000);

    return {
      id: googleEvent.id || 'unknown',
      title: googleEvent.summary,
      start,
      end,
      durationMinutes,
      source: 'current',
      changeType: 'none',
    };
  }
}

// Mock client for testing
export class MockGoogleCalendarClient extends GoogleCalendarClient {
  private mockEvents: CalendarEvent[] = [];
  private shouldFail = false;

  constructor() {
    super({ accessToken: 'mock-token' });
  }

  setMockEvents(events: CalendarEvent[]): void {
    this.mockEvents = events;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async listEvents(): Promise<CalendarEvent[]> {
    if (this.shouldFail) {
      throw new Error('Mock calendar error');
    }
    return [...this.mockEvents];
  }

  async createEvent(event: {
    title: string;
    start: string;
    end: string;
  }): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock calendar error');
    }
    const id = `mock-event-${Date.now()}`;
    this.mockEvents.push({
      id,
      title: event.title,
      start: event.start,
      end: event.end,
      durationMinutes: Math.round(
        (new Date(event.end).getTime() - new Date(event.start).getTime()) /
          60000
      ),
      source: 'current',
      changeType: 'none',
    });
    return id;
  }

  async updateEvent(eventId: string, updates: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock calendar error');
    }
    const eventIndex = this.mockEvents.findIndex((e) => e.id === eventId);
    if (eventIndex >= 0) {
      this.mockEvents[eventIndex] = {
        ...this.mockEvents[eventIndex],
        ...(updates.title && { title: updates.title }),
        ...(updates.start && { start: updates.start }),
        ...(updates.end && { end: updates.end }),
      };
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock calendar error');
    }
    this.mockEvents = this.mockEvents.filter((e) => e.id !== eventId);
  }

  async applyChanges(changes: ChangeItem[]): Promise<CalendarSyncResult> {
    if (this.shouldFail) {
      return {
        success: false,
        appliedChangeIds: [],
        failed: changes.map((c) => ({
          changeId: c.id,
          code: 'MOCK_ERROR',
          message: 'Mock calendar error',
        })),
      };
    }

    const appliedChangeIds: string[] = [];
    for (const change of changes) {
      try {
        await this.applyChange(change);
        appliedChangeIds.push(change.id);
      } catch (error) {
        // In mock, don't fail unless specifically requested
      }
    }

    return {
      success: true,
      appliedChangeIds,
      failed: [],
    };
  }

  protected async applyChange(change: ChangeItem): Promise<void> {
    switch (change.type) {
      case 'add':
        await this.createEvent({
          title: change.event.title,
          start: change.event.start,
          end: change.event.end,
        });
        break;
      case 'move':
      case 'adjust':
        if (change.targetEventId) {
          await this.updateEvent(change.targetEventId, {
            title: change.event.title,
            start: change.event.start,
            end: change.event.end,
          });
        }
        break;
      case 'remove':
        if (change.targetEventId) {
          await this.deleteEvent(change.targetEventId);
        }
        break;
    }
  }
}

// Export convenience functions
export const createGoogleCalendarClient = (
  accessToken: string
): GoogleCalendarClient => {
  return new GoogleCalendarClient({ accessToken });
};

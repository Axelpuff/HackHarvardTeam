'use client';

import { useEffect, useState } from 'react';
import type { CalendarEvent } from '@/lib/models/calendarEvent';

export function useCalendarEvents() {
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [calendarAccessRevoked, setCalendarAccessRevoked] = useState(false);
  const [calendarRevokedMessage, setCalendarRevokedMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCurrent(true);

    fetch('/api/calendar/events?scope=week')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const errMsg = text || `Failed to load events (${res.status})`;
          throw new Error(errMsg);
        }
        const data = await res.json();
        if (cancelled) return;
        setCurrentEvents(
          (data.events || []).map((e: any) => ({
            ...e,
            source: 'current' as const,
            changeType: 'none' as const,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Calendar fetch error:', err);
          if (
            err instanceof Error &&
            err.message.includes('CALENDAR_UNAUTHORIZED')
          ) {
            setCalendarAccessRevoked(true);
            setCalendarRevokedMessage(
              'Calendar access appears to have been revoked. Please reconnect to continue syncing.'
            );
          }

          setCurrentEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCurrent(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    currentEvents,
    isLoadingCurrent,
    calendarAccessRevoked,
    calendarRevokedMessage,
    dismissRevoked: () => setCalendarAccessRevoked(false),
    refresh: () => window.location.reload(),
  };
}

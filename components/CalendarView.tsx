'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically load the FullCalendar client wrapper to avoid importing
// FullCalendar during server-side rendering which can cause hydration
// or session-loading to hang.
const FullCalendar = dynamic(() => import('./FullCalendarClient'), {
  ssr: false,
});
import { CalendarEvent } from '@/lib/models/calendarEvent';

//import '@fullcalendar/common/main.css';
//import '@fullcalendar/daygrid/main.css';
//import '@fullcalendar/timegrid/main.css';

interface CalendarViewProps {
  events: CalendarEvent[];
  view: 'day' | 'week';
  height?: string | number;
  editable?: boolean;
  onEventClick?: (event: any) => void;
}

export default function CalendarView({
  events,
  view,
  height = '100%',
  editable = false,
  onEventClick,
}: CalendarViewProps) {
  const ref = useRef<any | null>(null);

  useEffect(() => {
    // Ensure FullCalendar rerenders when view changes
    const calendarApi = (ref.current as any)?.getApi?.();
    if (calendarApi) {
      calendarApi.changeView(view === 'week' ? 'timeGridWeek' : 'timeGridDay');
      // Force a relayout after changing view
      if (calendarApi.updateSize) calendarApi.updateSize();
    }
  }, [view]);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    extendedProps: { ...e },
  }));

  return (
    <div className="w-full rounded-2xl shadow-inner bg-white/80 dark:bg-gray-900/70 h-full">
      <FullCalendar
        key={view}
        ref={ref}
        initialView={view === 'week' ? 'timeGridWeek' : 'timeGridDay'}
        initialDate={new Date().toISOString()}
        headerToolbar={false}
        events={fcEvents}
        height={height}
        editable={editable}
        selectable={false}
        nowIndicator={true}
        eventClick={(info: any) => onEventClick?.(info.event)}
        dayMaxEventRows={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        eventDisplay="block"
      />
    </div>
  );
}

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
    <div className="panel-glass w-full rounded-2xl h-full">
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
        /* Apply Tailwind gradients directly to events. Proposed / diff events
           (those carrying a changeType) get the brand gradient; normal events
           use a subtle dark gradient for consistency. */
        eventClassNames={(arg: any) => {
          const changeType = arg.event.extendedProps?.changeType;
          const base = [
            'rounded-md',
            'border-0',
            'px-1.5',
            'py-1',
            'text-[18px]',
            'leading-tight',
            'font-medium',
            'shadow-sm',
            'cursor-pointer',
            'transition-colors',
          ];
          if (changeType) {
            base.push('bg-gradient-subtle', 'text-black');
          } else {
            base.push('bg-gradient-subtle', 'text-black');
          }
          // Slight hover effect (FullCalendar keeps class names)
          base.push('hover:brightness-110');
          return base;
        }}
      />
    </div>
  );
}

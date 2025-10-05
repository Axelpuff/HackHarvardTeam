'use client';

import React, { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// FullCalendar styles (load only on client)
import '@fullcalendar/common/main.css';
// import '@fullcalendar/daygrid/main.css'; This triggers an error
// import '@fullcalendar/timegrid/main.css'; This triggers an error

// This component is intentionally simple and only mounted on the client.
// Keeping FullCalendar imports inside this file prevents them from running
// during server-side rendering which can cause hydration/session issues.
const FullCalendarClient = forwardRef(function FullCalendarClient(
  props: any,
  ref: any
) {
  return (
    <FullCalendar
      ref={ref}
      plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
      {...props}
    />
  );
});

export default FullCalendarClient;

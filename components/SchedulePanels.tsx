'use client';

import React from 'react';
import CalendarView from './CalendarView';
import { CalendarEvent } from '@/lib/models/calendarEvent';

interface SchedulePanelsProps {
  currentEvents: CalendarEvent[];
  proposedEvents: CalendarEvent[];
  view: 'day' | 'week';
}

export default function SchedulePanels({
  currentEvents,
  proposedEvents,
  view,
}: SchedulePanelsProps) {
  // Layout rules:
  // - week view: stacked vertically (current above proposed), both full width
  // - day view: side-by-side (current left, proposed right)

  if (view === 'week') {
    return (
      <div className="flex flex-col h-full space-y-6">
        <div className="flex-1 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Schedule</h3>
          </div>
          <div className="flex-1">
            <CalendarView events={currentEvents} view={view} />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Proposed Schedule</h3>
          </div>
          <div className="flex-1">
            <CalendarView events={proposedEvents} view={view} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Current Schedule</h3>
        </div>
        <div className="flex-1">
          <CalendarView events={currentEvents} view={view} />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Proposed Schedule</h3>
        </div>
        <div className="flex-1">
          <CalendarView events={proposedEvents} view={view} />
        </div>
      </div>
    </div>
  );
}

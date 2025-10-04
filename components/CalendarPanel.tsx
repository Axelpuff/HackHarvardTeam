'use client';

import { CalendarEvent } from '@/lib/models/calendarEvent';

interface CalendarPanelProps {
  title: string;
  events: CalendarEvent[];
  isLoading?: boolean;
  showDiff?: boolean;
}

export function CalendarPanel({
  title,
  events,
  isLoading = false,
  showDiff = false,
}: CalendarPanelProps) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getChangeTypeColor = (changeType?: string) => {
    switch (changeType) {
      case 'add':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'move':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'remove':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'adjust':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getChangeTypeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'add':
        return '➕';
      case 'move':
        return '🔄';
      case 'remove':
        return '➖';
      case 'adjust':
        return '⚙️';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-96">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        </div>
        <div className="p-4 flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-96">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        {events.length > 0 && (
          <p className="text-sm text-gray-500">{events.length} events</p>
        )}
      </div>
      <div className="p-4 overflow-y-auto h-80">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No events to display</p>
            <p className="text-sm mt-2">
              {showDiff
                ? 'Proposed changes will appear here'
                : 'Your current events will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-md border ${
                  showDiff && (event as any).changeType
                    ? getChangeTypeColor((event as any).changeType)
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {showDiff && (event as any).changeType && (
                        <span className="text-sm">
                          {getChangeTypeIcon((event as any).changeType)}
                        </span>
                      )}
                      <h3 className="font-medium text-gray-900 text-sm">
                        {event.title}
                      </h3>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      <div>
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </div>
                      <div className="text-gray-500">
                        {formatDuration(event.durationMinutes)}
                      </div>
                    </div>
                  </div>
                  {showDiff && (event as any).accepted !== undefined && (
                    <div className="ml-2">
                      <input
                        type="checkbox"
                        checked={(event as any).accepted === 'accepted'}
                        onChange={() => {
                          // Handle acceptance toggle
                          console.log('Toggle acceptance for', event.id);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                {showDiff && (event as any).changeType && (
                  <div className="mt-2 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(
                        (event as any).changeType
                      )}`}
                    >
                      {(event as any).changeType?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
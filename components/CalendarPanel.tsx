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
      <div className="bg-white/80 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 h-96">
        <div className="p-4 border-b border-transparent bg-gradient-to-r from-white/0 to-white/0 dark:from-gray-900/0 dark:to-gray-900/0 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        </div>
        <div className="p-6 flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal mx-auto mb-3"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading events…</p>
            <p className="text-sm text-gray-400 mt-2">This may take a second</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 h-96">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {events.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {events.length} events
            </p>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {/* placeholder for controls */}
        </div>
      </div>
      <div className="p-4 overflow-y-auto h-80">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="font-medium">No events to display</p>
            <p className="text-sm mt-2">
              {showDiff
                ? 'Proposed changes will appear here.'
                : 'Your current events will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const changeType = (event as any).changeType;
              const isDiff = showDiff && changeType;
              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border flex items-start justify-between bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-9 h-9 rounded-md flex items-center justify-center ${isDiff ? 'bg-white/30' : 'bg-gray-50 dark:bg-gray-800'}`}
                        >
                          {isDiff ? (
                            <span className="text-sm">
                              {getChangeTypeIcon(changeType)}
                            </span>
                          ) : (
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.title}
                        </h3>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </div>
                          <div className="text-gray-400">
                            {formatDuration(event.durationMinutes)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    {showDiff && changeType && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getChangeTypeColor(changeType)}`}
                      >
                        {changeType.toUpperCase()}
                      </span>
                    )}

                    {showDiff && (event as any).accepted !== undefined && (
                      <label className="mt-3 inline-flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={(event as any).accepted === 'accepted'}
                          onChange={() => {
                            // Handle acceptance toggle
                            console.log('Toggle acceptance for', event.id);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2">Accept</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

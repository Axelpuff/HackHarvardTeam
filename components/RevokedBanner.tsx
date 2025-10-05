'use client';

import React from 'react';

type Props = {
  open: boolean;
  message?: string | null;
  onReconnect: () => void;
  onDismiss: () => void;
};

export default function RevokedBanner({
  open,
  message,
  onReconnect,
  onDismiss,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-30 w-[min(90%,800px)]">
      <div
        className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded shadow-md flex items-start justify-between"
        role="alert"
        aria-live="polite"
      >
        <div className="flex-1 pr-4">
          <p className="font-semibold">Calendar access revoked</p>
          <p className="text-sm">
            {message ?? 'Your Google Calendar access was revoked.'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onReconnect}
            className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Reconnect Google Calendar"
          >
            Reconnect
          </button>
          <button
            onClick={onDismiss}
            className="text-sm text-yellow-700 underline ml-2 focus:outline-none"
            aria-label="Dismiss calendar revoked banner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

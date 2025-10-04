'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isConversationActive, setIsConversationActive] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AI Schedule Counseling Assistant
            </h1>
            <p className="text-gray-600 mb-6">
              Connect your Google Calendar to get personalized scheduling assistance
            </p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              AI Schedule Assistant
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Panel - Current Events */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border h-96">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">
                  Current Schedule
                </h2>
              </div>
              <div className="p-4">
                <div className="text-center text-gray-500 mt-8">
                  <p>Your current events will appear here</p>
                  <p className="text-sm mt-2">Connect and start a conversation to load events</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border h-96">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">
                  Conversation
                </h2>
              </div>
              <div className="p-4 flex flex-col h-80">
                {!isConversationActive ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-500 mb-4">
                        Ready to help with your schedule
                      </p>
                      <button
                        onClick={() => setIsConversationActive(true)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Start Conversation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto mb-4 p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600 mb-2">
                        System: Hi! I'm here to help you optimize your schedule. What scheduling challenge are you facing?
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Type your message or use voice..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Proposal Panel - Proposed Changes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border h-96">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">
                  Proposed Changes
                </h2>
              </div>
              <div className="p-4">
                <div className="text-center text-gray-500 mt-8">
                  <p>Schedule proposals will appear here</p>
                  <p className="text-sm mt-2">Start a conversation to generate suggestions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isConversationActive && (
          <div className="mt-8 flex justify-center space-x-4">
            <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50">
              Apply Changes
            </button>
            <button className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
              Undo Last Apply
            </button>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Export Transcript
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
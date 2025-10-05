'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { CalendarPanel } from '@/components/CalendarPanel';
import { type CalendarEvent } from '@/lib/models/calendarEvent';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationMode, setConversationMode] = useState<'none' | 'text' | 'audio'>('none');
  const [messages, setMessages] = useState<{ role: 'system' | 'user' | 'assistant'; text: string }[]>([
    {
      role: 'system',
      text: "Hi! I'm here to help you optimize your schedule. What scheduling challenge are you facing?",
    },
  ]);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [problemText, setProblemText] = useState<string>('');
  const [pendingInput, setPendingInput] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasProposal, setHasProposal] = useState(false);
  const [lastProposal, setLastProposal] = useState<any | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // Minimal send handler calling progressive proposal endpoint
  const handleSend = useCallback(async () => {
    const text = pendingInput.trim();
    if (!text || isRequesting) return;

    // Append user message
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setPendingInput('');
    setIsRequesting(true);

    // Establish problem text if first user message
    const nextProblem = problemText || text;
    if (!problemText) setProblemText(nextProblem);

    // Clarifications exclude the initial problem statement
    const effectiveClarifications = problemText ? [...clarifications, text] : clarifications;

    try {
      const res = await fetch('/api/proposal/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: nextProblem,
            clarifications: effectiveClarifications,
            scope: 'week',
        }),
      });
      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`API ${res.status}: ${errTxt}`);
      }
      const data = await res.json();
      if (data.status === 'clarify') {
        // Store clarification & show assistant question
        if (problemText) {
          setClarifications(effectiveClarifications);
        }
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.question as string },
        ]);
      } else if (data.status === 'proposal') {
        setClarifications(effectiveClarifications);
        setHasProposal(true);
        setLastProposal(data.proposal);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Generated a draft proposal with suggested changes.' },
        ]);
        // Attempt to map proposal changes into proposedEvents if shape matches
        if (data.proposal?.changes && Array.isArray(data.proposal.changes)) {
          const mapped = data.proposal.changes
            .filter((c: any) => c.event)
            .map((c: any) => ({
              id: c.event.id || c.id,
              title: c.event.title,
              start: c.event.start,
              end: c.event.end,
              durationMinutes: c.event.durationMinutes || Math.round((new Date(c.event.end).getTime() - new Date(c.event.start).getTime()) / 60000),
              source: 'proposed' as const,
              changeType: c.type,
              originalEventId: c.targetEventId,
            }));
          setProposedEvents(mapped);
        }
      }
    } catch (err: any) {
      console.error('Conversation send error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I ran into an issue. Please try again.' },
      ]);
    } finally {
      setIsRequesting(false);
    }
  }, [pendingInput, isRequesting, problemText, clarifications]);
  // State for current calendar events
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  // State for proposed schedule changes (may include diff metadata later)
  const [proposedEvents, setProposedEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingProposed, setIsLoadingProposed] = useState(false);
  // TODO: Wire up fetching of current events when conversation starts or on mount.
  // TODO: Populate proposedEvents with diff metadata (changeType, accepted) when proposals are generated.

  // Minimal fetch of current events when conversation starts.
  useEffect(() => {
    if (!isConversationActive) return; // Only load after conversation begins
    let cancelled = false;
    setIsLoadingCurrent(true);

    fetch('/api/calendar/events?scope=day')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load events (${res.status})`);
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
          setCurrentEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCurrent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConversationActive]);

  // Auto-scroll transcript when messages or loading state change
  // NOTE: This must be declared BEFORE any conditional returns to preserve hook order
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isRequesting]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            role="status"
            aria-label="Loading application"
          ></div>
          <p className="text-gray-600" aria-live="polite">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <main className="max-w-md w-full bg-white rounded-lg shadow-md p-8" role="main">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AI Schedule Counseling Assistant
            </h1>
            <p className="text-gray-600 mb-6">
              Connect your Google Calendar to get personalized scheduling assistance
            </p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Sign in with Google to access calendar integration"
            >
              Sign in with Google
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              AI Schedule Assistant
            </h1>
            <nav className="flex items-center space-x-4" role="navigation" aria-label="User navigation">
              <span className="text-sm text-gray-600" aria-label={`Signed in as ${session.user?.email}`}>
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1 transition-colors"
                aria-label="Sign out of your account"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Panel - Current Events (uses shared component) */}
          <section className="lg:col-span-1" aria-labelledby="current-schedule-heading">
            <div aria-hidden="true" className="sr-only" id="current-schedule-heading">Current Schedule</div>
            <div data-testid="calendar-current">
              <CalendarPanel
                title="Current Schedule"
                events={currentEvents}
                isLoading={isLoadingCurrent}
              />
            </div>
          </section>

          {/* Conversation Panel */}
          <section className="lg:col-span-1" aria-labelledby="conversation-heading">
            <div className="bg-white rounded-lg shadow-sm border h-96 flex flex-col" data-testid="conversation-panel">
              <div className="p-4 border-b">
                <h2 id="conversation-heading" className="text-lg font-medium text-gray-900">
                  Conversation
                </h2>
              </div>
              <div className="p-4 flex flex-col flex-1 min-h-0">
                {!isConversationActive ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-500 mb-4">
                        Ready to help with your schedule
                      </p>
                      <div className="space-x-3">
                        <button
                          onClick={() => { setIsConversationActive(true); setConversationMode('text'); }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          aria-label="Start a text chat with the AI schedule assistant"
                        >
                          Start Text Chat
                        </button>
                        <button
                          onClick={() => { setIsConversationActive(true); setConversationMode('audio'); }}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                          aria-label="Start an audio conversation with the AI schedule assistant"
                        >
                          Start Audio Conversation
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                    <div
                      ref={transcriptRef}
                      className="flex-1 overflow-y-auto mb-4 p-2 bg-gray-50 rounded text-sm"
                      role="log"
                      aria-label="Conversation transcript"
                      aria-live="polite"
                      data-testid="conversation-transcript"
                    >
                      {messages.map((m, idx) => (
                        <div key={idx} className="mb-2" role="listitem">
                          <span className="font-semibold text-gray-900 capitalize">{m.role}:</span> <span className="text-gray-900">{m.text}</span>
                        </div>
                      ))}
                      {isRequesting && (
                        <div className="text-gray-500 italic" role="status">Thinking...</div>
                      )}
                    </div>
                    {conversationMode === 'text' && (
                      <form className="flex space-x-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                      <label htmlFor="message-input" className="sr-only">
                        Type your message to the AI assistant
                      </label>
                      <input
                        id="message-input"
                        type="text"
                        placeholder="Type your message or use voice..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-describedby="message-help"
                        value={pendingInput}
                        disabled={isRequesting}
                        onChange={(e) => setPendingInput(e.target.value)}
                      />
                      <span id="message-help" className="sr-only">
                        Enter your scheduling question or concern to get personalized assistance
                      </span>
                      <button 
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        aria-label="Send message to AI assistant"
                        disabled={isRequesting || !pendingInput.trim()}
                      >
                        {hasProposal ? 'Refine' : 'Send'}
                      </button>
                    </form>
                    )}
                    {conversationMode === 'audio' && (
                      <div className="text-center text-sm text-gray-500 mt-2" aria-hidden>
                        Audio conversation active — transcript will appear here. Use your microphone controls to speak.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Proposal Panel - Proposed Changes (uses shared component) */}
          <section className="lg:col-span-1" aria-labelledby="proposals-heading">
            <div aria-hidden="true" className="sr-only" id="proposals-heading">Proposed Changes</div>
            <div data-testid="calendar-proposed">
              <CalendarPanel
                title="Proposed Changes"
                events={proposedEvents}
                isLoading={isLoadingProposed}
                showDiff
              />
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        {isConversationActive && (
          <section className="mt-8" aria-label="Schedule management actions">
            <div className="flex justify-center space-x-4" role="group">
              <button 
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                aria-label="Apply selected schedule changes to your Google Calendar"
                disabled
              >
                Apply Changes
              </button>
              <button 
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                aria-label="Undo the last applied changes to your calendar"
              >
                Undo Last Apply
              </button>
              <button 
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-label="Export conversation transcript as text file"
              >
                Export Transcript
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
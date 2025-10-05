'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import SchedulePanels from '@/components/SchedulePanels';
import { type CalendarEvent } from '@/lib/models/calendarEvent';
import { VoiceInput } from '@/components/VoiceInput';
import RevokedBanner from '@/components/RevokedBanner';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [conversationMode, setConversationMode] = useState<
    'none' | 'text' | 'audio'
  >('none');
  const [isSpeaking, setIsSpeaking] = useState(false); // stub for TTS playback state
  const [messages, setMessages] = useState<
    { role: 'system' | 'user' | 'assistant'; text: string }[]
  >([
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
  const [isExporting, setIsExporting] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calendar hook encapsulates fetching + revoked detection
  const {
    currentEvents,
    isLoadingCurrent,
    calendarAccessRevoked,
    calendarRevokedMessage,
    dismissRevoked,
  } = useCalendarEvents();

  // Speak text using ElevenLabs TTS via server API
  const speakText = useCallback(async (text: string) => {
    if (!text) return;
    try {
      setIsSpeaking(true);
      const res = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.error('TTS error', await res.text());
        setIsSpeaking(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audioRef.current.play();
    } catch (e) {
      console.error('speakText error', e);
      setIsSpeaking(false);
    }
  }, []);
  // Minimal send handler calling progressive proposal endpoint
  const handleSend = useCallback(
    async (textArg?: string) => {
      const text = (textArg ?? pendingInput).trim();
      if (!text || isRequesting) return;

      // Append user message
      setMessages((prev) => [...prev, { role: 'user', text }]);
      setPendingInput('');
      setIsRequesting(true);

      // Establish problem text if first user message
      const nextProblem = problemText || text;
      if (!problemText) setProblemText(nextProblem);

      // Clarifications exclude the initial problem statement
      const effectiveClarifications = problemText
        ? [...clarifications, text]
        : clarifications;

      try {
        const res = await fetch('/api/proposal/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemText: nextProblem,
            clarifications: effectiveClarifications,
            scope: 'day', // Use day scope to match current events
          }),
        });

        if (!res.ok) {
          const errTxt = await res.text();
          throw new Error(`API ${res.status}: ${errTxt}`);
        }

        const data = await res.json();
        if (data.status === 'clarify') {
          if (problemText) setClarifications(effectiveClarifications);
          const questionText = data.question as string;
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: questionText },
          ]);
          speakText(questionText);
        } else if (data.status === 'proposal') {
          setClarifications(effectiveClarifications);
          setHasProposal(true);
          setLastProposal(data.proposal);
          const proposalMsg =
            'Generated a draft proposal with suggested changes.';
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: proposalMsg },
          ]);
          speakText(proposalMsg);

          if (data.proposal?.changes && Array.isArray(data.proposal.changes)) {
            // Start with current events as the base for proposed schedule
            let proposedSchedule = [...currentEvents];
            
            // Apply each change to build the complete proposed schedule
            for (const change of data.proposal.changes) {
              if (!change.event) continue;
              
              switch (change.type) {
                case 'add':
                  // Add new event
                  proposedSchedule.push({
                    id: change.event.id || change.id,
                    title: change.event.title,
                    start: change.event.start,
                    end: change.event.end,
                    durationMinutes:
                      change.event.durationMinutes ||
                      Math.round(
                        (new Date(change.event.end).getTime() -
                          new Date(change.event.start).getTime()) /
                          60000
                      ),
                    source: 'proposed' as const,
                    changeType: 'add',
                  });
                  break;
                  
                case 'remove':
                  // Remove existing event
                  if (change.targetEventId) {
                    proposedSchedule = proposedSchedule.filter(
                      event => event.id !== change.targetEventId
                    );
                  }
                  break;
                  
                case 'move':
                case 'adjust':
                  // Modify existing event
                  if (change.targetEventId) {
                    const eventIndex = proposedSchedule.findIndex(
                      event => event.id === change.targetEventId
                    );
                    if (eventIndex !== -1) {
                      proposedSchedule[eventIndex] = {
                        ...proposedSchedule[eventIndex],
                        title: change.event.title,
                        start: change.event.start,
                        end: change.event.end,
                        durationMinutes:
                          change.event.durationMinutes ||
                          Math.round(
                            (new Date(change.event.end).getTime() -
                              new Date(change.event.start).getTime()) /
                              60000
                          ),
                        changeType: change.type,
                      };
                    }
                  }
                  break;
              }
            }
            
            setProposedEvents(proposedSchedule);
          }
        }
      } catch (err: any) {
        console.error('Conversation send error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Sorry, I ran into an issue. Please try again.',
          },
        ]);
      } finally {
        setIsRequesting(false);
      }
    },
    [pendingInput, isRequesting, problemText, clarifications, speakText]
  );

  // calendar events are provided by useCalendarEvents()
  // State for proposed schedule changes (may include diff metadata later)
  const [proposedEvents, setProposedEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingProposed, setIsLoadingProposed] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  // TODO: Wire up fetching of current events when conversation starts or on mount.
  // TODO: Populate proposedEvents with diff metadata (changeType, accepted) when proposals are generated.

  // Export transcript handler
  const handleExportTranscript = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/export/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: messages.map((msg) => ({
            role: msg.role,
            text: msg.text,
            timestamp: new Date().toISOString(),
          })),
          proposedEvents: proposedEvents.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            durationMinutes: event.durationMinutes,
            changeType: (event as any).changeType || 'unknown',
            rationale: (event as any).rationale || '',
          })),
          scope: 'day', // Export current day by default
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `scheduling-transcript-${new Date().toISOString().slice(0, 10)}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      // You could add a toast notification here
      alert('Failed to export transcript. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, messages, proposedEvents]);

  // useCalendarEvents performs the fetch on mount and handles revoked detection

  // Voice input is now provided by the shared VoiceInput component

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
          <p
            className={`${isDarkMode ? 'text-brand-blue' : 'text-brand-teal'}`}
            aria-live="polite"
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}
      >
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-brand-reverse rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>
        <main
          className={`max-w-md w-full backdrop-blur-xl rounded-2xl shadow-2xl border p-8 relative z-10 ${isDarkMode ? 'bg-gray-900/80 border-brand-teal/30' : 'bg-white/80 border-brand-blue/30'}`}
          role="main"
        >
          <div className="text-center">
            <img
              src="/clarity-logo.png"
              alt="Clarity - AI Schedule Counseling Assistant"
              className="w-80 h-auto mx-auto mb-8 drop-shadow-[0_0_30px_rgba(111,222,182,0.3)]"
            />
            <p
              className={`mb-8 ${isDarkMode ? 'text-brand-blue/80' : 'text-gray-600'}`}
            >
              Connect your Google Calendar to get personalized scheduling
              assistance
            </p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-gradient-brand text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 focus:ring-offset-brand-dark transition-all duration-200 transform hover:scale-[1.02]"
              aria-label="Sign in with Google to access calendar integration"
            >
              Sign in with Google
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Render the extracted revoked banner component

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}
    >
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-gradient-brand rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-60 right-20 w-[500px] h-[500px] bg-gradient-brand-reverse rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-[500px] h-[500px] bg-gradient-brand rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header */}
      <header
        className={`backdrop-blur-lg shadow-xl border-b relative z-20 ${isDarkMode ? 'bg-gray-900/80 border-brand-teal/20' : 'bg-white/80 border-gray-200'}`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20 relative">
            <img
              src="/clarity-logo.png"
              alt="Clarity"
              className="h-16 w-auto drop-shadow-[0_0_15px_rgba(111,222,182,0.2)]"
            />
            <nav
              className="flex items-center space-x-4 absolute right-0"
              role="navigation"
              aria-label="User navigation"
            >
              <div className="flex items-center space-x-2 mr-4">
                <label className="text-sm text-gray-400 mr-2">Week</label>
                <button
                  onClick={() =>
                    setViewMode(viewMode === 'week' ? 'day' : 'week')
                  }
                  className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                  aria-pressed={viewMode === 'week'}
                  aria-label="Toggle week view"
                  title="Toggle week/day view"
                >
                  {viewMode === 'week' ? 'Week' : 'Day'}
                </button>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-brand-dark/50 text-brand-mint hover:bg-brand-dark/70' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                aria-label="Toggle dark mode"
                title={
                  isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
                }
              >
                {isDarkMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`text-sm ${isDarkMode ? 'text-brand-blue/80' : 'text-gray-600'}`}
                aria-label={`Signed in as ${session.user?.email}`}
              >
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className={`text-sm rounded-lg px-3 py-1.5 transition-all duration-200 ${isDarkMode ? 'text-brand-mint hover:text-brand-blue focus:ring-brand-mint focus:ring-offset-brand-dark' : 'text-gray-700 hover:text-gray-900 focus:ring-brand-teal focus:ring-offset-white'} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                aria-label="Sign out of your account"
              >
                Sign out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <RevokedBanner
        open={calendarAccessRevoked}
        message={calendarRevokedMessage}
        onReconnect={() => signIn('google')}
        onDismiss={dismissRevoked}
      />

      {/* Main Content */}
      <main
        className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10 lg:pr-[33vw] h-full"
        role="main"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-5rem)]">
          {/* Schedule Panels (left two-thirds) */}
          <section
            className="lg:col-span-2 h-full lg:fixed lg:top-20 lg:left-0 lg:right-[33vw] lg:h-[calc(100vh-5rem)]"
            aria-labelledby="schedule-heading"
          >
            <div aria-hidden="true" className="sr-only" id="schedule-heading">
              Current and Proposed Schedules
            </div>
            <SchedulePanels
              currentEvents={currentEvents}
              proposedEvents={proposedEvents}
              view={viewMode}
            />
          </section>

          {/* Conversation Panel (right third) */}
          <section
            className="lg:col-span-1"
            aria-labelledby="conversation-heading"
          >
            <div
              className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border h-96 flex flex-col lg:rounded-none lg:shadow-none lg:fixed lg:top-20 lg:right-0 lg:w-1/3 lg:h-[calc(100vh-5rem)] lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0`}
              data-testid="conversation-panel"
            >
              <div className="p-4 border-b bg-gradient-to-r from-white/0 to-white/0 dark:from-gray-900/0 dark:to-gray-900/0">
                <h2
                  id="conversation-heading"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  Conversation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ask about your schedule and get suggested changes.
                </p>
              </div>
              <div className="p-4 flex flex-col overflow-hidden h-full">
                {!isConversationActive ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p
                        className={`mb-4 ${isDarkMode ? 'text-brand-blue/70' : 'text-gray-600'}`}
                      >
                        Ready to help with your schedule
                      </p>
                      <div className="space-x-3">
                        <button
                          onClick={() => {
                            setIsConversationActive(true);
                            setConversationMode('text');
                          }}
                          className="bg-gradient-brand text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          aria-label="Start a text chat with the AI schedule assistant"
                        >
                          Start Text Chat
                        </button>
                        <button
                          onClick={() => {
                            setIsConversationActive(true);
                            setConversationMode('audio');
                          }}
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setConversationMode('text')}
                          className={`text-sm px-2 py-1 rounded ${conversationMode === 'text' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
                          aria-label="Switch to text mode"
                        >
                          Text
                        </button>
                        <button
                          onClick={() => setConversationMode('audio')}
                          className={`text-sm px-2 py-1 rounded ${conversationMode === 'audio' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'}`}
                          aria-label="Switch to audio mode"
                        >
                          Audio
                        </button>
                      </div>
                      {conversationMode === 'audio' && (
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-600">
                            {isSpeaking ? 'Speaking...' : 'Audio mode active'}
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      ref={transcriptRef}
                      className="flex-1 overflow-y-auto mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg lg:rounded-none text-sm space-y-3"
                      role="log"
                      aria-label="Conversation transcript"
                      aria-live="polite"
                      data-testid="conversation-transcript"
                    >
                      {messages.map((m, idx) => (
                        <div key={idx} className="mb-2" role="listitem">
                          <div
                            className={`inline-block max-w-[85%] p-3 rounded-lg ${
                              m.role === 'user'
                                ? 'bg-gradient-to-r from-brand-mint/20 to-brand-mint/10 text-gray-900 self-end'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-900'
                            } ${m.role === 'assistant' ? 'ml-0' : 'ml-auto'}`}
                          >
                            <div className="text-xs font-semibold text-gray-600 capitalize mb-1">
                              {m.role}
                            </div>
                            <div className="whitespace-pre-wrap">{m.text}</div>
                          </div>
                        </div>
                      ))}
                      {isRequesting && (
                        <div className="text-gray-500 italic" role="status">
                          Thinking...
                        </div>
                      )}
                    </div>
                    {conversationMode === 'text' && (
                      <form
                        className="flex space-x-2 mt-auto"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSend();
                        }}
                      >
                        <label htmlFor="message-input" className="sr-only">
                          Type your message to the AI assistant
                        </label>
                        <input
                          id="message-input"
                          type="text"
                          placeholder="Type your message or use voice..."
                          className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-mint bg-gray-50 dark:bg-gray-800"
                          aria-describedby="message-help"
                          value={pendingInput}
                          disabled={isRequesting}
                          onChange={(e) => setPendingInput(e.target.value)}
                        />
                        <span id="message-help" className="sr-only">
                          Enter your scheduling question or concern to get
                          personalized assistance
                        </span>
                        <button
                          type="submit"
                          className="bg-gradient-brand text-white px-5 py-2.5 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-all duration-150"
                          aria-label="Send message to AI assistant"
                          disabled={isRequesting || !pendingInput.trim()}
                        >
                          {hasProposal ? 'Refine' : 'Send'}
                        </button>
                      </form>
                    )}
                    {conversationMode === 'audio' && (
                      <div className="mt-2">
                        <VoiceInput
                          autoStart
                          autoSubmit
                          onTranscript={(t) => {
                            // populate pending input and send immediately
                            setPendingInput(t);
                            if (!isRequesting) {
                              // small timeout to ensure state updates
                              setTimeout(() => handleSend(t), 50);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* (Proposals panel removed — now part of SchedulePanels) */}
        </div>

        {/* Action Buttons */}
        {isConversationActive && (
          <section className="mt-8" aria-label="Schedule management actions">
            <div className="flex justify-center space-x-4" role="group">
              <button
                className={`bg-gradient-brand text-white font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 ${isDarkMode ? 'focus:ring-offset-gray-950' : 'focus:ring-offset-white'}`}
                aria-label="Apply selected schedule changes to your Google Calendar"
                disabled
              >
                Apply Changes
              </button>
              <button
                className={`font-semibold px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] ${isDarkMode ? 'bg-brand-teal/50 text-brand-blue hover:bg-brand-teal/70 focus:ring-offset-gray-950' : 'bg-gray-100 text-brand-teal hover:bg-gray-200 focus:ring-offset-white'}`}
                aria-label="Undo the last applied changes to your calendar"
              >
                Undo Last Apply
              </button>
              <button
                onClick={handleExportTranscript}
                disabled={isExporting}
                className={`border font-semibold px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-brand-dark/60 border-brand-teal/40 text-brand-mint hover:bg-brand-dark/80 focus:ring-offset-gray-950' : 'bg-white border-gray-300 text-brand-teal hover:bg-gray-50 focus:ring-offset-white'}`}
                aria-label="Export conversation transcript as CSV file"
              >
                {isExporting ? 'Exporting...' : 'Export Transcript'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

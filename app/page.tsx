'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { CalendarPanel } from '@/components/CalendarPanel';
import { type CalendarEvent } from '@/lib/models/calendarEvent';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // State for current calendar events
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  // State for proposed schedule changes (may include diff metadata later)
  const [proposedEvents, setProposedEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingProposed, setIsLoadingProposed] = useState(false);
  // TODO: Wire up fetching of current events when conversation starts or on mount.
  // TODO: Populate proposedEvents with diff metadata (changeType, accepted) when proposals are generated.

  // Function to start conversation with Gemini
  const startConversation = async () => {
    setIsLoadingChat(true);
    try {
      const response = await fetch('/api/conversation/chat?action=start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setIsConversationActive(true);
        
        // Add system message
        const systemMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'system',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setChatMessages([systemMessage]);
      } else {
        console.error('Failed to start conversation:', data.error);
        alert('Failed to start conversation. Please ensure the Python server is running.');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Error starting conversation. Please ensure the Python server is running on localhost:5000');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Function to send message
  const sendMessage = async (message: string) => {
    if (!message.trim() || !sessionId) return;
    
    setIsLoadingChat(true);
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    try {
      const response = await fetch('/api/conversation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add assistant response to chat
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Failed to send message:', data.error);
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please ensure the Python server is running.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoadingChat) {
      sendMessage(inputMessage.trim());
    }
  };

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
            <div className="bg-white rounded-lg shadow-sm border h-96" data-testid="conversation-panel">
              <div className="p-4 border-b">
                <h2 id="conversation-heading" className="text-lg font-medium text-gray-900">
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
                        onClick={startConversation}
                        disabled={isLoadingChat}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Start a conversation with the AI schedule assistant"
                      >
                        {isLoadingChat ? 'Starting...' : 'Start Conversation'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div 
                      ref={chatScrollRef}
                      className="flex-1 overflow-y-auto mb-4 p-2 bg-gray-50 rounded max-h-64"
                      role="log"
                      aria-label="Conversation transcript"
                      aria-live="polite"
                      data-testid="conversation-transcript"
                      style={{ 
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#9CA3AF #F3F4F6'
                      }}
                    >
                      <div className="space-y-2">
                        {chatMessages.map((message) => (
                          <div key={message.id} className="text-sm text-gray-600" role="listitem">
                            <span className="font-semibold">
                              {message.role === 'user' ? 'You:' : message.role === 'system' ? 'System:' : 'Assistant:'}
                            </span> {message.content}
                          </div>
                        ))}
                        {isLoadingChat && (
                          <div className="text-sm text-gray-500" role="listitem">
                            <span className="font-semibold">Assistant:</span> Thinking...
                          </div>
                        )}
                      </div>
                    </div>
                    <form className="flex space-x-2" onSubmit={handleSubmit}>
                      <label htmlFor="message-input" className="sr-only">
                        Type your message to the AI assistant
                      </label>
                      <input
                        id="message-input"
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message or use voice..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-describedby="message-help"
                        disabled={isLoadingChat}
                      />
                      <span id="message-help" className="sr-only">
                        Enter your scheduling question or concern to get personalized assistance
                      </span>
                      <button 
                        type="submit"
                        disabled={!inputMessage.trim() || isLoadingChat}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message to AI assistant"
                      >
                        {isLoadingChat ? 'Sending...' : 'Send'}
                      </button>
                    </form>
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
'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  if (status === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-brand-reverse rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>
        <div className="text-center relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-mint mx-auto mb-4"
            role="status"
            aria-label="Loading application"
          ></div>
          <p className={`${isDarkMode ? 'text-brand-blue' : 'text-brand-teal'}`} aria-live="polite">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-brand-reverse rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-gradient-brand rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>
        <main className={`max-w-md w-full backdrop-blur-xl rounded-2xl shadow-2xl border p-8 relative z-10 ${isDarkMode ? 'bg-gray-900/80 border-brand-teal/30' : 'bg-white/80 border-brand-blue/30'}`} role="main">
          <div className="text-center">
            <img 
              src="/clarity-logo.png" 
              alt="Clarity - AI Schedule Counseling Assistant" 
              className="w-80 h-auto mx-auto mb-8 drop-shadow-[0_0_30px_rgba(111,222,182,0.3)]"
            />
            <p className={`mb-8 ${isDarkMode ? 'text-brand-blue/80' : 'text-gray-600'}`}>
              Connect your Google Calendar to get personalized scheduling assistance
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

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-gradient-brand rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-60 right-20 w-[500px] h-[500px] bg-gradient-brand-reverse rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-[500px] h-[500px] bg-gradient-brand rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header */}
      <header className={`backdrop-blur-lg shadow-xl border-b relative z-20 ${isDarkMode ? 'bg-gray-900/80 border-brand-teal/20' : 'bg-white/80 border-gray-200'}`} role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20 relative">
            <img 
              src="/clarity-logo.png" 
              alt="Clarity" 
              className="h-16 w-auto drop-shadow-[0_0_15px_rgba(111,222,182,0.2)]"
            />
            <nav className="flex items-center space-x-4 absolute right-0" role="navigation" aria-label="User navigation">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-brand-dark/50 text-brand-mint hover:bg-brand-dark/70' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                aria-label="Toggle dark mode"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <span className={`text-sm ${isDarkMode ? 'text-brand-blue/80' : 'text-gray-600'}`} aria-label={`Signed in as ${session.user?.email}`}>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10" role="main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Panel - Current Events */}
          <section className="lg:col-span-1" aria-labelledby="current-schedule-heading">
            <div className={`backdrop-blur-xl rounded-2xl shadow-2xl border h-96 ${isDarkMode ? 'bg-gray-900/60 border-brand-teal/30' : 'bg-white/60 border-gray-200'}`} data-testid="calendar-current">
              <div className={`p-4 border-b ${isDarkMode ? 'border-brand-teal/20' : 'border-gray-200'}`}>
                <h2 id="current-schedule-heading" className={`text-lg font-semibold ${isDarkMode ? 'text-brand-mint' : 'text-brand-teal'}`}>
                  Current Schedule
                </h2>
              </div>
              <div className="p-4" role="region" aria-label="Current calendar events">
                <div className={`text-center mt-8 ${isDarkMode ? 'text-brand-blue/60' : 'text-gray-500'}`}>
                  <p>Your current events will appear here</p>
                  <p className="text-sm mt-2">Connect and start a conversation to load events</p>
                </div>
              </div>
            </div>
          </section>

          {/* Conversation Panel */}
          <section className="lg:col-span-1" aria-labelledby="conversation-heading">
            <div className={`backdrop-blur-xl rounded-2xl shadow-2xl border h-96 ${isDarkMode ? 'bg-gray-900/60 border-brand-teal/30' : 'bg-white/60 border-gray-200'}`} data-testid="conversation-panel">
              <div className={`p-4 border-b ${isDarkMode ? 'border-brand-teal/20' : 'border-gray-200'}`}>
                <h2 id="conversation-heading" className={`text-lg font-semibold ${isDarkMode ? 'text-brand-mint' : 'text-brand-teal'}`}>
                  Conversation
                </h2>
              </div>
              <div className="p-4 flex flex-col overflow-hidden" style={{height: 'calc(24rem - 57px)'}}>
                {!isConversationActive ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className={`mb-4 ${isDarkMode ? 'text-brand-blue/70' : 'text-gray-600'}`}>
                        Ready to help with your schedule
                      </p>
                      <button
                        onClick={() => setIsConversationActive(true)}
                        className="bg-gradient-brand text-white font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 focus:ring-offset-brand-dark transition-all duration-200 transform hover:scale-[1.02]"
                        aria-label="Start a conversation with the AI schedule assistant"
                      >
                        Start Conversation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div 
                      className={`flex-1 overflow-y-auto mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-brand-dark/30 border-brand-teal/20' : 'bg-gray-50 border-gray-200'}`}
                      role="log"
                      aria-label="Conversation transcript"
                      aria-live="polite"
                      data-testid="conversation-transcript"
                    >
                      <div className={`text-sm mb-2 ${isDarkMode ? 'text-brand-blue/80' : 'text-gray-700'}`} role="listitem">
                        <span className={`font-semibold ${isDarkMode ? 'text-brand-mint' : 'text-brand-teal'}`}>System:</span> Hi! I'm here to help you optimize your schedule. What scheduling challenge are you facing?
                      </div>
                    </div>
                    <form className="flex gap-2 flex-shrink-0" onSubmit={(e) => e.preventDefault()}>
                      <label htmlFor="message-input" className="sr-only">
                        Type your message to the AI assistant
                      </label>
                      <input
                        id="message-input"
                        type="text"
                        placeholder="Type your message or use voice..."
                        className={`flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${isDarkMode ? 'bg-brand-dark/50 border-brand-teal/30 text-white placeholder-brand-blue/40 focus:ring-brand-mint' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-brand-teal'}`}
                        aria-describedby="message-help"
                      />
                      <span id="message-help" className="sr-only">
                        Enter your scheduling question or concern to get personalized assistance
                      </span>
                      <button 
                        type="button"
                        className={`flex-shrink-0 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${isDarkMode ? 'bg-brand-teal/50 text-brand-mint hover:bg-brand-teal/70 focus:ring-brand-mint focus:ring-offset-gray-950' : 'bg-gray-100 text-brand-teal hover:bg-gray-200 focus:ring-brand-teal focus:ring-offset-white'}`}
                        aria-label="Start voice dictation"
                        title="Voice dictation"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        type="submit"
                        className={`flex-shrink-0 bg-gradient-brand text-white font-semibold px-4 py-2 text-sm rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] ${isDarkMode ? 'focus:ring-offset-gray-950' : 'focus:ring-offset-white'}`}
                        aria-label="Send message to AI assistant"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Proposal Panel - Proposed Changes */}
          <section className="lg:col-span-1" aria-labelledby="proposals-heading">
            <div className={`backdrop-blur-xl rounded-2xl shadow-2xl border h-96 ${isDarkMode ? 'bg-gray-900/60 border-brand-teal/30' : 'bg-white/60 border-gray-200'}`} data-testid="calendar-proposed">
              <div className={`p-4 border-b ${isDarkMode ? 'border-brand-teal/20' : 'border-gray-200'}`}>
                <h2 id="proposals-heading" className={`text-lg font-semibold ${isDarkMode ? 'text-brand-mint' : 'text-brand-teal'}`}>
                  Proposed Changes
                </h2>
              </div>
              <div className="p-4" role="region" aria-label="Proposed schedule changes">
                <div className={`text-center mt-8 ${isDarkMode ? 'text-brand-blue/60' : 'text-gray-500'}`}>
                  <p>Schedule proposals will appear here</p>
                  <p className="text-sm mt-2">Start a conversation to generate suggestions</p>
                </div>
              </div>
            </div>
          </section>
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
                className={`border font-semibold px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] ${isDarkMode ? 'bg-brand-dark/60 border-brand-teal/40 text-brand-mint hover:bg-brand-dark/80 focus:ring-offset-gray-950' : 'bg-white border-gray-300 text-brand-teal hover:bg-gray-50 focus:ring-offset-white'}`}
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
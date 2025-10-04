'use client';

import { useState, useRef, useEffect } from 'react';
import { TranscriptEntry } from '@/lib/models/proposal';

interface ConversationPanelProps {
  transcript: TranscriptEntry[];
  isListening?: boolean;
  isProcessing?: boolean;
  onSendMessage: (message: string) => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
}

export function ConversationPanel({
  transcript,
  isListening = false,
  isProcessing = false,
  onSendMessage,
  onStartListening,
  onStopListening,
}: ConversationPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    setSupportsSpeech('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleVoiceToggle = () => {
    if (isListening && onStopListening) {
      onStopListening();
    } else if (!isListening && onStartListening) {
      onStartListening();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-96">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Conversation</h2>
          {transcript.length > 0 && (
            <button
              onClick={() => {
                // Export transcript functionality
                const transcriptText = transcript
                  .map((entry) => `[${formatTime(entry.timestamp)}] ${entry.role}: ${entry.text}`)
                  .join('\n');
                const blob = new Blob([transcriptText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Export
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col h-80">
        {/* Transcript Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {transcript.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>Start a conversation to get scheduling assistance</p>
              <p className="text-sm mt-2">
                You can type or use voice input to describe your scheduling needs
              </p>
            </div>
          ) : (
            transcript.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${
                  entry.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    entry.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  <p className="text-sm">{entry.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      entry.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(entry.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "Listening..." : "Type your message or use voice..."}
              disabled={isListening || isProcessing}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            
            {supportsSpeech && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  isListening
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
                }`}
              >
                {isListening ? '🎤' : '🎙️'}
              </button>
            )}
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing || isListening}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Send
            </button>
          </form>
          
          {isListening && (
            <div className="mt-2 text-center">
              <div className="inline-flex items-center text-sm text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
                Listening... Click microphone to stop
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
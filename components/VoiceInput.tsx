'use client';

import { useSTT } from '@/lib/hooks/useSTT';
import { useState, useEffect, useRef } from 'react';

interface VoiceInputProps {
  onTranscript?: (transcript: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  autoSubmit?: boolean;
  autoStart?: boolean;
}

export function VoiceInput({
  onTranscript,
  onStart,
  onStop,
  placeholder = 'Click to speak or type...',
  className = '',
  size = 'md',
  disabled = false,
  autoSubmit = false,
  autoStart = false,
}: VoiceInputProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    clearError,
  } = useSTT();

  // Auto-start listening when requested
  useEffect(() => {
    if (autoStart && !isListening && isSupported) {
      clearTranscript();
      lastTranscriptRef.current = '';
      startListening();
      onStart?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const [inputValue, setInputValue] = useState('');
  const [showError, setShowError] = useState(false);
  const lastTranscriptRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onTranscript?.(inputValue.trim());
      setInputValue('');
    }
  };

  // Update input value when transcript changes
  useEffect(() => {
    if (
      transcript &&
      transcript.trim() &&
      transcript !== lastTranscriptRef.current
    ) {
      setInputValue(transcript);
      lastTranscriptRef.current = transcript;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the onTranscript callback
      timeoutRef.current = setTimeout(() => {
        onTranscript?.(transcript);

        if (autoSubmit) {
          handleSubmit();
        }
      }, 500); // 500ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transcript, onTranscript, autoSubmit]);

  // Show error for 3 seconds
  useEffect(() => {
    if (error) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  }, [error]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      onStop?.();
    } else {
      clearTranscript();
      lastTranscriptRef.current = ''; // Reset the last transcript
      startListening();
      onStart?.();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-4 py-3',
  };

  const buttonSizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${sizeClasses[size]}`}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || disabled}
          className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors ${buttonSizeClasses[size]}`}
        >
          Send
        </button>
        <div className="text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded">
          Voice not supported in this browser
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={isListening ? 'Listening...' : placeholder}
        disabled={disabled || isListening}
        className={`flex-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${sizeClasses[size]}`}
      />

      <button
        onClick={handleVoiceToggle}
        disabled={disabled}
        className={`flex items-center justify-center rounded-md transition-colors ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-gray-500 hover:bg-gray-600 text-white'
        } disabled:opacity-50 ${buttonSizeClasses[size]}`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <div className={`${iconSize[size]} animate-pulse`}>
            <svg
              className="w-full h-full"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
        ) : (
          <svg
            className={iconSize[size]}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      <button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || disabled}
        className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors ${buttonSizeClasses[size]}`}
      >
        Send
      </button>

      {showError && error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
          {error}
          <button
            onClick={() => {
              setShowError(false);
              clearError();
            }}
            className="ml-2 text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {isListening && (
        <div className="text-xs text-red-600 animate-pulse">Listening...</div>
      )}
    </div>
  );
}

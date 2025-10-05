'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface STTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface STTState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export function useSTT(options: STTOptions = {}) {
  const [state, setState] = useState<STTState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition;

    if (!isSupported) {
      console.warn(
        'Speech Recognition not supported in this browser. Try Chrome or Edge.'
      );
    }

    setState((prev) => ({ ...prev, isSupported }));
  }, []);

  const startListening = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: 'Speech recognition not supported in this browser',
      }));
      return;
    }

    if (state.isListening) {
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = options.continuous || false;
      recognition.interimResults = options.interimResults || true;
      recognition.lang = options.language || 'en-US';
      recognition.maxAlternatives = options.maxAlternatives || 1;

      recognition.onstart = () => {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
          transcript: '',
          interimTranscript: '',
        }));
        finalTranscriptRef.current = '';
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        finalTranscriptRef.current = finalTranscript;

        setState((prev) => ({
          ...prev,
          transcript: finalTranscript,
          interimTranscript: interimTranscript,
        }));
      };

      recognition.onerror = (event) => {
        let errorMessage = 'Speech recognition error';

        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage =
              'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        setState((prev) => ({
          ...prev,
          isListening: false,
          error: errorMessage,
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({ ...prev, isListening: false }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start speech recognition',
      }));
    }
  }, [state.isSupported, state.isListening, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
    }));
    finalTranscriptRef.current = '';
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    clearError,
  };
}

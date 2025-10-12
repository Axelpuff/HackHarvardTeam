/**
 * Speech-to-Text (STT) Integration Scaffold
 *
 * This file contains scaffold functions for integrating STT with your app.
 * Use these functions when you're ready to add voice input to your Gemini integration.
 */

import { useSTT } from './hooks/useSTT';
import React from 'react';

/**
 * Hook for voice input with automatic transcript handling
 *
 * Usage in your component:
 * ```typescript
 * const { startListening, stopListening, transcript, isListening } = useVoiceInput();
 *
 * // Start voice input
 * startListening();
 *
 * // When user stops speaking, transcript will be available
 * console.log(transcript); // "Hello, this is what the user said"
 * ```
 */
export function useVoiceInput(
  options: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    onTranscript?: (transcript: string) => void;
  } = {}
) {
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
  } = useSTT(options);

  // Auto-call onTranscript when transcript is ready
  React.useEffect(() => {
    if (transcript && options.onTranscript) {
      options.onTranscript(transcript);
    }
  }, [transcript, options.onTranscript]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    clearError,
  };
}

/**
 * Simple function to get voice input
 *
 * Usage:
 * ```typescript
 * import { getVoiceInput } from '@/lib/stt-integration';
 *
 * // Get voice input from user
 * const userSpeech = await getVoiceInput();
 * console.log(userSpeech); // "Hello, I need help with my schedule"
 * ```
 */
export function getVoiceInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.onend = () => {
      // If no result was captured, reject
      reject(new Error('No speech detected'));
    };

    recognition.start();
  });
}

/**
 * Component for easy voice input integration
 *
 * Usage:
 * ```typescript
 * import { VoiceInput } from '@/lib/stt-integration';
 *
 * <VoiceInput
 *   onTranscript={(text) => console.log('User said:', text)}
 *   placeholder="Speak to Gemini..."
 * />
 * ```
 */
export { VoiceInput } from '@/components/VoiceInput';

/**
 * Integration example for when you're ready:
 *
 * ```typescript
 * // In your main component:
 * import { useVoiceInput } from '@/lib/stt-integration';
 *
 * function MyComponent() {
 *   const { startListening, transcript, isListening } = useVoiceInput({
 *     onTranscript: (text) => {
 *       // Send to Gemini
 *       sendToGemini(text);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={startListening} disabled={isListening}>
 *         {isListening ? 'Listening...' : 'Start Voice Input'}
 *       </button>
 *       {transcript && <p>You said: {transcript}</p>}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Advanced voice input with custom settings
 *
 * ```typescript
 * import { useSTT } from '@/lib/hooks/useSTT';
 *
 * function AdvancedVoiceInput() {
 *   const {
 *     startListening,
 *     stopListening,
 *     transcript,
 *     interimTranscript,
 *     isListening,
 *     error
 *   } = useSTT({
 *     language: 'en-US',
 *     continuous: true,
 *     interimResults: true
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={isListening ? stopListening : startListening}>
 *         {isListening ? 'Stop' : 'Start'} Voice Input
 *       </button>
 *       <div>
 *         <p>Final: {transcript}</p>
 *         <p>Interim: {interimTranscript}</p>
 *       </div>
 *       {error && <p className="text-red-500">Error: {error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */

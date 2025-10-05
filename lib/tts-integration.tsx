/**
 * TTS Integration Scaffold
 * 
 * This file contains scaffold functions for integrating TTS with Gemini responses.
 * Use these functions when you're ready to add TTS to your Gemini responses.
 */

import { useTTS } from './hooks/useTTS';

/**
 * Hook for automatic TTS on AI responses
 * 
 * Usage in your component:
 * ```typescript
 * const { speakResponse, isSpeaking, stopSpeaking } = useAutoTTS();
 * 
 * // When you get a Gemini response:
 * const geminiResponse = await getGeminiResponse(userInput);
 * speakResponse(geminiResponse); // This will automatically speak the response
 * ```
 */
export function useAutoTTS() {
  const { speak, stop, isPlaying, isGenerating, error } = useTTS();

  const speakResponse = (text: string, voiceId?: string) => {
    if (text && text.trim()) {
      speak(text, { voiceId });
    }
  };

  const stopSpeaking = () => {
    stop();
  };

  return {
    speakResponse,
    stopSpeaking,
    isSpeaking: isPlaying,
    isGenerating,
    error,
  };
}

/**
 * Simple function to speak any text
 * 
 * Usage:
 * ```typescript
 * import { speakText } from '@/lib/tts-integration';
 * 
 * // Speak any text
 * await speakText("Hello, this is a test response from Gemini");
 * ```
 */
export async function speakText(text: string, voiceId?: string): Promise<void> {
  try {
    const response = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }

    // Create audio and play
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    await audio.play();
  } catch (error) {
    console.error('TTS Error:', error);
  }
}

/**
 * Component wrapper for easy TTS integration
 * 
 * Usage:
 * ```typescript
 * import { TTSSpeaker } from '@/lib/tts-integration';
 * 
 * <TTSSpeaker text={geminiResponse} voiceId="optional-voice-id" />
 * ```
 */
export function TTSSpeaker({ 
  text, 
  voiceId, 
  className = "",
  size = "sm" 
}: { 
  text: string; 
  voiceId?: string; 
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { speakResponse, isSpeaking, stopSpeaking } = useAutoTTS();

  const handleClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakResponse(text, voiceId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors ${className}`}
      title={isSpeaking ? 'Stop speaking' : 'Speak text'}
    >
      {isSpeaking ? (
        <span className="text-xs">⏹️</span>
      ) : (
        <span className="text-xs">🔊</span>
      )}
    </button>
  );
}

/**
 * Integration example for when you're ready:
 * 
 * ```typescript
 * // In your main component:
 * import { useAutoTTS } from '@/lib/tts-integration';
 * 
 * function MyComponent() {
 *   const { speakResponse } = useAutoTTS();
 *   
 *   const handleGeminiResponse = async (userInput: string) => {
 *     // Your existing Gemini integration
 *     const response = await yourGeminiFunction(userInput);
 *     
 *     // Add TTS - just one line!
 *     speakResponse(response);
 *   };
 * }
 * ```
 */

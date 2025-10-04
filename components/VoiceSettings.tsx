'use client';

import { useState, useEffect } from 'react';
import { TTSButton } from './TTSButton';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
}

interface VoiceSettingsProps {
  onVoiceChange?: (voiceId: string) => void;
  className?: string;
}

export function VoiceSettings({ onVoiceChange, className = '' }: VoiceSettingsProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tts/voices');
      if (!response.ok) {
        throw new Error('Failed to load voices');
      }
      
      const data = await response.json();
      setVoices(data.voices || []);
      
      // Set default voice
      if (data.voices && data.voices.length > 0) {
        const defaultVoice = data.voices.find((v: Voice) => v.category === 'premade') || data.voices[0];
        setSelectedVoice(defaultVoice.voice_id);
        onVoiceChange?.(defaultVoice.voice_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    onVoiceChange?.(voiceId);
  };

  const testVoice = (voiceId: string) => {
    // This will be handled by the TTSButton component
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Loading voices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm">
          Error loading voices: {error}
          <button 
            onClick={loadVoices}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Voice Settings</h3>
      
      <div className="space-y-2">
        {voices.map((voice) => (
          <div
            key={voice.voice_id}
            className={`flex items-center justify-between p-2 rounded-lg border ${
              selectedVoice === voice.voice_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={voice.voice_id}
                  name="voice"
                  value={voice.voice_id}
                  checked={selectedVoice === voice.voice_id}
                  onChange={() => handleVoiceChange(voice.voice_id)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={voice.voice_id} className="text-sm font-medium text-gray-900">
                  {voice.name}
                </label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {voice.category}
                </span>
              </div>
            </div>
            
            <TTSButton
              text="Hello! This is how I sound."
              voiceId={voice.voice_id}
              size="sm"
              className="ml-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

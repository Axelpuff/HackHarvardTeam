'use client';

import { useState } from 'react';
import { TTSButton } from '@/components/TTSButton';
import { VoiceSettings } from '@/components/VoiceSettings';

export default function TTSDemoPage() {
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [testText, setTestText] = useState('Hello! This is a test of the ElevenLabs text-to-speech integration. The AI assistant can now speak responses aloud using high-quality voice synthesis.');

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            ElevenLabs TTS Integration Demo
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voice Settings */}
            <div className="bg-gray-50 rounded-lg">
              <VoiceSettings 
                onVoiceChange={handleVoiceChange}
                className=""
              />
            </div>

            {/* Test Area */}
            <div className="space-y-4">
              <div>
                <label htmlFor="test-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Test Text
                </label>
                <textarea
                  id="test-text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter text to convert to speech..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <TTSButton
                  text={testText}
                  voiceId={selectedVoice}
                  size="lg"
                  className=""
                />
                <div className="text-sm text-gray-600">
                  Click the speaker icon to hear the text
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Integration Features:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• High-quality voice synthesis with ElevenLabs</li>
                  <li>• Multiple voice options to choose from</li>
                  <li>• Real-time audio generation</li>
                  <li>• Automatic voice selection for AI responses</li>
                  <li>• Error handling and retry logic</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              How to Use in Your App:
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`// Import the TTS components
import { TTSButton } from '@/components/TTSButton';
import { VoiceSettings } from '@/components/VoiceSettings';

// Use TTSButton for any text
<TTSButton 
  text="Your text here" 
  voiceId="optional-voice-id"
  size="md"
/>

// Add voice settings to your app
<VoiceSettings onVoiceChange={handleVoiceChange} />`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

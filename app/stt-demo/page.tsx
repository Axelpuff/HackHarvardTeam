'use client';

import { useState } from 'react';
import { VoiceInput } from '@/components/VoiceInput';
import { useVoiceInput } from '@/lib/stt-integration';

export default function STTDemoPage() {
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');

  const handleTranscript = (transcript: string) => {
    // Prevent duplicate submissions
    if (transcript.trim() && transcript !== lastTranscript) {
      setTranscripts(prev => [...prev, transcript]);
      setLastTranscript(transcript);
      setCurrentTranscript('');
    }
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Speech-to-Text (STT) Integration Demo
          </h1>
          
          <div className="space-y-6">
            {/* Basic Voice Input */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Basic Voice Input
              </h3>
              <VoiceInput
                onTranscript={handleTranscript}
                placeholder="Click the microphone and speak..."
                className="w-full"
                size="lg"
              />
            </div>

            {/* Auto-Submit Voice Input */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Auto-Submit Voice Input
              </h3>
              <VoiceInput
                onTranscript={handleTranscript}
                placeholder="Speak and it will auto-submit..."
                className="w-full"
                size="lg"
                autoSubmit={true}
              />
            </div>

            {/* Current Transcript */}
            {currentTranscript && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Current Transcript:
                </h3>
                <p className="text-blue-800">{currentTranscript}</p>
              </div>
            )}

            {/* Transcript History */}
            {transcripts.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Transcript History
                  </h3>
                  <button
                    onClick={clearTranscripts}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {transcripts.map((transcript, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-gray-800">{transcript}</p>
                        <span className="text-xs text-gray-500 ml-2">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integration Features */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                STT Integration Features:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Real-time speech recognition</li>
                <li>• Multiple language support</li>
                <li>• Interim and final results</li>
                <li>• Error handling and user feedback</li>
                <li>• Auto-submit functionality</li>
                <li>• Browser compatibility detection</li>
              </ul>
            </div>

            {/* Usage Examples */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                How to Use in Your App:
              </h3>
              <div className="bg-gray-800 rounded-lg p-4">
                <pre className="text-sm text-gray-100 overflow-x-auto">
{`// Import the STT components
import { VoiceInput } from '@/components/VoiceInput';
import { useVoiceInput } from '@/lib/stt-integration';

// Use VoiceInput component
<VoiceInput 
  onTranscript={(text) => {
    // Send to Gemini
    sendToGemini(text);
  }}
  placeholder="Speak to Gemini..."
/>

// Or use the hook directly
const { startListening, transcript } = useVoiceInput({
  onTranscript: (text) => sendToGemini(text)
});`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

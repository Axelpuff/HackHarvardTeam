'use client';

import { useState, useEffect } from 'react';

export default function VoiceSetupPage() {
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    isChrome: false,
    isEdge: false,
    isFirefox: false,
    isSafari: false,
    isHTTPS: false,
    hasMicrophone: false,
    speechSupported: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isEdge = /Edge/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isHTTPS =
      location.protocol === 'https:' || location.hostname === 'localhost';

    // Check for microphone access
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => setBrowserInfo((prev) => ({ ...prev, hasMicrophone: true })))
      .catch(() =>
        setBrowserInfo((prev) => ({ ...prev, hasMicrophone: false }))
      );

    // Check for speech recognition support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSupported = !!SpeechRecognition;

    setBrowserInfo({
      userAgent,
      isChrome,
      isEdge,
      isFirefox,
      isSafari,
      isHTTPS,
      hasMicrophone: false, // Will be updated by the promise above
      speechSupported,
    });
  }, []);

  const getBrowserRecommendation = () => {
    if (browserInfo.isChrome)
      return '✅ Chrome - Best support for voice features';
    if (browserInfo.isEdge) return '✅ Edge - Good support for voice features';
    if (browserInfo.isFirefox)
      return '⚠️ Firefox - Limited voice support, try Chrome';
    if (browserInfo.isSafari) return '❌ Safari - No voice support, try Chrome';
    return '❓ Unknown browser - Try Chrome or Edge for best results';
  };

  const getHTTPSStatus = () => {
    if (browserInfo.isHTTPS) return '✅ HTTPS - Voice features will work';
    return '⚠️ HTTP - Voice features require HTTPS in production';
  };

  const getMicrophoneStatus = () => {
    if (browserInfo.hasMicrophone) return '✅ Microphone access granted';
    return '❌ Microphone access denied - Please allow microphone access';
  };

  const getSpeechStatus = () => {
    if (browserInfo.speechSupported)
      return '✅ Speech Recognition API supported';
    return '❌ Speech Recognition API not supported';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Voice Setup & Browser Compatibility
          </h1>

          <div className="space-y-6">
            {/* Browser Detection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                Browser Compatibility Check
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-800">Browser:</span>
                  <span className="text-blue-800 font-medium">
                    {getBrowserRecommendation()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">HTTPS:</span>
                  <span className="text-blue-800 font-medium">
                    {getHTTPSStatus()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Microphone:</span>
                  <span className="text-blue-800 font-medium">
                    {getMicrophoneStatus()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Speech API:</span>
                  <span className="text-blue-800 font-medium">
                    {getSpeechStatus()}
                  </span>
                </div>
              </div>
            </div>

            {/* Troubleshooting Steps */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-900 mb-4">
                If Voice is Not Working:
              </h3>
              <ol className="text-yellow-800 space-y-2 list-decimal list-inside">
                <li>
                  <strong>Use Chrome or Edge:</strong> These browsers have the
                  best voice support
                </li>
                <li>
                  <strong>Allow Microphone Access:</strong> Click the microphone
                  icon in your browser's address bar
                </li>
                <li>
                  <strong>Use HTTPS:</strong> Voice features require HTTPS in
                  production
                </li>
                <li>
                  <strong>Check Permissions:</strong> Go to browser settings and
                  allow microphone access
                </li>
                <li>
                  <strong>Try Incognito Mode:</strong> Sometimes helps with
                  permission issues
                </li>
              </ol>
            </div>

            {/* Browser Support Matrix */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Browser Support Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Browser</th>
                      <th className="text-center py-2">Voice Input</th>
                      <th className="text-center py-2">Voice Output</th>
                      <th className="text-center py-2">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Chrome</td>
                      <td className="text-center py-2">✅ Excellent</td>
                      <td className="text-center py-2">✅ Excellent</td>
                      <td className="text-center py-2 text-green-600">
                        Recommended
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Edge</td>
                      <td className="text-center py-2">✅ Good</td>
                      <td className="text-center py-2">✅ Good</td>
                      <td className="text-center py-2 text-green-600">Good</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Firefox</td>
                      <td className="text-center py-2">⚠️ Limited</td>
                      <td className="text-center py-2">✅ Good</td>
                      <td className="text-center py-2 text-yellow-600">
                        Partial
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Safari</td>
                      <td className="text-center py-2">❌ No</td>
                      <td className="text-center py-2">✅ Good</td>
                      <td className="text-center py-2 text-red-600">
                        Not Recommended
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Fixes */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-4">
                Quick Fixes
              </h3>
              <div className="space-y-2 text-green-800">
                <p>
                  <strong>1. Try Chrome:</strong> Download Chrome for the best
                  voice experience
                </p>
                <p>
                  <strong>2. Allow Microphone:</strong> Click the microphone
                  icon in your browser's address bar
                </p>
                <p>
                  <strong>3. Use HTTPS:</strong> Make sure you're using https://
                  in production
                </p>
                <p>
                  <strong>4. Check Settings:</strong> Go to Chrome Settings →
                  Privacy → Site Settings → Microphone
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

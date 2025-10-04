'use client';

import { useTTS } from '@/lib/hooks/useTTS';
import { useState } from 'react';

interface TTSButtonProps {
  text: string;
  voiceId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function TTSButton({ 
  text, 
  voiceId, 
  className = '', 
  size = 'md',
  disabled = false 
}: TTSButtonProps) {
  const { isPlaying, isGenerating, error, speak, stop, clearError } = useTTS();
  const [showError, setShowError] = useState(false);

  const handleClick = async () => {
    if (isPlaying) {
      stop();
    } else {
      await speak(text, { voiceId });
    }
  };

  const handleError = () => {
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

  if (error && !showError) {
    handleError();
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isGenerating}
        className={`
          ${sizeClasses[size]}
          ${className}
          flex items-center justify-center
          rounded-full
          bg-blue-500 hover:bg-blue-600
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        title={isPlaying ? 'Stop speaking' : 'Speak text'}
      >
        {isGenerating ? (
          <div className={`${iconSize[size]} animate-spin`}>
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : isPlaying ? (
          <svg className={iconSize[size]} fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className={iconSize[size]} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      {showError && error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
          {error}
          <button
            onClick={() => setShowError(false)}
            className="ml-2 text-red-200 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

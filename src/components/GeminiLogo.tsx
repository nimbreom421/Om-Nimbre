import React from 'react';

interface GeminiLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const GeminiLogo: React.FC<GeminiLogoProps> = ({
  className = '',
  size = 28,
  animated = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${
        animated ? 'gemini-sparkle-glow' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? 'animate-pulse-subtle' : ''}
      >
        <defs>
          <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="40%" stopColor="#9B72CB" />
            <stop offset="70%" stopColor="#D96570" />
            <stop offset="100%" stopColor="#1E88E5" />
          </linearGradient>
        </defs>
        {/* Gemini 4-point Star Curve */}
        <path
          d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
          fill="url(#geminiGrad)"
        />
      </svg>
    </div>
  );
};

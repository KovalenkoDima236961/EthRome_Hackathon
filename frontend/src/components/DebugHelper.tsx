import React, { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';

export const DebugHelper: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 max-w-xs z-50">
      <div className="flex items-center mb-2">
        <Bug className="w-4 h-4 mr-2 text-purple-400" />
        <span className="font-medium text-white">Debug Mode</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>Enable debug logs in console:</p>
        <code className="block bg-gray-900 p-1 rounded text-green-400">
          window.IsDebug = true
        </code>
        <p>Disable debug logs:</p>
        <code className="block bg-gray-900 p-1 rounded text-red-400">
          window.IsDebug = false
        </code>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-1 right-1 text-gray-400 hover:text-white"
      >
        ×
      </button>
    </div>
  );
};

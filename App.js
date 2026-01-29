import React, { useState } from 'react';
import LiveBookScanner from './LiveBookScanner';
import BookshelfScanner from './BookshelfScanner';
import { Camera, Image } from 'lucide-react';

function App() {
  const [mode, setMode] = useState('live'); // 'live' or 'upload'

  return (
    <div className="App">
      {/* Mode Switcher - Only show when not in live camera mode */}
      {mode === 'upload' && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full shadow-lg p-1 flex gap-1">
          <button
            onClick={() => setMode('live')}
            className={`px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors ${
              mode === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Camera size={18} />
            Live Scan
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors ${
              mode === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Image size={18} />
            Upload Photo
          </button>
        </div>
      )}

      {/* Live Scanner has its own switcher in the overlay */}
      {mode === 'live' && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setMode('upload')}
            className="px-6 py-2 rounded-full font-semibold flex items-center gap-2 bg-white shadow-lg hover:bg-gray-100 transition-colors"
          >
            <Image size={18} />
            Switch to Upload Mode
          </button>
        </div>
      )}

      {/* Render selected mode */}
      {mode === 'live' ? <LiveBookScanner /> : <BookshelfScanner />}
    </div>
  );
}

export default App;

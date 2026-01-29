import React, { useState, useRef, useEffect } from ‘react’;
import { Settings, X, Zap } from ‘lucide-react’;

export default function LiveBookScanner() {
const [stream, setStream] = useState(null);
const [scanning, setScanning] = useState(false);
const [result, setResult] = useState(null);
const [showSettings, setShowSettings] = useState(false);
const [autoScan, setAutoScan] = useState(false);
const [apiKeys, setApiKeys] = useState({
claude: localStorage.getItem(‘claudeKey’) || ‘’,
ebay: localStorage.getItem(‘ebayKey’) || ‘’
});

const videoRef = useRef(null);
const canvasRef = useRef(null);
const scanIntervalRef = useRef(null);
const lastScanRef = useRef(0);

useEffect(() => {
// Small delay to ensure component is mounted
const timer = setTimeout(() => {
startCamera();
}, 100);
return () => {
clearTimeout(timer);
stopCamera();
};
}, []);

useEffect(() => {
if (autoScan && stream && !scanning) {
scanIntervalRef.current = setInterval(() => {
const now = Date.now();
if (now - lastScanRef.current > 3000) { // 3 second cooldown
captureAndScan();
}
}, 3000);
} else {
if (scanIntervalRef.current) {
clearInterval(scanIntervalRef.current);
}
}

```
return () => {
  if (scanIntervalRef.current) {
    clearInterval(scanIntervalRef.current);
  }
};
```

}, [autoScan, stream, scanning]);

const saveApiKeys = () => {
localStorage.setItem(‘claudeKey’, apiKeys.claude);
localStorage.setItem(‘ebayKey’, apiKeys.ebay);
setShowSettings(false);
};

const startCamera = async () => {
try {
const mediaStream = await navigator.mediaDevices.getUserMedia({
video: {
facingMode: ‘environment’,
width: { ideal: 1920 },
height: { ideal: 1080 }
}
});
if (videoRef.current) {
videoRef.current.srcObject = mediaStream;
}
setStream(mediaStream);
} catch (err) {
console.error(‘Camera error:’, err);
alert(‘Could not access camera. Please allow camera permissions.’);
}
};

const stopCamera = () => {
if (stream) {
stream.getTracks().forEach(track => track.stop());
setStream(null);
}
};

const captureAndScan = async () => {
if (!videoRef.current || scanning) return;
if (!apiKeys.claude || !apiKeys.ebay) {
alert(‘Please set your API keys in settings first!’);
setShowSettings(true);
return;
}

```
lastScanRef.current = Date.now();
setScanning(true);

try {
  const canvas = canvasRef.current;
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoRef.current, 0, 0);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });

  // Extract title with Claude
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKeys.claude,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64
            }
          },
          {
            type: 'text',
            text: 'Extract the book title and author from this image. Return ONLY a JSON object. Format: {"title": "Book Title", "author": "Author Name"}. If no book is visible or text is unreadable, return {"title": "", "author": ""}.'
          }
        ]
      }]
    })
  });

  const claudeData = await claudeResponse.json();
  if (!claudeResponse.ok) throw new Error('Claude API error');

  let bookInfoText = claudeData.content[0].text.trim();
  bookInfoText = bookInfoText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const bookInfo = JSON.parse(bookInfoText);

  if (!bookInfo.title) {
    setResult({ noBook: true });
    setScanning(false);
    return;
  }

  // Query eBay
  const searchQuery = bookInfo.author 
    ? `${bookInfo.title} ${bookInfo.author} book`
    : `${bookInfo.title} book`;

  const ebayUrl = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${apiKeys.ebay}&RESPONSE-DATA-FORMAT=JSON&keywords=${encodeURIComponent(searchQuery)}&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&sortOrder=PricePlusShippingLowest&paginationInput.entriesPerPage=25`;
  
  const ebayResponse = await fetch(ebayUrl);
  const ebayData = await ebayResponse.json();
  const items = ebayData.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
  
  if (items.length === 0) {
    setResult({
      title: bookInfo.title,
      author: bookInfo.author,
      noData: true
    });
  } else {
    const prices = items
      .map(item => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0))
      .filter(price => price > 0)
      .sort((a, b) => a - b);
    
    const median = prices[Math.floor(prices.length / 2)];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    setResult({
      title: bookInfo.title,
      author: bookInfo.author,
      median: median.toFixed(2),
      average: avg.toFixed(2),
      min: Math.min(...prices).toFixed(2),
      max: Math.max(...prices).toFixed(2),
      soldCount: prices.length,
      timestamp: Date.now()
    });
  }
  
} catch (error) {
  console.error('Error:', error);
  setResult({ error: error.message });
} finally {
  setScanning(false);
}
```

};

const getValueColor = () => {
if (!result || result.noData || result.noBook || result.error) return ‘bg-gray-800’;
const price = parseFloat(result.median);
if (price >= 15) return ‘bg-green-600’;
if (price >= 8) return ‘bg-yellow-600’;
return ‘bg-red-600’;
};

const getValueText = () => {
if (!result || result.noData || result.noBook || result.error) return ‘’;
const price = parseFloat(result.median);
if (price >= 15) return ‘✓ BUY IT’;
if (price >= 8) return ’~ MAYBE’;
return ‘✗ SKIP’;
};

return (
<div className="fixed inset-0 bg-black">
{/* Video Feed */}
<video
ref={videoRef}
autoPlay
playsInline
muted
className="absolute inset-0 w-full h-full object-cover"
/>
<canvas ref={canvasRef} className="hidden" />

```
  {/* Top Bar */}
  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4 z-20">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${scanning ? 'bg-yellow-400 animate-pulse' : stream ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-white text-sm font-semibold">
          {scanning ? 'Scanning...' : 'Live'}
        </span>
      </div>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 bg-gray-800 bg-opacity-75 rounded-lg text-white hover:bg-opacity-100"
      >
        <Settings size={24} />
      </button>
    </div>
  </div>

  {/* Result Overlay */}
  {result && !result.noBook && (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black to-transparent p-6 z-10">
      <div className={`${getValueColor()} bg-opacity-95 rounded-2xl p-6 shadow-2xl`}>
        {result.error ? (
          <div className="text-white text-center">
            <p className="text-sm">Error: {result.error}</p>
          </div>
        ) : result.noData ? (
          <div className="text-white">
            <h3 className="text-xl font-bold mb-1">{result.title}</h3>
            {result.author && <p className="text-sm opacity-75 mb-3">{result.author}</p>}
            <p className="text-center text-lg font-semibold">No recent sales found</p>
          </div>
        ) : (
          <div className="text-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-xl font-bold leading-tight mb-1">{result.title}</h3>
                {result.author && <p className="text-sm opacity-75">{result.author}</p>}
              </div>
              <div className="text-right ml-4">
                <div className="text-4xl font-bold">${result.median}</div>
                <div className="text-xs opacity-75">median</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3 text-center text-sm">
              <div className="bg-black bg-opacity-30 rounded-lg p-2">
                <div className="font-bold">${result.average}</div>
                <div className="text-xs opacity-75">avg</div>
              </div>
              <div className="bg-black bg-opacity-30 rounded-lg p-2">
                <div className="font-bold">${result.min}-${result.max}</div>
                <div className="text-xs opacity-75">range</div>
              </div>
              <div className="bg-black bg-opacity-30 rounded-lg p-2">
                <div className="font-bold">{result.soldCount}</div>
                <div className="text-xs opacity-75">sold</div>
              </div>
            </div>

            <div className="text-center text-2xl font-bold bg-black bg-opacity-40 rounded-lg py-3">
              {getValueText()}
            </div>
          </div>
        )}
      </div>
    </div>
  )}

  {/* No Book Detected */}
  {result?.noBook && (
    <div className="absolute inset-x-0 bottom-0 p-6 z-10">
      <div className="bg-gray-800 bg-opacity-90 rounded-2xl p-4 text-white text-center">
        <p className="text-sm">Point camera at book cover or spine</p>
      </div>
    </div>
  )}

  {/* Bottom Controls */}
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 z-30" style={{ paddingBottom: result ? '280px' : '24px' }}>
    <div className="flex items-center justify-center gap-4">
      {/* Auto-Scan Toggle */}
      <button
        onClick={() => setAutoScan(!autoScan)}
        className={`px-6 py-4 rounded-full font-semibold shadow-lg flex items-center gap-2 ${
          autoScan 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-800 bg-opacity-75 text-white'
        }`}
      >
        <Zap size={20} />
        {autoScan ? 'AUTO ON' : 'AUTO OFF'}
      </button>

      {/* Manual Scan Button */}
      <button
        onClick={captureAndScan}
        disabled={scanning}
        className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center disabled:opacity-50"
      >
        <div className={`w-16 h-16 border-4 ${scanning ? 'border-yellow-400 animate-pulse' : 'border-blue-500'} rounded-full`} />
      </button>
    </div>
  </div>

  {/* Settings Panel */}
  {showSettings && (
    <div className="absolute inset-0 bg-black bg-opacity-90 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-white">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Claude API Key</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKeys.claude}
              onChange={(e) => setApiKeys({...apiKeys, claude: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">console.anthropic.com</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">eBay App ID</label>
            <input
              type="password"
              placeholder="Your eBay App ID"
              value={apiKeys.ebay}
              onChange={(e) => setApiKeys({...apiKeys, ebay: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">developer.ebay.com</p>
          </div>
          <button
            onClick={saveApiKeys}
            className="w-full bg-blue-600 py-3 rounded-lg font-semibold text-white hover:bg-blue-700"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  )}
</div>
```

);
}
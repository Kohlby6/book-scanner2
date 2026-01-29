import React, { useState } from ‘react’;
import { Upload, DollarSign, TrendingUp, Loader2 } from ‘lucide-react’;

export default function BookshelfScanner() {
const [image, setImage] = useState(null);
const [loading, setLoading] = useState(false);
const [status, setStatus] = useState(’’);
const [books, setBooks] = useState([]);
const [apiKeys, setApiKeys] = useState({
claude: ‘’,
ebay: ‘’
});

const handleImageUpload = (e) => {
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onloadend = () => {
setImage(reader.result);
};
reader.readAsDataURL(file);
}
};

const analyzeBookshelf = async () => {
if (!image) {
alert(‘Please upload an image first’);
return;
}
if (!apiKeys.claude || !apiKeys.ebay) {
alert(‘Please enter both API keys’);
return;
}

```
setLoading(true);
setStatus('Reading book titles from image...');
setBooks([]);

try {
  // Step 1: Extract titles using Claude API
  const base64Image = image.split(',')[1];
  
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKeys.claude,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: 'Look at this bookshelf image and extract ALL visible book titles. Return ONLY a JSON array of book titles as strings, nothing else. Format: ["Title 1", "Title 2", "Title 3"]. If you can see author names, include them like "Title by Author".'
          }
        ]
      }]
    })
  });

  const claudeData = await claudeResponse.json();
  
  if (!claudeResponse.ok) {
    throw new Error(claudeData.error?.message || 'Claude API error');
  }

  let titlesText = claudeData.content[0].text.trim();
  // Remove markdown code blocks if present
  titlesText = titlesText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const titles = JSON.parse(titlesText);

  setStatus(`Found ${titles.length} books. Fetching eBay prices...`);

  // Step 2: Query eBay for each title
  const bookResults = [];
  
  for (let i = 0; i < titles.length; i++) {
    setStatus(`Checking prices ${i + 1}/${titles.length}...`);
    
    try {
      // Using eBay Finding API
      const ebayUrl = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${apiKeys.ebay}&RESPONSE-DATA-FORMAT=JSON&keywords=${encodeURIComponent(titles[i] + ' book')}&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&sortOrder=PricePlusShippingLowest&paginationInput.entriesPerPage=20`;
      
      const ebayResponse = await fetch(ebayUrl);
      const ebayData = await ebayResponse.json();
      
      const items = ebayData.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
      
      if (items.length > 0) {
        const prices = items
          .map(item => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0))
          .filter(price => price > 0)
          .sort((a, b) => a - b);
        
        if (prices.length > 0) {
          const median = prices[Math.floor(prices.length / 2)];
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          
          bookResults.push({
            title: titles[i],
            median: median.toFixed(2),
            average: avg.toFixed(2),
            min: Math.min(...prices).toFixed(2),
            max: Math.max(...prices).toFixed(2),
            soldCount: prices.length
          });
        }
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error fetching eBay data for ${titles[i]}:`, err);
    }
  }

  // Sort by median price descending
  bookResults.sort((a, b) => parseFloat(b.median) - parseFloat(a.median));
  setBooks(bookResults);
  setStatus('Complete!');
  
} catch (error) {
  console.error('Error:', error);
  setStatus(`Error: ${error.message}`);
} finally {
  setLoading(false);
}
```

};

return (
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
<div className="max-w-6xl mx-auto">
<div className="text-center mb-8">
<h1 className="text-4xl font-bold text-gray-800 mb-2">📚 Bookshelf Value Scanner</h1>
<p className="text-gray-600">Upload a photo of a bookshelf to find valuable books instantly</p>
</div>

```
    {/* API Key Inputs */}
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claude API Key
          </label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKeys.claude}
            onChange={(e) => setApiKeys({...apiKeys, claude: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Get from anthropic.com/api</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            eBay App ID
          </label>
          <input
            type="password"
            placeholder="Your eBay App ID"
            value={apiKeys.ebay}
            onChange={(e) => setApiKeys({...apiKeys, ebay: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Get from developer.ebay.com</p>
        </div>
      </div>
    </div>

    {/* Upload Section */}
    <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {!image ? (
          <label className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Click to upload bookshelf image</p>
            <p className="text-sm text-gray-500">JPG, PNG up to 10MB</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        ) : (
          <div>
            <img src={image} alt="Bookshelf" className="max-h-96 mx-auto rounded-lg mb-4" />
            <button
              onClick={() => setImage(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Change Image
            </button>
          </div>
        )}
      </div>

      {image && (
        <button
          onClick={analyzeBookshelf}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {status}
            </>
          ) : (
            <>
              <TrendingUp size={20} />
              Analyze Bookshelf
            </>
          )}
        </button>
      )}
    </div>

    {/* Results */}
    {books.length > 0 && (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="text-green-600" />
          Results ({books.length} books found)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Book Title</th>
                <th className="text-right py-3 px-4">Median Price</th>
                <th className="text-right py-3 px-4">Avg Price</th>
                <th className="text-right py-3 px-4">Range</th>
                <th className="text-right py-3 px-4">Sold</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{book.title}</td>
                  <td className="text-right py-3 px-4 font-bold text-green-600">
                    ${book.median}
                  </td>
                  <td className="text-right py-3 px-4">${book.average}</td>
                  <td className="text-right py-3 px-4 text-sm text-gray-600">
                    ${book.min} - ${book.max}
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-gray-500">
                    {book.soldCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
</div>
```

);
}
import React, { useState, useEffect } from 'react';
import { Copy, Image, History, HelpCircle, AlertCircle, Check, Eye, EyeOff, List, Rows, Building2 } from 'lucide-react';

interface ConversionHistory {
  originalUrl: string;
  convertedUrl: string;
  timestamp: number;
}

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

function ImagePreview({ src, alt, className = '' }: ImagePreviewProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const processImageUrl = (url: string) => {
    if (!url) return url;

    if (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')) {
      let fileId = '';
      const patterns = [
        /\/file\/d\/([^/]+)/,
        /id=([^&]+)/,
        /\/d\/([^/]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          fileId = match[1];
          break;
        }
      }

      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
    
    return url;
  };

  const processedSrc = processImageUrl(src);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (error || !processedSrc) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(255, 255, 255) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255, 255, 255) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="absolute inset-0">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute right-12 bottom-12 w-40 h-40 bg-white/5 rounded-full transform translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-white/5 to-transparent">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-3 rounded-full bg-white/5">
              <Building2 className="w-6 h-6 text-white/40" />
            </div>
            <div className="max-w-[80%]">
              <p className="text-sm font-medium text-white/60 line-clamp-2">{alt}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`relative overflow-hidden ${className}`}>
          <div className="absolute inset-0 bg-white/5 animate-pulse">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to right, rgb(255, 255, 255) 1px, transparent 1px),
                  linear-gradient(to bottom, rgb(255, 255, 255) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
                opacity: 0.02
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
          </div>
        </div>
      )}
      <img
        src={processedSrc}
        alt={alt}
        className={`${className} ${loading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        referrerPolicy="no-referrer"
      />
    </>
  );
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<'plain' | 'markdown' | 'html'>('plain');

  const convertUrl = (url: string) => {
    const regex = /\/d\/([a-zA-Z0-9_-]+)\/view/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    throw new Error('Invalid Google Drive URL format');
  };

  const formatOutput = (urls: string[]) => {
    switch (outputFormat) {
      case 'markdown':
        return urls.map(url => `![image](${url})`).join('\n');
      case 'html':
        return urls.map(url => `<img src="${url}" alt="image" />`).join('\n');
      default:
        return urls.join('\n');
    }
  };

  const handleConvert = () => {
    try {
      setError('');
      const urls = input.split('\n').filter(url => url.trim());
      
      if (urls.length === 0) {
        setError('Please enter at least one URL');
        return;
      }

      const converted = urls.map(url => convertUrl(url.trim()));
      const result = formatOutput(converted);
      setOutput(result);
      setPreviewUrls(converted);
      setShowPreview(true);

      // Add to history
      if (converted.length > 0) {
        const newHistory: ConversionHistory = {
          originalUrl: urls.length > 1 ? `${urls[0]} (+${urls.length - 1} more)` : urls[0],
          convertedUrl: converted[0],
          timestamp: Date.now()
        };
        setHistory(prev => [newHistory, ...prev.slice(0, 9)]);
        localStorage.setItem('conversionHistory', JSON.stringify([newHistory, ...history.slice(0, 9)]));
      }
    } catch (err) {
      setError('Please enter valid Google Drive image URLs');
      setOutput('');
      setPreviewUrls([]);
      setShowPreview(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const urls = text.split(/[\n\s]+/).filter(url => url.includes('drive.google.com'));
    setInput(urls.join('\n'));
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('conversionHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Image className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Drive Image URL Converter</h1>
          <p className="text-gray-400">Convert Google Drive sharing links to direct image URLs</p>
        </header>

        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Input URLs (one per line)</label>
              <span className="text-sm text-gray-400">
                {input.split('\n').filter(url => url.trim()).length} URLs
              </span>
            </div>
            <textarea
              className="w-full bg-gray-700 rounded-lg p-4 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
            />
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Output Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOutputFormat('plain')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    outputFormat === 'plain' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Plain
                </button>
                <button
                  onClick={() => setOutputFormat('markdown')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    outputFormat === 'markdown' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Rows className="w-4 h-4" />
                  Markdown
                </button>
                <button
                  onClick={() => setOutputFormat('html')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    outputFormat === 'html' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <code className="text-sm">&lt;&gt;</code>
                  HTML
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleConvert}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 mb-6"
          >
            Convert
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {output && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Converted URLs</label>
              <div className="relative">
                <textarea
                  readOnly
                  value={output}
                  rows={Math.min(output.split('\n').length, 5)}
                  className="w-full bg-gray-700 rounded-lg p-4 pr-24 text-gray-100 resize-y"
                />
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 hover:bg-gray-600 rounded-lg"
                    title={showPreview ? "Hide preview" : "Show preview"}
                  >
                    {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-gray-600 rounded-lg"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPreview && previewUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Image Previews</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-2 relative">
                    <ImagePreview
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-contain rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">How to Use</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Open your Google Drive images and click "Share"</li>
            <li>Set access to "Anyone with the link"</li>
            <li>Copy the sharing links</li>
            <li>Paste the links in the input field above (one per line)</li>
            <li>Select your preferred output format (Plain, Markdown, or HTML)</li>
            <li>Click "Convert" to get your direct image URLs</li>
            <li>Click the eye icon to preview the images</li>
          </ol>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-lg font-semibold mb-4"
          >
            <History className="w-6 h-6 text-blue-500" />
            Recent Conversions
          </button>
          
          {showHistory && (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm truncate mb-1">{item.originalUrl}</div>
                  <div className="text-sm text-blue-400 truncate">{item.convertedUrl}</div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-gray-400 text-center py-4">No conversion history yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
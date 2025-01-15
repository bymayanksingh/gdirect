import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Image, History, HelpCircle, AlertCircle, Check, Eye, EyeOff, List, Rows, Building2, Download, FileJson, FileText } from 'lucide-react';

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
        // For image previews, use the lh3.googleusercontent.com format
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
  const [error, setError] = useState('');
  const [outputFormat, setOutputFormat] = useState<'plain' | 'markdown' | 'html'>('plain');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [copied, setCopied] = useState(false);
  const [previewContent, setPreviewContent] = useState<{
    type: 'json' | 'csv' | 'markdown' | 'html' | 'images' | null;
    content: string | string[];
  }>({ type: null, content: '' });

  const convertUrl = (url: string) => {
    const regex = /\/d\/([a-zA-Z0-9_-]+)\/view/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    throw new Error('Invalid Google Drive URL format');
  };

  const formatOutput = (urls: string[]) => {
    if (outputFormat === 'plain') {
      return urls.map(url => {
        const fileId = url.split('/').pop();
        return `Preview URL:\nhttps://lh3.googleusercontent.com/d/${fileId}\n\nDirect URL:\nhttps://drive.google.com/uc?export=view&id=${fileId}\n`;
      }).join('\n');
    } else if (outputFormat === 'markdown') {
      return urls.map(url => {
        const fileId = url.split('/').pop();
        return `Preview URL:\n![](https://lh3.googleusercontent.com/d/${fileId})\n\nDirect URL:\n![](https://drive.google.com/uc?export=view&id=${fileId})\n`;
      }).join('\n');
    } else if (outputFormat === 'html') {
      return urls.map(url => {
        const fileId = url.split('/').pop();
        return `Preview URL:\n<img src="https://lh3.googleusercontent.com/d/${fileId}" />\n\nDirect URL:\n<img src="https://drive.google.com/uc?export=view&id=${fileId}" />\n`;
      }).join('\n');
    }
    return '';
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

  const handleLoadHistory = (originalUrl: string, convertedUrl: string) => {
    setInput(originalUrl);
    setOutput(convertedUrl);
    setShowPreview(true);
    setPreviewUrls([convertedUrl]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleBulkDownload = async () => {
    if (!previewUrls.length) return;
    
    for (let i = 0; i <previewUrls.length; i++) {
      const url = previewUrls[i];
      const filename = `image-${i + 1}.${url.split('.').pop()}`;
      await downloadImage(url, filename);
    }
  };

  const handleExportUrls = (format: 'json' | 'csv') => {
    if (!previewUrls.length) return;

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify({ urls: previewUrls }, null, 2);
      mimeType = 'application/json';
      filename = 'gdirect-urls.json';
    } else {
      content = previewUrls.join('\n');
      mimeType = 'text/csv';
      filename = 'gdirect-urls.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateMarkdownGallery = () => {
    if (!previewUrls.length) return;

    const markdown = previewUrls.map((url, index) => (
      `![Image ${index + 1}](${url})`
    )).join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gdirect-gallery.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePreviewContent = (type: 'json' | 'csv' | 'markdown' | 'html') => {
    let content = '';
    
    switch (type) {
      case 'json':
        content = JSON.stringify({ urls: previewUrls }, null, 2);
        break;
      case 'csv':
        content = previewUrls.join('\n');
        break;
      case 'markdown':
        content = previewUrls.map((url, index) => (
          `![Image ${index + 1}](${url})`
        )).join('\n\n');
        break;
      case 'html':
        content = previewUrls.map((url, index) => (
          `<img src="${url}" alt="Image ${index + 1}" />`
        )).join('\n');
        break;
    }

    setPreviewContent({ type, content });
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('conversionHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <span className="text-4xl sm:text-6xl" role="img" aria-label="GDirect Logo">🔗</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 text-[#e4e4e4]">GDirect</h1>
          <p className="text-sm sm:text-base text-[#858585]">Convert Google Drive sharing links to direct image URLs</p>
        </header>

        <div className="bg-[#252526] rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl border border-[#323232]">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-[#e4e4e4]">Input URLs (one per line)</label>
              <span className="text-sm text-[#a4a4a4]">
                {input.split('\n').filter(url => url.trim()).length} URLs
              </span>
            </div>
            <textarea
              className="w-full bg-[#1e1e1e] rounded-lg p-4 text-[#d4d4d4] focus:ring-2 focus:ring-[#424242] focus:outline-none border border-[#323232] placeholder-[#6b6b6b]"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-[#e4e4e4]">Output Format</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOutputFormat('plain')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                    outputFormat === 'plain' 
                      ? 'bg-[#424242] text-white' 
                      : 'bg-[#2d2d2d] hover:bg-[#323232] border border-[#323232] text-[#d4d4d4]'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Plain
                </button>
                <button
                  onClick={() => setOutputFormat('markdown')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                    outputFormat === 'markdown'
                      ? 'bg-[#424242] text-white'
                      : 'bg-[#2d2d2d] hover:bg-[#323232] border border-[#323232] text-[#d4d4d4]'
                  }`}
                >
                  <Rows className="w-4 h-4" />
                  Markdown
                </button>
                <button
                  onClick={() => setOutputFormat('html')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                    outputFormat === 'html'
                      ? 'bg-[#424242] text-white'
                      : 'bg-[#2d2d2d] hover:bg-[#323232] border border-[#323232] text-[#d4d4d4]'
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
            className="w-full bg-[#424242] hover:bg-[#525252] text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 mb-6"
          >
            Convert
          </button>

          {error && (
            <div className="flex items-center gap-2 text-[#f48771] mb-4 bg-[#f4877120] p-3 rounded-lg border border-[#f4877140]">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {output && (
            <div className="space-y-4">
              <div className="mb-6">
                <label htmlFor="output" className="block text-sm font-medium text-gray-200 mb-2">
                  Converted URLs
                </label>
                <div className="relative">
                  <textarea
                    id="output"
                    value={output}
                    readOnly
                    className="w-full h-48 p-3 bg-[#1e1e1e] text-gray-300 border border-[#323232] rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute top-2 right-2 space-x-2">
                    <button
                      onClick={() => handleCopy()}
                      className="p-1.5 text-gray-300 hover:bg-[#323232] rounded-lg transition-colors duration-200"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBulkDownload}
                  className="flex items-center gap-2 px-3 py-2 bg-[#424242] hover:bg-[#525252] rounded-lg text-white transition-colors duration-200"
                  disabled={!previewUrls.length}
                >
                  <Download className="w-4 h-4" />
                  Download all
                </button>
                {[
                  { type: 'json', icon: FileJson, label: 'JSON' },
                  { type: 'csv', icon: FileText, label: 'CSV' },
                  { type: 'markdown', icon: FileText, label: 'Markdown' },
                  { type: 'html', icon: FileText, label: 'HTML / Image Preview' }
                ].map(({ type, icon: Icon, label }) => (
                  <div key={type} className="relative">
                    <button
                      onClick={() => handlePreviewContent(type as any)}
                      className="flex items-center gap-2 px-3 py-2 bg-[#424242] hover:bg-[#525252] rounded-lg text-white transition-colors duration-200 group"
                      disabled={!previewUrls.length}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex items-center gap-1">
                        {label}
                        <Eye className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                      </span>
                    </button>
                    {previewContent.type === type && (
                      <button
                        onClick={() => {
                          if (type === 'markdown') {
                            generateMarkdownGallery();
                          } else {
                            handleExportUrls(type as 'json' | 'csv');
                          }
                        }}
                        className="absolute -right-2 -top-2 p-1.5 bg-[#525252] hover:bg-[#626262] rounded-full"
                        title={`Download ${label}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview Section */}
              {previewContent.type && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-gray-200">
                      {previewContent.type.charAt(0).toUpperCase() + previewContent.type.slice(1)} Preview
                    </h2>
                    <button
                      onClick={() => setPreviewContent({ type: null, content: '' })}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      Close
                    </button>
                  </div>

                  {previewContent.type === 'images' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewUrls.map((url, index) => {
                        const fileId = url.split('/').pop();
                        return (
                          <div key={index} className="p-4 bg-[#1e1e1e] border border-[#323232] rounded-lg">
                            <ImagePreview
                              src={`https://lh3.googleusercontent.com/d/${fileId}`}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-48 object-contain rounded-lg"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : previewContent.type === 'html' ? (
                    <div className="space-y-4">
                      <pre className="bg-[#1e1e1e] border border-[#323232] rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
                        <code>{previewContent.content as string}</code>
                      </pre>
                      <div className="bg-[#1e1e1e] border border-[#323232] rounded-lg p-4 text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: previewContent.content as string }} />
                      </div>
                    </div>
                  ) : previewContent.type === 'markdown' ? (
                    <div className="space-y-4">
                      <pre className="bg-[#1e1e1e] border border-[#323232] rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
                        <code>{previewContent.content as string}</code>
                      </pre>
                    </div>
                  ) : (
                    <pre className="bg-[#1e1e1e] border border-[#323232] rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
                      <code>{previewContent.content as string}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#252526] rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl border border-[#323232]">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="p-1.5 rounded-lg bg-[#32323240]">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#e4e4e4]" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#e4e4e4]">How to Use</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-[#d4d4d4]">
            <li>Open your Google Drive images and click "Share"</li>
            <li>Set access to "Anyone with the link"</li>
            <li>Copy the sharing links</li>
            <li>Paste the links in the input field above (one per line)</li>
            <li>Select your preferred output format (Plain, Markdown, or HTML)</li>
            <li>Click "Convert" to get your direct image URLs</li>
            <li>Click the eye icon to preview the images</li>
          </ol>
        </div>

        <div className="bg-[#252526] rounded-xl p-4 sm:p-6 shadow-xl border border-[#323232]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#e4e4e4] hover:text-white transition-colors duration-200"
          >
            <div className="p-1.5 rounded-lg bg-[#32323240]">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-[#e4e4e4]" />
            </div>
            Recent Conversions
          </button>
          
          {showHistory && (
            <div className="space-y-3 sm:space-y-4">
              {history.map((item, index) => (
                <div key={index} className="bg-[#1e1e1e] rounded-lg p-3 sm:p-4 border border-[#323232] group">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="flex-grow min-w-0">
                      <div className="text-xs sm:text-sm text-[#858585] mb-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs sm:text-sm truncate mb-1 text-[#d4d4d4]">{item.originalUrl}</div>
                      <div className="text-xs sm:text-sm text-[#e4e4e4] truncate">{item.convertedUrl}</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadHistory(item.originalUrl, item.convertedUrl)}
                        className="p-1.5 text-gray-300 hover:bg-[#323232] rounded-lg transition-colors duration-200"
                        title="Load back to workspace"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setPreviewUrls([item.convertedUrl]);
                          setShowPreview(true);
                        }}
                        className="p-1.5 hover:bg-[#323232] rounded-lg transition-colors duration-200 text-[#e4e4e4]"
                        title="Preview image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(item.convertedUrl)}
                        className="p-1.5 hover:bg-[#323232] rounded-lg transition-colors duration-200 text-[#e4e4e4]"
                        title="Copy converted URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {showPreview && previewUrls.length === 1 && previewUrls[0] === item.convertedUrl && (
                    <div className="mt-3 bg-[#252526] rounded-lg p-2">
                      <ImagePreview
                        src={item.convertedUrl}
                        alt="Preview"
                        className="w-full h-36 object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-[#d4d4d4] text-center py-4">No conversion history yet</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
import { useState, useEffect } from "react";
import Confetti from 'react-confetti';
import {
  Copy,
  Link,
  File,
  History,
  AlertCircle,
  Check,
  RefreshCw,
  Loader
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface UploadResponse {
  success: boolean;
  s3_url: string;
}

interface UploadHistory {
  inputType: "file" | "url";
  originalInput: string;
  s3Url: string;
  metadata: {
    category: string;
    brand: string;
    version: string;
    cluster?: string;
    filename?: string;
  };
  timestamp: number;
}

function App() {
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [formData, setFormData] = useState({
    category: "general",
    brand: "default",
    version: "v1",
    cluster: "main",
    filename: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<UploadHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const baseUrl = import.meta.env.VITE_UPLOAD_API_ENDPOINT;


  const generateUUID = () => {
    setFormData((prev) => ({ ...prev, filename: uuidv4() }));
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_FILE_TYPES = [
    "text/plain",
    "text/html",
    "text/csv",
    "application/json",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/tiff",
    "image/bmp",
  ];

  const validateFormData = () => {
    if (!formData.category.trim()) throw new Error('Category is required');
    if (!formData.brand.trim()) throw new Error('Brand is required');
    if (!formData.version.trim()) throw new Error('Version is required');
    
    if (formData.category.length > 50) throw new Error('Category name too long');
    if (formData.brand.length > 50) throw new Error('Brand name too long');
    if (formData.version.length > 20) throw new Error('Version string too long');
  };
  
  const handleUpload = async () => {
    try {
      setError("");
      validateFormData();
      if (uploadType === "file" && selectedFile) {
        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
          throw new Error("File type not supported");
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
          throw new Error("File size exceeds 50MB limit");
        }
      }

      if (uploadType === "url" && urlInput) {
        try {
          new URL(urlInput);
        } catch {
          throw new Error("Invalid URL format");
        }
      }

      setLoading(true);
      const data = new FormData();
      data.append("category", formData.category);
      data.append("brand", formData.brand);
      data.append("version", formData.version);
      if (formData.cluster) data.append("cluster", formData.cluster);

      let finalFilename = formData.filename.trim() ? formData.filename : uuidv4();
      
      if (response.includes(finalFilename)) {
        finalFilename = uuidv4();
      }
      
      setFormData((prev) => ({ ...prev, filename: finalFilename }));
      data.append("filename", finalFilename);

      if (uploadType === "file" && selectedFile) {
        data.append("file", selectedFile);
      } else if (uploadType === "url" && urlInput) {
        data.append("content", urlInput);
      } else {
        throw new Error("Please provide either a file or URL");
      }

      const fetchResponse = await fetch(`${baseUrl}/upload/document`, {
        method: "POST",
        body: data,
      });

      const result: UploadResponse = await fetchResponse.json();

      if (!result.success) {
        throw new Error("Upload failed");
      }

      setResponse(result.s3_url);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);

      const newHistory: UploadHistory = {
        inputType: uploadType,
        originalInput:
          uploadType === "file" ? selectedFile?.name || "" : urlInput,
        s3Url: result.s3_url,
        metadata: {
          ...formData,
        },
        timestamp: Date.now(),
      };
      setHistory((prev) => [newHistory, ...prev.slice(0, 9)]);
      localStorage.setItem(
        "uploadHistory",
        JSON.stringify([newHistory, ...history.slice(0, 9)])
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during upload"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem("uploadHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadType("file");
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setSelectedFile(droppedFile);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("uploadHistory");
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [
      ['Timestamp', 'Type', 'Original Input', 'Category', 'Brand', 'Version', 'Cluster', 'Filename', 'S3 URL'],
      ...history.map(item => [
        escapeCSV(new Date(item.timestamp).toLocaleString()),
        escapeCSV(item.inputType),
        escapeCSV(item.originalInput || ''),
        escapeCSV(item.metadata.category),
        escapeCSV(item.metadata.brand),
        escapeCSV(item.metadata.version),
        escapeCSV(item.metadata.cluster || ''),
        escapeCSV(item.metadata.filename || item.s3Url.split('/').pop()?.split('.')[0] || ''),
        escapeCSV(item.s3Url)
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `upload_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div 
      className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-8 max-w-4xl min-h-screen">
        <header className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-[#e4e4e4]">Harbour ⚓️</h1>
          <p className="text-xs sm:text-sm text-[#858585]">Upload a document via file or URL.</p>
          <p className="text-[10px] sm:text-xs text-[#6e6e6e] mt-1 sm:mt-2">Pre-filled fields contain default values that can be modified if needed.</p>
          <p className="text-[10px] sm:text-xs text-[#6e6e6e] mt-1">
            Output URL format: <span className="font-mono text-[8px] sm:text-[10px] md:text-xs break-all">https://bucket.s3.amazonaws.com/version/cluster/category/brand/filename</span>
          </p>
        </header>

        <div className="bg-[#252526] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 shadow-xl border border-[#323232]">
          <div className="mb-3 sm:mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <button
                onClick={() => setUploadType("file")}
                className={`flex-1 p-3 sm:p-4 rounded-lg flex items-center justify-center gap-2 ${
                  uploadType === "file"
                    ? "bg-[#424242] text-white"
                    : "bg-[#2d2d2d] text-[#d4d4d4]"
                }`}
              >
                <File className="w-4 h-4 sm:w-5 sm:h-5" />
                File Upload
              </button>
              <button
                onClick={() => setUploadType("url")}
                className={`flex-1 p-3 sm:p-4 rounded-lg flex items-center justify-center gap-2 ${
                  uploadType === "url"
                    ? "bg-[#424242] text-white"
                    : "bg-[#2d2d2d] text-[#d4d4d4]"
                }`}
              >
                <Link className="w-4 h-4 sm:w-5 sm:h-5" />
                URL Upload
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className={`w-full bg-[#1e1e1e] rounded-lg p-2 sm:p-3 text-sm border border-[#323232] ${
                    formData.category === 'general' ? 'text-[#858585]' : 'text-[#d4d4d4]'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                  className={`w-full bg-[#1e1e1e] rounded-lg p-2 sm:p-3 text-sm border border-[#323232] ${
                    formData.brand === 'default' ? 'text-[#858585]' : 'text-[#d4d4d4]'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                  className={`w-full bg-[#1e1e1e] rounded-lg p-2 sm:p-3 text-sm border border-[#323232] ${
                    formData.version === 'v1' ? 'text-[#858585]' : 'text-[#d4d4d4]'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Cluster
                </label>
                <input
                  type="text"
                  value={formData.cluster}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cluster: e.target.value }))}
                  className={`w-full bg-[#1e1e1e] rounded-lg p-2 sm:p-3 text-sm border border-[#323232] ${
                    formData.cluster === 'main' ? 'text-[#858585]' : 'text-[#d4d4d4]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Filename
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.filename}
                    onChange={(e) => setFormData((prev) => ({ ...prev, filename: e.target.value }))}
                    className="flex-1 bg-[#1e1e1e] rounded-l-lg p-2 sm:p-3 text-sm text-[#d4d4d4] border border-r-0 border-[#323232]"
                  />
                  <button
                    onClick={generateUUID}
                    className="px-2 sm:px-4 bg-[#2d2d2d] hover:bg-[#323232] text-[#d4d4d4] rounded-r-lg border border-l-0 border-[#323232] flex items-center justify-center transition-colors"
                    title="Generate UUID"
                  >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* File/URL input section */}
              {uploadType === "file" ? (
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                    File *
                  </label>
                  <div className="flex">
                    <div className="flex-1 bg-[#1e1e1e] rounded-l-lg p-2 sm:p-3 text-sm text-[#d4d4d4] border border-r-0 border-[#323232] truncate">
                      {selectedFile ? selectedFile.name : "Choose a file"}
                    </div>
                    <label className="px-2 sm:px-4 bg-[#2d2d2d] hover:bg-[#323232] text-[#d4d4d4] rounded-r-lg border border-l-0 border-[#323232] flex items-center justify-center cursor-pointer transition-colors">
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        required
                      />
                      <File className="w-4 h-4 sm:w-5 sm:h-5" />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Enter URL"
                    className="w-full bg-[#1e1e1e] rounded-lg p-2 sm:p-3 text-sm border border-[#323232] text-[#d4d4d4]"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Adjust the upload button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-[#424242] hover:bg-[#525252] text-white font-medium py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded-lg transition-all duration-200 mb-3 sm:mb-4 disabled:opacity-50 relative overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader className="w-5 h-5 animate-spin" />
                <div className="flex flex-col items-start">
                  <span>Uploading...</span>
                  <span className="text-xs text-[#a0a0a0]">Hang tight while we process your document ✨</span>
                </div>
              </div>
            ) : (
              "Upload"
            )}
            {loading && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-[#6b6b6b] animate-progress"
                style={{
                  width: '100%',
                  animation: 'progress 2s ease-in-out infinite'
                }}
              />
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-[#f48771] mb-4 bg-[#f4877120] p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {response && (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-2">S3 URL</label>
                <div className="flex">
                  <input
                    type="text"
                    value={response}
                    readOnly
                    className="flex-1 bg-[#1e1e1e] rounded-l-lg p-3 text-[#d4d4d4] border border-r-0 border-[#323232]"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 bg-[#2d2d2d] hover:bg-[#323232] text-[#d4d4d4] rounded-r-lg border border-l-0 border-[#323232] flex items-center justify-center transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#252526] rounded-xl p-4 sm:p-6 shadow-xl border border-[#323232]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 h-8 sm:h-9"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-base sm:text-lg font-semibold leading-none">Upload History</span>
            </button>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center h-8 sm:h-9 px-3 bg-[#2d2d2d] hover:bg-[#323232] text-[#d4d4d4] rounded-lg text-xs sm:text-sm transition-colors border border-[#323232]"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center h-8 sm:h-9 px-3 bg-[#2d2d2d] hover:bg-[#323232] text-[#d4d4d4] rounded-lg text-xs sm:text-sm transition-colors border border-[#323232]"
                  >
                    Clear History
                  </button>
                </>
              )}
            </div>
          </div>

          {showHistory && (
            <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="bg-[#1e1e1e] rounded-lg p-2 sm:p-3 md:p-4 border border-[#323232]"
                >
                  <div className="text-xs sm:text-sm text-[#858585] mb-1 sm:mb-2">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2">Type: {item.inputType}</div>
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2 break-all">
                    Input: {item.originalInput}
                  </div>
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2">
                    Category: {item.metadata.category}
                  </div>
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2">
                    Brand: {item.metadata.brand}
                  </div>
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2">
                    Version: {item.metadata.version}
                  </div>
                  {item.metadata.cluster && (
                    <div className="text-xs sm:text-sm mb-1 sm:mb-2">
                      Cluster: {item.metadata.cluster}
                    </div>
                  )}
                  <div className="text-xs sm:text-sm mb-1 sm:mb-2">
                    Filename: {item.s3Url.split('/').pop()?.split('.')[0]}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.s3Url}
                      readOnly
                      className="flex-1 bg-[#252526] rounded p-2 sm:p-3 text-xs sm:text-sm break-all"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(item.s3Url)}
                      className="p-1.5 sm:p-2 hover:bg-[#323232] rounded-lg"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-center py-3 sm:py-4 text-sm">No upload history yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;
document.head.appendChild(styles);

export default App;

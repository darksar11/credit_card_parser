import React, { useState } from 'react';
import './styles/globals.css';
import { extractTextFromPdf, renderPdfPageToCanvas } from './utils/pdfProcessor';
import { extractTextWithOCR } from './utils/ocrEngine';
import { extractData, type ExtractedData } from './utils/patternMatcher';
import { extractAllTextFromPdf, downloadAsTextFile, downloadAsJsonFile, type ExtractedPdfContent } from './utils/pdfExtractor';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedPdfContent, setExtractedPdfContent] = useState<ExtractedPdfContent | null>(null);
  const [ocrContent, setOcrContent] = useState<{ text: string; numPages: number } | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ocrSearchQuery, setOcrSearchQuery] = useState<string>('');
  const [recentFiles, setRecentFiles] = useState<{ name: string; size: string }[]>([]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const processCreditCardPdf = async (file: File) => {
    const fileName = file.name;
    const fileSize = `${(file.size / 1024).toFixed(2)} KB`;
    
    console.log('Extracting text from PDF...');
    let extractedText = await extractTextFromPdf(file);
    
    console.log('Extracted text length:', extractedText.length);
    
    // If we didn't get much text, the PDF might be image-based, so try OCR
    if (extractedText.length < 100) {
      console.log('Text extraction yielded little content, trying OCR...');
      try {
        const canvas = await renderPdfPageToCanvas(file, 1);
        const ocrText = await extractTextWithOCR(canvas);
        extractedText = ocrText;
        console.log('OCR text length:', ocrText.length);
      } catch (ocrError) {
        console.error('OCR failed:', ocrError);
        // Continue with whatever text we have
      }
    }
    
    // Extract structured data from the text (best-effort – never hard fail)
    const data = extractData(extractedText, fileName, fileSize);
    
    console.log('Extracted data (best-effort):', data);
    
    return data;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    setCurrentFile(file);

    // Track recent files in this session
    const size = `${(file.size / 1024).toFixed(2)} KB`;
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.name !== file.name);
      return [{ name: file.name, size }, ...filtered].slice(0, 5);
    });

    try {
      const data = await processCreditCardPdf(file);
      setExtractedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing the file. Please try again.');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractPdf = async () => {
    if (!currentFile) {
      setError('Please upload a PDF file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtractedPdfContent(null);

    try {
      const content = await extractAllTextFromPdf(currentFile);
      setExtractedPdfContent(content);
    } catch (err) {
      setError('Error extracting PDF content. Please try again.');
      console.error('Extraction error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // OCR functionality handlers (uses the current uploaded file)
  const handleOcrExtract = async () => {
    if (!currentFile) {
      setError('Please upload a PDF file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrContent(null);

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdf = await (await import('pdfjs-dist')).getDocument({ data: arrayBuffer }).promise;
      let extractedText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const canvas = await renderPdfPageToCanvas(currentFile, i);
        const ocrText = await extractTextWithOCR(canvas);
        extractedText += `\n\n--- Page ${i} ---\n\n${ocrText}`;
      }

      setOcrContent({
        text: extractedText,
        numPages: pdf.numPages
      });
    } catch (err) {
      setError('Error performing OCR. Please try again.');
      console.error('OCR error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOcrText = () => {
    if (ocrContent && currentFile) {
      downloadAsTextFile(ocrContent.text, `ocr_${currentFile.name}.txt`);
    }
  };

  const handleDownloadOcrJson = () => {
    if (ocrContent && currentFile) {
      const jsonData = {
        filename: currentFile.name,
        numPages: ocrContent.numPages,
        extractedText: ocrContent.text
      };
      downloadAsJsonFile(jsonData, `ocr_${currentFile.name}.json`);
    }
  };

  const handleDownloadText = () => {
    if (extractedPdfContent && currentFile) {
      downloadAsTextFile(extractedPdfContent.text, currentFile.name);
    }
  };

  const handleDownloadJson = () => {
    if (extractedPdfContent && currentFile) {
      const jsonData = {
        filename: currentFile.name,
        numPages: extractedPdfContent.numPages,
        metadata: extractedPdfContent.metadata,
        extractedText: extractedPdfContent.text
      };
      downloadAsJsonFile(jsonData, currentFile.name);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const segments: React.ReactNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        segments.push(text.slice(lastIndex, start));
      }
      segments.push(
        <mark key={start} className="bg-yellow-400/40 text-yellow-50 px-0.5 rounded">
          {text.slice(start, end)}
        </mark>
      );
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }

    return segments;
  };

  const DataField = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-dark-border">
      <span className="text-gray-400 text-sm uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white font-medium">{value || 'N/A'}</span>
        {value && (
          <button
            onClick={() => copyToClipboard(value)}
            className="text-gray-500 hover:text-accent-cyan transition-colors"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );

  const detectedSummaryFields =
    extractedData
      ? ([
          extractedData.accountHolder && 'Account holder',
          extractedData.accountNumber && 'Account number',
          extractedData.statementDate && 'Statement date',
          extractedData.paymentDueDate && 'Payment due date',
          extractedData.newBalance && 'New balance',
          extractedData.minimumPayment && 'Minimum payment',
          extractedData.creditLimit && 'Credit limit',
          extractedData.purchaseAPR && 'Purchase APR',
          extractedData.cashAPR && 'Cash APR'
        ].filter(Boolean) as string[])
      : [];

  return (
    <div className="min-h-screen bg-dark-primary text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-cyan rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm text-gray-400 uppercase tracking-wider">Statement Intelligence</h1>
            <h2 className="text-xl font-semibold">Credit Card Parser - Client</h2>
          </div>

          {recentFiles.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 bg-dark-secondary border border-dark-border rounded-full px-3 py-1">
              <span className="uppercase tracking-wider">Recent</span>
              {recentFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => {
                    // Just show name/size in UI; re-upload required for security constraints
                    setError(`To re-open "${file.name}", please upload the file again (browser cannot access it automatically).`);
                  }}
                  className="px-2 py-0.5 rounded-full bg-dark-primary hover:border-accent-cyan border border-transparent transition-colors"
                >
                  {file.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">
                Turn any credit card statement into{' '}
                <span className="text-accent-cyan">structured, analyzable data.</span>
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Upload one or more PDF statements and extract account information, payment details,
                activity summary, credit information, and key dates into a clean, categorized view with smart
                insights.
              </p>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging
                    ? 'border-accent-cyan bg-accent-cyan/10'
                    : 'border-dark-border bg-dark-secondary hover:border-accent-cyan/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-accent-cyan/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Upload credit card statements</h3>
                    <p className="text-gray-400 text-sm">Drag and drop files here, or browse files</p>
                  </div>
                  <label className="cursor-pointer bg-accent-cyan/20 text-accent-cyan px-6 py-2 rounded-md hover:bg-accent-cyan/30 transition-colors border border-accent-cyan/50">
                    Browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileInput}
                      disabled={isProcessing}
                    />
                  </label>
                  <p className="text-xs text-gray-500">
                    Works best with credit card statements (Chase, Amex, Citi, BofA, Capital One and others)
                  </p>
                </div>
              </div>
            </div>

            {currentFile && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">PDF Text Extraction (Text Layer)</h3>
                  <span className="text-xs text-gray-500">{currentFile.name}</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Extract embedded text content from your PDF. Best for text-based PDFs with selectable text.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search in extracted text..."
                      className="flex-1 bg-dark-secondary border border-dark-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent-cyan"
                    />
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-3 py-2 text-xs bg-dark-secondary border border-dark-border rounded-md hover:border-accent-cyan text-gray-300"
                    >
                      Clear
                    </button>
                  </div>

                  <button
                    onClick={handleExtractPdf}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-accent-purple/20 text-accent-purple border border-accent-purple/50 rounded-lg hover:bg-accent-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isProcessing ? 'Extracting...' : 'Extract PDF Text'}
                  </button>
                  
                  {extractedPdfContent && (
                    <div className="bg-dark-secondary border border-dark-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-medium">Extraction Complete</p>
                          <p className="text-xs text-gray-500">
                            {extractedPdfContent.numPages} pages • {extractedPdfContent.text.length} characters
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadText}
                          className="flex-1 px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors text-sm font-medium"
                        >
                          Download as TXT
                        </button>
                        <button
                          onClick={handleDownloadJson}
                          className="flex-1 px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors text-sm font-medium"
                        >
                          Download as JSON
                        </button>
                      </div>
                      <div className="mt-3 max-h-32 overflow-y-auto bg-dark-primary rounded p-3">
                        <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                          {highlightMatches(extractedPdfContent.text.substring(0, 500), searchQuery)}
                          {extractedPdfContent.text.length > 500 && '...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentFile && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">OCR Extraction (Image-Based)</h3>
                  <span className="text-xs text-gray-500">{currentFile.name}</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Run full OCR on each page. Best for scanned/image-only PDFs where text is not selectable.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ocrSearchQuery}
                      onChange={(e) => setOcrSearchQuery(e.target.value)}
                      placeholder="Search in OCR text..."
                      className="flex-1 bg-dark-secondary border border-dark-border rounded-md px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent-cyan"
                    />
                    <button
                      onClick={() => setOcrSearchQuery('')}
                      className="px-3 py-2 text-xs bg-dark-secondary border border-dark-border rounded-md hover:border-accent-cyan text-gray-300"
                    >
                      Clear
                    </button>
                  </div>

                  <button
                    onClick={handleOcrExtract}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded-lg hover:bg-accent-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7h4M5 5v4m10-2h4m-2-2v4M4 17h16a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 00-1 1v4a1 1 0 001 1z"
                      />
                    </svg>
                    {isProcessing ? 'Running OCR...' : 'Run OCR on All Pages'}
                  </button>

                  {ocrContent && (
                    <div className="bg-dark-secondary border border-dark-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-medium">OCR Complete</p>
                          <p className="text-xs text-gray-500">
                            {ocrContent.numPages} pages • {ocrContent.text.length} characters
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadOcrText}
                          className="flex-1 px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors text-sm font-medium"
                        >
                          Download OCR as TXT
                        </button>
                        <button
                          onClick={handleDownloadOcrJson}
                          className="flex-1 px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors text-sm font-medium"
                        >
                          Download OCR as JSON
                        </button>
                      </div>
                      <div className="mt-3 max-h-32 overflow-y-auto bg-dark-primary rounded p-3">
                        <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                          {highlightMatches(ocrContent.text.substring(0, 500), ocrSearchQuery)}
                          {ocrContent.text.length > 500 && '...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {extractedData && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">Statements</h3>
                  <span className="text-xs text-gray-500">1 in this session</span>
                </div>
                <div className="bg-dark-secondary border border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{extractedData?.fileName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{extractedData?.fileSize || 'N/A'}</p>
                      <p className="text-xs text-accent-cyan mt-1">
                        New Balance: ${extractedData?.newBalance || '0.00'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Period: {extractedData?.statementPeriod || 'N/A'}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-dark-primary border border-dark-border rounded text-sm hover:border-accent-cyan transition-colors">
                      Sample
                    </button>
                  </div>
                </div>
              </div>
            )}

            {extractedData && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Smart Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Payment-to-Balance Ratio</p>
                    <p className="text-2xl font-bold text-yellow-400">1.8%</p>
                  </div>
                  <div className="bg-gradient-to-br from-accent-cyan/20 to-blue-600/10 border border-accent-cyan/30 rounded-lg p-4">
                    <p className="text-xs text-accent-cyan uppercase tracking-wider mb-1">Credit Utilization</p>
                    <p className="text-2xl font-bold text-accent-cyan">11.6%</p>
                  </div>
                </div>
              </div>
            )}

            {extractedData && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Export</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-dark-secondary border border-dark-border rounded text-sm hover:border-accent-cyan transition-colors">
                    JSON
                  </button>
                  <button className="px-4 py-2 bg-dark-secondary border border-dark-border rounded text-sm hover:border-accent-cyan transition-colors">
                    CSV
                  </button>
                  <button className="px-4 py-2 bg-dark-secondary border border-dark-border rounded text-sm hover:border-accent-cyan transition-colors">
                    Print view
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentFile && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">File Overview</h3>
                <div className="space-y-1">
                  <DataField label="File name" value={currentFile.name} />
                  <DataField label="File size" value={`${(currentFile.size / 1024).toFixed(2)} KB`} />
                  <DataField
                    label="Pages detected"
                    value={
                      extractedPdfContent?.numPages
                        ? String(extractedPdfContent.numPages)
                        : ocrContent?.numPages
                        ? String(ocrContent.numPages)
                        : 'Run extraction to detect'
                    }
                  />
                </div>
              </div>
            )}

            {extractedData && (
              <>
                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Quick Stats</h3>
                  <div className="space-y-1">
                    <DataField label="Latest file" value={extractedData.fileName} />
                    <DataField label="Issuer (detected)" value={extractedData.issuer || 'Unknown'} />
                    <DataField label="New Balance" value={extractedData.newBalance ? `$${extractedData.newBalance}` : undefined} />
                  </div>
                  {detectedSummaryFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detectedSummaryFields.map((label) => (
                        <span
                          key={label}
                          className="text-[11px] uppercase tracking-wide bg-dark-secondary border border-dark-border rounded-full px-3 py-1 text-gray-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-4">
                    Parsing is best-effort and works even on unusual formats. If some fields are empty, you can still use the raw text from the left side.
                  </p>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Parsing Quality</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    We look for key fields like account holder, account number, and balances. When a statement uses an
                    uncommon layout, some fields may be missing but the raw text and OCR exports still contain all content.
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-dark-secondary border border-dark-border rounded-lg p-3">
                      <p className="text-gray-400 mb-1">Core fields</p>
                      <p className="text-lg font-semibold text-accent-cyan">
                        {[extractedData.accountHolder, extractedData.accountNumber, extractedData.newBalance].filter(Boolean).length}/3
                      </p>
                    </div>
                    <div className="bg-dark-secondary border border-dark-border rounded-lg p-3">
                      <p className="text-gray-400 mb-1">Activity</p>
                      <p className="text-lg font-semibold text-accent-purple">
                        {[
                          extractedData.purchases,
                          extractedData.paymentsCredits,
                          extractedData.interestCharged
                        ].filter(Boolean).length}
                      </p>
                    </div>
                    <div className="bg-dark-secondary border border-dark-border rounded-lg p-3">
                      <p className="text-gray-400 mb-1">Limits & APR</p>
                      <p className="text-lg font-semibold text-yellow-400">
                        {[extractedData.creditLimit, extractedData.purchaseAPR, extractedData.cashAPR].filter(Boolean).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Account Information</h3>
                  <div className="space-y-1">
                    <DataField label="Account Holder" value={extractedData.accountHolder} />
                    <DataField label="Account Number" value={extractedData.accountNumber} />
                    <DataField label="Address" value={extractedData.address} />
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Payment Details</h3>
                  <div className="space-y-1">
                    <DataField label="Payment Due Date" value={extractedData.paymentDueDate} />
                    <DataField label="New Balance" value={`$${extractedData.newBalance}`} />
                    <DataField label="Minimum Payment" value={`$${extractedData.minimumPayment}`} />
                    <DataField label="Previous Balance" value={`$${extractedData.previousBalance}`} />
                    <DataField label="Past Due" value={extractedData.pastDue} />
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Activity Summary</h3>
                  <div className="space-y-1">
                    <DataField label="Purchases" value={`$${extractedData.purchases}`} />
                    <DataField label="Cash Advances" value={extractedData.cashAdvances} />
                    <DataField label="Balance Transfers" value={extractedData.balanceTransfers} />
                    <DataField label="Fees Charged" value={extractedData.feesCharged} />
                    <DataField label="Payments Credits" value={extractedData.paymentsCredits} />
                    <DataField label="Interest Charged" value={extractedData.interestCharged} />
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Credit Information</h3>
                  <div className="space-y-1">
                    <DataField label="Credit Limit" value={extractedData.creditLimit} />
                    <DataField label="Available Credit" value={extractedData.availableCredit} />
                    <DataField label="Cash Limit" value={extractedData.cashLimit} />
                    <DataField label="Available Cash" value={extractedData.availableCash} />
                    <DataField label="Purchase APR" value={extractedData.purchaseAPR} />
                    <DataField label="Cash APR" value={extractedData.cashAPR} />
                    <DataField label="Purchase Periodic Rate" value={extractedData.purchasePeriodicRate} />
                    <DataField label="Cash Periodic Rate" value={extractedData.cashPeriodicRate} />
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Statement Period</h3>
                  <div className="space-y-1">
                    <DataField label="Statement Date" value={extractedData.statementDate} />
                    <DataField label="Opening/Closing Date" value={extractedData.closingDate} />
                  </div>
                </div>
              </>
            )}

            {isProcessing && (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-cyan"></div>
                  <p className="text-gray-400">Processing your statement...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

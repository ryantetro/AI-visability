'use client';

import { useState } from 'react';

interface FileViewerProps {
  filename: string;
  content: string;
  description: string;
}

export function FileViewer({ filename, content, description }: FileViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="aiso-card-soft overflow-hidden">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border-default)' }}>
        <div>
          <h4 className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {filename}
          </h4>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="aiso-button aiso-button-secondary px-4 py-2 text-xs"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="aiso-button aiso-button-primary px-4 py-2 text-xs"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="aiso-code-surface max-h-96 overflow-auto p-5 text-sm leading-relaxed whitespace-pre-wrap">
        <code>{content}</code>
      </pre>
    </div>
  );
}

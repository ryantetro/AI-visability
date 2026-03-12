'use client';

import { useState } from 'react';
import { isValidUrl } from '@/lib/url-utils';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  variant?: 'default' | 'elevated';
}

export function UrlInput({ onSubmit, loading, variant = 'default' }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL (e.g., example.com)');
      return;
    }
    setError('');
    onSubmit(url);
  };

  if (variant === 'elevated') {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="flex flex-col gap-3">
          <div
            className="aiso-card-soft flex items-center gap-2 p-1.5"
            style={{
              borderRadius: '1.25rem',
            }}
          >
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="yourbusiness.com"
              className="aiso-input flex-1 border-0 bg-transparent px-4 py-3 text-base outline-none"
              style={{ boxShadow: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="aiso-button aiso-button-primary whitespace-nowrap px-6 py-3 text-sm"
            >
              {loading ? 'Scanning...' : 'Check My AI Score'}
            </button>
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Enter your website URL"
            className="aiso-input flex-1 px-4 py-3 text-base outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="aiso-button aiso-button-primary px-6 py-3"
          >
            {loading ? 'Scanning...' : 'Check My AI Score'}
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
      </div>
    </form>
  );
}

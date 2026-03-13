'use client';

import { useState, useMemo } from 'react';
import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidUrl, getDomain, ensureProtocol, getFaviconUrl } from '@/lib/url-utils';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  variant?: 'default' | 'elevated' | 'minimal';
  placeholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  showGlobeIcon?: boolean;
}

export function UrlInput({
  onSubmit,
  loading,
  variant = 'default',
  placeholder,
  submitLabel = 'Check My AI Score',
  loadingLabel = 'Scanning...',
  showGlobeIcon = false,
}: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const faviconUrl = useMemo(() => {
    if (!url.trim()) return null;
    try {
      const domain = getDomain(ensureProtocol(url));
      return domain.includes('.') ? getFaviconUrl(domain, 32) : null;
    } catch {
      return null;
    }
  }, [url]);

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

  if (variant === 'elevated' || variant === 'minimal') {
    const isMinimal = variant === 'minimal';
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'flex min-h-[60px] items-center gap-3 rounded-xl border',
              isMinimal
                ? 'border-white/20 bg-[#1A1A1A] px-5 py-4'
                : 'aiso-card-soft p-1.5 px-4 py-3'
            )}
            style={!isMinimal ? { borderRadius: '1.25rem' } : undefined}
          >
            {showGlobeIcon && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <Globe2 className="h-4 w-4 text-[var(--text-muted)]" />
                )}
              </span>
            )}
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder={placeholder ?? 'yourbusiness.com'}
              className={cn(
                'flex-1 border-0 bg-transparent outline-none placeholder:text-[var(--text-muted)]',
                isMinimal ? 'py-2 text-[13px] text-white' : 'aiso-input px-3 py-3 text-base'
              )}
              style={{ boxShadow: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'whitespace-nowrap rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors',
                isMinimal
                  ? 'px-4 py-2.5 bg-[#E6E6E6] text-zinc-800 hover:bg-zinc-200 disabled:opacity-50'
                  : 'aiso-button aiso-button-primary px-6 py-3 text-sm'
              )}
            >
              {loading ? loadingLabel : submitLabel}
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

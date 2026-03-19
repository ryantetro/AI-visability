'use client';

import { useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidUrl, getDomain, ensureProtocol, getFaviconUrl } from '@/lib/url-utils';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  variant?: 'default' | 'elevated' | 'minimal';
  className?: string;
  placeholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  showGlobeIcon?: boolean;
  initialValue?: string;
  autoFocus?: boolean;
}

export function UrlInput({
  onSubmit,
  loading,
  variant = 'default',
  className,
  placeholder,
  submitLabel = 'Check My AI Score',
  loadingLabel = 'Scanning...',
  showGlobeIcon = false,
  initialValue,
  autoFocus = false,
}: UrlInputProps) {
  const [url, setUrl] = useState(initialValue ?? '');
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

  if (variant === 'minimal') {
    return (
      <form onSubmit={handleSubmit} className={cn('w-full max-w-xl', className)}>
        <div className="flex flex-col gap-3">
          <div className="flex min-h-[60px] items-center gap-3 rounded-xl border border-white/10 bg-[#1A1A1A] px-5 py-4 transition-colors focus-within:border-white/20">
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
              autoFocus={autoFocus}
              className="flex-1 border-0 bg-transparent py-2 text-[13px] text-white outline-none focus:outline-none focus:ring-0 placeholder:text-[var(--text-muted)]"
              style={{ boxShadow: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap rounded-lg bg-[#E6E6E6] px-4 py-2.5 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? loadingLabel : submitLabel}
            </button>
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        </div>
      </form>
    );
  }

  if (variant === 'elevated') {
    return (
      <form onSubmit={handleSubmit} className={cn('w-full max-w-xl', className)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder={placeholder ?? 'yourbusiness.com'}
              autoFocus={autoFocus}
              className="aiso-input min-h-[60px] flex-1 px-5 py-4 text-base"
              style={{ boxShadow: 'none' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="aiso-button aiso-button-primary min-h-[54px] shrink-0 px-6 py-3 text-sm"
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
    <form onSubmit={handleSubmit} className={cn('w-full max-w-lg', className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Enter your website URL"
            autoFocus={autoFocus}
            className="aiso-input flex-1 px-4 py-3 text-base outline-none focus:outline-none"
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

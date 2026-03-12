'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ShareButtonsProps {
  scanId: string;
  score: number;
  bandLabel: string;
  domain: string;
  compact?: boolean;
  className?: string;
}

export function ShareButtons({ scanId, score, bandLabel, domain, compact = false, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/score/${scanId}`;
  const shareText = `${domain} scored ${score}/100 on AISO (${bandLabel}).`;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-center', compact ? 'gap-2' : 'gap-3', className)}>
      <button
        onClick={() =>
          openShareWindow(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
          )
        }
        className={cn('aiso-button aiso-button-secondary', compact ? 'px-3 py-2 text-xs' : 'px-5 py-2.5 text-sm')}
      >
        Share on X
      </button>
      <button
        onClick={() =>
          openShareWindow(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
          )
        }
        className={cn('aiso-button aiso-button-secondary', compact ? 'px-3 py-2 text-xs' : 'px-5 py-2.5 text-sm')}
      >
        Share on LinkedIn
      </button>
      <button
        onClick={handleCopy}
        className={cn('aiso-button aiso-button-primary', compact ? 'px-3 py-2 text-xs' : 'px-5 py-2.5 text-sm')}
      >
        {copied ? 'Copied Link' : 'Copy Share Link'}
      </button>
    </div>
  );
}

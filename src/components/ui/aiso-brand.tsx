import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

type AisoLogoProps = {
  className?: string;
  strokeWidth?: number;
};

export function AisoLogo({ className, strokeWidth = 2.5 }: AisoLogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
      <path d="M16 3 A13 13 0 0 1 27.3 18.5" fill="none" stroke="#356df4" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M27.3 18.5 A13 13 0 0 1 4.7 18.5" fill="none" stroke="#25c972" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M4.7 18.5 A13 13 0 0 1 16 3" fill="none" stroke="#16b7ca" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

type AisoBrandProps = {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  textStyle?: CSSProperties;
  label?: string;
  wordmarkVariant?: 'dark' | 'light';
  wordmarkScale?: number;
};

export function AisoBrand({
  className,
  logoClassName,
  textClassName,
  textStyle,
  label = 'airadr',
  wordmarkVariant = 'dark',
  wordmarkScale = 1.32,
}: AisoBrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <AisoLogo className={cn('h-7 w-7', logoClassName)} />
      <span
        className={cn('inline-flex items-center text-[15px] leading-none', textClassName)}
        style={textStyle}
      >
        <Image
          src={wordmarkVariant === 'light' ? '/airadr-wordmark-light.svg' : '/airadr-wordmark-dark.svg'}
          alt={label}
          width={190}
          height={48}
          className="block h-[1.05em] w-auto max-w-none"
          loading="eager"
          style={{ transform: `scale(${wordmarkScale})`, transformOrigin: 'left center' }}
        />
      </span>
    </span>
  );
}

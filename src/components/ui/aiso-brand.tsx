import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

type AisoLogoProps = {
  className?: string;
  strokeWidth?: number;
};

export function AisoLogo({ className, strokeWidth = 2.5 }: AisoLogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
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
};

export function AisoBrand({
  className,
  logoClassName,
  textClassName,
  textStyle,
  label = 'AISO',
}: AisoBrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <AisoLogo className={cn('h-7 w-7', logoClassName)} />
      <span className={cn('text-[15px] font-semibold tracking-tight text-white', textClassName)} style={textStyle}>
        {label}
      </span>
    </span>
  );
}

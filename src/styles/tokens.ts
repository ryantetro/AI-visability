/**
 * AISO Brand Design Tokens
 *
 * Visual direction: Trustworthy & Professional
 * Primary color: Emerald Green
 * Border radius: Slightly rounded (8px)
 * Typography: Geist Sans / Geist Mono
 *
 * Usage: These tokens are mapped to CSS custom properties in globals.css
 * and referenced throughout the app. Update here to change the brand.
 */

// ─── Color Palette ───────────────────────────────────────────────

export const colors = {
  // Primary — Emerald Green
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main brand color
    600: '#059669', // Buttons, links
    700: '#047857', // Hover states
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },

  // Neutral — Warm gray (not pure gray — feels more approachable)
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    150: '#eeeeec',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },

  // Accent — Teal (secondary actions, highlights)
  accent: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
  },

  // Score Band Colors — designed to feel branded, not generic traffic-light
  band: {
    aiReady: '#059669',      // Emerald 600 — matches brand
    needsWork: '#d97706',    // Amber 600 — warm caution
    atRisk: '#ea580c',       // Orange 600 — urgent
    notVisible: '#dc2626',   // Red 600 — critical
  },

  // Band backgrounds (subtle, for cards)
  bandBg: {
    aiReady: '#ecfdf5',
    needsWork: '#fffbeb',
    atRisk: '#fff7ed',
    notVisible: '#fef2f2',
  },

  // Semantic
  semantic: {
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0d9488',
  },

  // Check verdict colors
  verdict: {
    pass: '#059669',
    fail: '#dc2626',
    unknown: '#a8a29e',
  },

  // Surface colors (light mode)
  surface: {
    page: '#fafaf9',
    card: '#ffffff',
    cardHover: '#f5f5f4',
    elevated: '#ffffff',
    overlay: 'rgba(12, 10, 9, 0.5)',
  },

  // Surface colors (dark mode)
  surfaceDark: {
    page: '#0c0a09',
    card: '#1c1917',
    cardHover: '#292524',
    elevated: '#292524',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-geist-mono), "SF Mono", "Fira Code", monospace',
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px — captions, labels
    sm: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px — body small, metadata
    base: ['1rem', { lineHeight: '1.5rem' }],      // 16px — body text
    lg: ['1.125rem', { lineHeight: '1.75rem' }],   // 18px — lead text
    xl: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px — section headers
    '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px — page subheadings
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px — page headings
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px — hero text
    '5xl': ['3rem', { lineHeight: '1.15' }],       // 48px — landing hero
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  letterSpacing: {
    tight: '-0.025em',   // Headings
    normal: '0em',       // Body
    wide: '0.025em',     // Labels, badges
  },
} as const;

// ─── Spacing & Layout ────────────────────────────────────────────

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

export const layout = {
  maxWidth: {
    content: '768px',    // Main content (scan page, report)
    wide: '1024px',      // Dashboard, wider layouts
    full: '1280px',      // Max site width
  },
  headerHeight: '56px',
  footerHeight: '56px',
} as const;

// ─── Component Tokens ────────────────────────────────────────────

export const components = {
  borderRadius: {
    sm: '4px',
    md: '8px',      // Default — cards, buttons, inputs
    lg: '12px',     // Prominent cards, modals
    xl: '16px',     // Feature cards
    full: '9999px', // Badges, pills
  },

  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },

  border: {
    width: '1px',
    color: {
      light: '#e7e5e4',   // neutral-200
      dark: '#44403c',    // neutral-700
    },
  },

  // Button variants
  button: {
    primary: {
      bg: '#059669',
      bgHover: '#047857',
      text: '#ffffff',
    },
    secondary: {
      bg: '#f5f5f4',
      bgHover: '#e7e5e4',
      text: '#1c1917',
    },
    ghost: {
      bg: 'transparent',
      bgHover: '#f5f5f4',
      text: '#57534e',
    },
  },

  // Input styles
  input: {
    bg: '#ffffff',
    bgDark: '#1c1917',
    border: '#d6d3d1',
    borderDark: '#44403c',
    borderFocus: '#059669',
    ring: 'rgba(5, 150, 105, 0.2)',
    placeholder: '#a8a29e',
  },
} as const;

// ─── Motion ──────────────────────────────────────────────────────

export const motion = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    scoring: '1500ms', // Score ring animation
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ─── Brand Voice ─────────────────────────────────────────────────

export const brand = {
  name: 'AISO',
  tagline: 'AI Search Optimization',
  descriptor: 'Make your business visible to AI',

  // Tone guidelines (for reference, not runtime)
  voice: {
    tone: 'Confident, helpful, direct — not salesy or alarmist',
    do: [
      'Use active verbs: "Fix", "Improve", "Check"',
      'Be specific: "12 issues found" not "multiple issues"',
      'Frame positively: "Here\'s how to improve" not "You\'re failing"',
      'Use numbers: "Score: 54/100" not "Below average"',
    ],
    dont: [
      'Don\'t use fear: "Your site is INVISIBLE" — say "Not yet visible"',
      'Don\'t oversell: "guaranteed" or "instant results"',
      'Don\'t use jargon without context: "JSON-LD" → "structured data (JSON-LD)"',
      'Don\'t use emojis in product UI (ok in marketing)',
    ],
  },

  // CTA labels
  cta: {
    scan: 'Check My AI Score',
    email: 'Show Me What To Fix',
    purchase: 'Fix Everything',
    rescan: 'Re-Audit My Site',
    download: 'Download Files',
  },
} as const;

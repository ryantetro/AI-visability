/**
 * AISO Brand Design Tokens
 *
 * Visual direction: Dark command center
 * Primary color: Electric cobalt
 * Border radius: Soft geometric
 * Typography: Space Grotesk / Manrope / IBM Plex Mono
 *
 * Usage: These tokens are mapped to CSS custom properties in globals.css
 * and referenced throughout the app. Update here to change the brand.
 */

// ─── Color Palette ───────────────────────────────────────────────

export const colors = {
  // Primary — Cobalt / electric blue
  primary: {
    50: '#edf4ff',
    100: '#dbe9ff',
    200: '#bfd6ff',
    300: '#93baff',
    400: '#5f93ff',
    500: '#356df4',
    600: '#2455dc',
    700: '#1f44b8',
    800: '#1f3b93',
    900: '#1d3376',
    950: '#09132d',
  },

  // Ink neutrals
  neutral: {
    50: '#f5f7ff',
    100: '#e8ecfa',
    150: '#dbe1f4',
    200: '#c9d0e6',
    300: '#aab4d0',
    400: '#7b89ab',
    500: '#57637e',
    600: '#3d4660',
    700: '#2b3348',
    800: '#192033',
    900: '#101726',
    950: '#070b14',
  },

  // Accent — cyan / teal
  accent: {
    50: '#edffff',
    100: '#cefefe',
    200: '#9afcfb',
    300: '#65f3f7',
    400: '#33dbe7',
    500: '#16b7ca',
    600: '#1291a5',
    700: '#137585',
  },

  // Score Band Colors — designed to feel branded, not generic traffic-light
  band: {
    aiReady: '#25c972',
    needsWork: '#ff8a1e',
    atRisk: '#ff7424',
    notVisible: '#ff5252',
  },

  // Band backgrounds (subtle, for cards)
  bandBg: {
    aiReady: 'rgba(37, 201, 114, 0.14)',
    needsWork: 'rgba(255, 138, 30, 0.14)',
    atRisk: 'rgba(255, 116, 36, 0.14)',
    notVisible: 'rgba(255, 82, 82, 0.14)',
  },

  // Semantic
  semantic: {
    success: '#25c972',
    warning: '#ff8a1e',
    error: '#ff5252',
    info: '#0d9488',
  },

  // Check verdict colors
  verdict: {
    pass: '#25c972',
    fail: '#ff5252',
    unknown: '#a8a29e',
  },

  surface: {
    page: '#070b14',
    card: 'rgba(12, 20, 36, 0.78)',
    cardHover: 'rgba(18, 28, 48, 0.92)',
    elevated: 'rgba(20, 31, 54, 0.94)',
    overlay: 'rgba(7, 11, 20, 0.72)',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    display: 'var(--font-display), "Avenir Next", sans-serif',
    sans: 'var(--font-body), "Segoe UI", sans-serif',
    mono: 'var(--font-mono), "SF Mono", "Fira Code", monospace',
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
      bg: '#2455dc',
      bgHover: '#1f44b8',
      text: '#ffffff',
    },
    secondary: {
      bg: 'rgba(18, 28, 48, 0.92)',
      bgHover: 'rgba(28, 42, 72, 0.98)',
      text: '#f5f7ff',
    },
    ghost: {
      bg: 'transparent',
      bgHover: 'rgba(255, 255, 255, 0.06)',
      text: '#c9d0e6',
    },
  },

  // Input styles
  input: {
    bg: 'rgba(12, 20, 36, 0.86)',
    bgDark: 'rgba(12, 20, 36, 0.86)',
    border: 'rgba(131, 160, 255, 0.22)',
    borderDark: 'rgba(131, 160, 255, 0.22)',
    borderFocus: '#356df4',
    ring: 'rgba(53, 109, 244, 0.24)',
    placeholder: '#7b89ab',
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

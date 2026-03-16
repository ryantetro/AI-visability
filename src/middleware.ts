import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'aiso_auth_session';

// ── AI Bot Detection ─────────────────────────────────────────────

const AI_BOTS: Record<string, { company: string; category: 'indexing' | 'citation' | 'training' | 'unknown' }> = {
  'GPTBot': { company: 'OpenAI', category: 'indexing' },
  'ChatGPT-User': { company: 'OpenAI', category: 'indexing' },
  'PerplexityBot': { company: 'Perplexity', category: 'citation' },
  'ClaudeBot': { company: 'Anthropic', category: 'indexing' },
  'Claude-Web': { company: 'Anthropic', category: 'indexing' },
  'anthropic-ai': { company: 'Anthropic', category: 'training' },
  'CCBot': { company: 'Common Crawl', category: 'training' },
  'cohere-ai': { company: 'Cohere', category: 'training' },
  'Google-Extended': { company: 'Google', category: 'training' },
};

function detectAiBot(userAgent: string): { botName: string; category: 'indexing' | 'citation' | 'training' | 'unknown' } | null {
  for (const [botName, info] of Object.entries(AI_BOTS)) {
    if (userAgent.includes(botName)) {
      return { botName, category: info.category };
    }
  }
  return null;
}

async function logBotVisit(domain: string, botName: string, category: string, pagePath: string, userAgent: string) {
  // Fire-and-forget POST to internal API to avoid importing service layer in edge middleware
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    await fetch(`${baseUrl}/api/crawler-visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.MONITORING_SECRET || '',
      },
      body: JSON.stringify({ domain, botName, botCategory: category, pagePath, userAgent }),
    });
  } catch {
    // Non-critical — don't break the request
  }
}

/** Routes that don't require authentication. */
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/terms',
  '/privacy',
  '/landing/b',
  '/landing/c',
]);

/** Prefix patterns that are always public. */
const PUBLIC_PREFIXES = [
  '/api/auth/',           // auth endpoints must be reachable before login
  '/api/scan',            // scan creation/polling is public (auth checked in route handlers)
  '/api/crawler-visits',  // internal bot logging endpoint (uses x-internal-secret)
  '/score/',              // public score pages
  '/certified/',          // public certified badge pages
  '/_next/',              // Next.js internals
  '/favicon',
];

let jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array | null {
  if (jwtSecret) return jwtSecret;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  jwtSecret = new TextEncoder().encode(secret);
  return jwtSecret;
}

async function isTokenValid(token: string): Promise<boolean> {
  const secret = getJwtSecret();
  if (!secret) {
    // If no JWT secret configured, fall back to cookie-presence check
    return true;
  }
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detect AI bot visits (fire-and-forget, non-blocking)
  const userAgent = request.headers.get('user-agent') || '';
  const bot = detectAiBot(userAgent);
  if (bot) {
    const host = request.headers.get('host') || request.nextUrl.hostname;
    const domain = host.replace(/^www\./, '').split(':')[0];
    // Don't await — fire and forget
    logBotVisit(domain, bot.botName, bot.category, pathname, userAgent);
  }

  // Allow public paths
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Allow public prefixes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return handleUnauthenticated(request, pathname);
  }

  // Validate the JWT
  const valid = await isTokenValid(token);
  if (!valid) {
    // Expired or invalid token — clear the stale cookie and redirect/401
    const response = handleUnauthenticated(request, pathname);
    response.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};

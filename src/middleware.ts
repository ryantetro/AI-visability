import { NextRequest, NextResponse } from 'next/server';
import { maybeRefreshSessionInMiddleware } from '@/lib/auth';

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
  const secret = process.env.MONITORING_SECRET;
  if (!secret) return; // No secret configured — skip bot logging silently
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    await fetch(`${baseUrl}/api/crawler-visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
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
  '/pricing',
  '/terms',
  '/privacy',
  '/landing/b',
  '/landing/c',
]);

/** Prefix patterns that are always public. */
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/auth/',           // auth endpoints must be reachable before login
  '/api/scan',            // scan creation/polling is public (auth checked in route handlers)
  '/api/track',           // public customer-installed bot tracking endpoint (site-key auth)
  '/api/crawler-visits',  // internal bot logging endpoint (uses x-internal-secret)
  '/api/cron/',           // cron endpoints (use MONITORING_SECRET bearer token)
  '/api/webhooks/',       // Stripe webhooks (verified via signature, not session)
  '/score/',              // public score pages
  '/certified/',          // public certified badge pages
  '/_next/',              // Next.js internals
  '/favicon',
];

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
  if (/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff2?|map|txt|xml|json|webmanifest)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  try {
    const auth = await maybeRefreshSessionInMiddleware(request, response);
    if (!auth.user) {
      // Only redirect on definitive auth failures (no_session)
      // On transient errors (refresh_failed from network issues), let request through
      // — route handlers have their own auth checks as a second layer
      if (auth.reason === 'no_session') {
        const unauthenticated = handleUnauthenticated(request, pathname);
        for (const cookie of response.cookies.getAll()) {
          unauthenticated.cookies.set(cookie);
        }
        return unauthenticated;
      }
      // refresh_failed but has cookies — let through, route handlers will re-check
    }
  } catch {
    // On exception (Supabase unreachable, etc.), let request through
    // Route handlers have their own auth checks as a second layer
  }

  return response;
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

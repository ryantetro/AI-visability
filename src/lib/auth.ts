import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser } from '@/types/auth';
import {
  createMiddlewareSupabaseClient,
  createRouteHandlerSupabaseClient,
  getSupabaseClient,
} from '@/lib/supabase';

export const AUTH_COOKIE_NAME = 'aiso_auth_session';
export const REFRESH_COOKIE_NAME = 'aiso_refresh_token';
const ACCESS_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const PASSWORD_MIN_LENGTH = 8;
const ACCESS_TOKEN_CACHE_TTL_MS = 15_000;

export type AuthFailureReason = 'no_session' | 'token_invalid' | 'refresh_failed' | 'signed_out';
type AuthCallbackType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

export interface AuthSessionState {
  user: AuthUser | null;
  reason?: AuthFailureReason;
  session: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string | null;
  } | null;
}

interface RefreshedAuthSession {
  user: AuthUser;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string | null;
  };
  rawSession: unknown;
}

const accessTokenUserCache = new Map<string, { user: AuthUser | null; cachedAt: number }>();
const accessTokenUserInflight = new Map<string, Promise<AuthUser | null>>();
const refreshSessionInflight = new Map<string, Promise<RefreshedAuthSession | null>>();

export class AuthActionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthActionError';
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function buildNameFromEmail(email: string) {
  const local = normalizeEmail(email).split('@')[0] || 'user';
  return local
    .split(/[._+-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function secureCookies() {
  return process.env.NODE_ENV === 'production';
}

function expiresAtIso(expiresAt?: number | null) {
  if (!expiresAt) return null;
  return new Date(expiresAt * 1000).toISOString();
}

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const metadataName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : '';
  if (metadataName) return metadataName;
  return buildNameFromEmail(user?.email ?? '');
}

function toAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): AuthUser | null {
  if (!user) return null;
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name: getDisplayName(user),
    provider: 'email',
  };
}

function getAppUrl(preferredUrl?: string | null) {
  const value = preferredUrl?.trim()
    || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return value.replace(/\/$/, '');
}

function isSupportedCallbackType(value: string | null | undefined): value is AuthCallbackType {
  return value === 'signup'
    || value === 'invite'
    || value === 'magiclink'
    || value === 'recovery'
    || value === 'email_change'
    || value === 'email';
}

function buildAuthCallbackUrl(next?: string | null, scanUrl?: string | null, appUrl?: string | null) {
  const url = new URL('/auth/callback', getAppUrl(appUrl));
  url.searchParams.set('next', sanitizeRedirectPath(next, '/dashboard'));
  if (scanUrl?.trim()) {
    url.searchParams.set('scanUrl', scanUrl.trim());
  }
  return url.toString();
}

function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthActionError('WEAK_PASSWORD', `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AuthActionError('WEAK_PASSWORD', 'Password must include at least one letter and one number.');
  }
}

function mapSupabaseAuthError(error: { message?: string | null }, fallbackMessage: string) {
  const message = error.message?.trim() || fallbackMessage;

  if (/user already registered|email address .*already been registered|duplicate key value/i.test(message)) {
    return new AuthActionError('EMAIL_TAKEN', 'An account with this email already exists. Sign in or reset your password.');
  }

  if (/email not confirmed/i.test(message)) {
    return new AuthActionError('EMAIL_NOT_CONFIRMED', 'Please verify your email before signing in.');
  }

  if (/invalid login credentials/i.test(message)) {
    return new AuthActionError('INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  if (/password should be at least|weak password/i.test(message)) {
    return new AuthActionError('WEAK_PASSWORD', message);
  }

  return new AuthActionError('AUTH_ERROR', message);
}

async function findAdminUserByEmail(email: string) {
  const supabase = getSupabaseClient();
  const perPage = 200;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw mapSupabaseAuthError(error, 'Failed to look up your account.');
    }

    const existingUser = data.users.find((candidate) => normalizeEmail(candidate.email ?? '') === email);
    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < perPage) {
      return null;
    }
  }
}

async function confirmPendingUser(email: string, fullName?: string) {
  const existingUser = await findAdminUserByEmail(email);
  if (!existingUser) {
    throw new AuthActionError('EMAIL_TAKEN', 'An account with this email already exists. Sign in or reset your password.');
  }

  const nextMetadata = fullName
    ? { ...(existingUser.user_metadata ?? {}), full_name: fullName }
    : undefined;

  const { data, error } = await getSupabaseClient().auth.admin.updateUserById(existingUser.id, {
    email_confirm: true,
    ...(nextMetadata ? { user_metadata: nextMetadata } : {}),
  });

  if (error) {
    throw mapSupabaseAuthError(error, 'Failed to finish setting up your account.');
  }

  const user = toAuthUser(data.user) ?? toAuthUser(existingUser);
  if (!user) {
    throw new AuthActionError('AUTH_ERROR', 'Your account exists, but we could not load your user profile.');
  }

  return user;
}

export function buildPostAuthRedirectPath(next: string | null | undefined, scanUrl?: string | null) {
  if (scanUrl?.trim()) {
    const params = new URLSearchParams({
      next: sanitizeRedirectPath(next, '/dashboard'),
      scanUrl: scanUrl.trim(),
    });
    return `/login?${params.toString()}`;
  }

  return sanitizeRedirectPath(next, '/dashboard');
}

export function setSessionCookies(
  response: NextResponse,
  session: { access_token: string; refresh_token: string; expires_at?: number | null }
) {
  const secure = secureCookies();
  response.cookies.set(AUTH_COOKIE_NAME, session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearSession(response: NextResponse) {
  const secure = secureCookies();
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  });
}

// Test-only token map — allows tests to bypass Supabase auth verification
const _testTokens = new Map<string, AuthUser>();

export function _setTestAuth(token: string, user: AuthUser) {
  _testTokens.set(token, user);
}

export function _clearTestAuth() {
  _testTokens.clear();
}

async function getUserFromAccessToken(accessToken: string): Promise<AuthUser | null> {
  const testUser = _testTokens.get(accessToken);
  if (testUser) return testUser;

  const cached = accessTokenUserCache.get(accessToken);
  if (cached && Date.now() - cached.cachedAt < ACCESS_TOKEN_CACHE_TTL_MS) {
    return cached.user;
  }

  const inFlight = accessTokenUserInflight.get(accessToken);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser(accessToken);
      const user = error || !data.user ? null : toAuthUser(data.user);
      accessTokenUserCache.set(accessToken, { user, cachedAt: Date.now() });
      return user;
    } catch {
      accessTokenUserCache.set(accessToken, { user: null, cachedAt: Date.now() });
      return null;
    } finally {
      accessTokenUserInflight.delete(accessToken);
    }
  })();

  accessTokenUserInflight.set(accessToken, request);
  return request;
}

export async function refreshAuthSession(refreshToken: string): Promise<RefreshedAuthSession | null> {
  const inFlight = refreshSessionInflight.get(refreshToken);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const supabase = createRouteHandlerSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      return null;
    }

    const user = toAuthUser(data.user);
    if (!user) {
      return null;
    }

    accessTokenUserCache.set(data.session.access_token, {
      user,
      cachedAt: Date.now(),
    });

    return {
      user,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: expiresAtIso(data.session.expires_at),
      },
      rawSession: data.session,
    };
  })().finally(() => {
    refreshSessionInflight.delete(refreshToken);
  });

  refreshSessionInflight.set(refreshToken, request);
  return request;
}

export async function getServerAuthSession(request: NextRequest): Promise<AuthSessionState> {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (accessToken) {
    const user = await getUserFromAccessToken(accessToken);
    if (user) {
      return {
        user,
        session: { accessToken, refreshToken, expiresAt: null },
      };
    }
  }

  if (!refreshToken) {
    return { user: null, reason: 'no_session', session: null };
  }

  try {
    const refreshed = await refreshAuthSession(refreshToken);
    if (!refreshed?.user || !refreshed.session.accessToken || !refreshed.session.refreshToken) {
      return { user: null, reason: 'refresh_failed', session: null };
    }

    return {
      user: refreshed.user,
      reason: accessToken ? 'token_invalid' : undefined,
      session: refreshed.session,
    };
  } catch {
    return { user: null, reason: 'refresh_failed', session: null };
  }
}

export async function getServerAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const auth = await getServerAuthSession(request);
  return auth.user;
}

export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  return getServerAuthUser(request);
}

export async function requireServerAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getServerAuthUser(request);
  if (!user) {
    throw new Error('Authentication required.');
  }
  return user;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  options?: { name?: string; next?: string | null; scanUrl?: string | null }
) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new AuthActionError('INVALID_EMAIL', 'Please enter a valid email address.');
  }
  validatePassword(password);

  const fullName = options?.name?.trim();
  const { data, error } = await getSupabaseClient().auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    ...(fullName ? { user_metadata: { full_name: fullName } } : {}),
  });

  if (error) {
    const mappedError = mapSupabaseAuthError(error, 'Failed to create your account.');
    if (mappedError.code !== 'EMAIL_TAKEN') {
      throw mappedError;
    }

    try {
      await signInWithPassword(normalized, password);
      throw mappedError;
    } catch (signInError) {
      if (!(signInError instanceof AuthActionError) || signInError.code !== 'EMAIL_NOT_CONFIRMED') {
        throw mappedError;
      }
    }

    const user = await confirmPendingUser(normalized, fullName);
    return {
      user,
      session: null,
      requiresEmailVerification: false,
    };
  }

  const user = toAuthUser(data.user);
  if (!user) {
    throw new AuthActionError('AUTH_ERROR', 'Your account was created, but we could not load your user profile.');
  }

  try {
    const signedIn = await signInWithPassword(normalized, password);
    return {
      user: signedIn.user,
      session: signedIn.session,
      requiresEmailVerification: false,
    };
  } catch {
    // Fall back to the client-side auto-login already built into the signup flow.
  }

  return {
    user,
    session: null,
    requiresEmailVerification: false,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new AuthActionError('INVALID_EMAIL', 'Please enter a valid email address.');
  }

  const supabase = createRouteHandlerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    throw mapSupabaseAuthError(error, 'Failed to sign you in.');
  }

  if (!data.session) {
    throw new AuthActionError('AUTH_ERROR', 'Sign-in succeeded but no session was returned.');
  }

  const user = toAuthUser(data.user);
  if (!user) {
    throw new AuthActionError('AUTH_ERROR', 'Sign-in succeeded but no user was returned.');
  }

  return { user, session: data.session };
}

export async function sendPasswordReset(
  email: string,
  options?: { next?: string | null; scanUrl?: string | null; appUrl?: string | null }
) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new AuthActionError('INVALID_EMAIL', 'Please enter a valid email address.');
  }

  const supabase = createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: buildAuthCallbackUrl(options?.next, options?.scanUrl, options?.appUrl),
  });

  if (error) {
    throw mapSupabaseAuthError(error, 'Failed to send your password reset link.');
  }
}

export async function completePasswordRecovery(request: NextRequest, newPassword: string) {
  validatePassword(newPassword);

  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!accessToken || !refreshToken) {
    throw new AuthActionError(
      'RECOVERY_SESSION_MISSING',
      'Your password reset session is missing or expired. Request a new reset link.'
    );
  }

  const supabase = createRouteHandlerSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session) {
    throw new AuthActionError(
      'RECOVERY_SESSION_MISSING',
      'Your password reset session is invalid or expired. Request a new reset link.'
    );
  }

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw mapSupabaseAuthError(error, 'Failed to update your password.');
  }

  const user = toAuthUser(data.user);
  if (!user) {
    throw new AuthActionError('AUTH_ERROR', 'Password reset succeeded but no user was returned.');
  }

  return {
    user,
    session: sessionData.session,
  };
}

export async function verifyEmailCallback(params: {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
}) {
  const supabase = createRouteHandlerSupabaseClient();
  const callbackType = isSupportedCallbackType(params.type) ? params.type : 'email';

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw mapSupabaseAuthError(error, 'Failed to verify your email link.');
    }

    if (!data.session) {
      throw new AuthActionError('AUTH_ERROR', 'Verification succeeded but no session was returned.');
    }

    const user = toAuthUser(data.user);
    if (!user) {
      throw new AuthActionError('AUTH_ERROR', 'Verification succeeded but no user was returned.');
    }

    return { user, session: data.session, type: callbackType };
  }

  if (!params.tokenHash) {
    throw new AuthActionError('MISSING_TOKEN', 'Missing verification token.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: params.tokenHash,
    type: callbackType,
  });

  if (error) {
    throw mapSupabaseAuthError(error, 'Failed to verify your email link.');
  }

  if (!data.session) {
    throw new AuthActionError('AUTH_ERROR', 'Verification succeeded but no session was returned.');
  }

  const user = toAuthUser(data.user);
  if (!user) {
    throw new AuthActionError('AUTH_ERROR', 'Verification succeeded but no user was returned.');
  }

  return { user, session: data.session, type: callbackType };
}

export async function refreshRequestSession(
  request: NextRequest,
  response: NextResponse
): Promise<AuthSessionState> {
  const auth = await getServerAuthSession(request);

  if (auth.session?.accessToken && auth.session.refreshToken) {
    setSessionCookies(response, {
      access_token: auth.session.accessToken,
      refresh_token: auth.session.refreshToken,
      expires_at: auth.session.expiresAt ? Date.parse(auth.session.expiresAt) / 1000 : undefined,
    });
  } else if (!auth.user) {
    clearSession(response);
  }

  return auth;
}

export async function maybeRefreshSessionInMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<AuthSessionState> {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (accessToken) {
    const user = await getUserFromAccessToken(accessToken);
    if (user) {
      return {
        user,
        session: { accessToken, refreshToken, expiresAt: null },
      };
    }
  }

  if (!refreshToken) {
    return { user: null, reason: 'no_session', session: null };
  }

  try {
    const supabase = createMiddlewareSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      // Only clear session for definitive auth errors (invalid/used refresh token)
      // Check if it's a definitive auth error vs a transient one
      const isDefinitive = error?.message
        && (/invalid.*token|token.*revoked|token.*expired|already.*used/i.test(error.message));
      if (isDefinitive) {
        clearSession(response);
      }
      // On transient errors, return failure but don't wipe cookies
      return { user: null, reason: 'refresh_failed', session: null };
    }

    setSessionCookies(response, data.session);
    return {
      user: toAuthUser(data.user),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: expiresAtIso(data.session.expires_at),
      },
    };
  } catch {
    // Network/timeout error — don't wipe cookies, just return failure
    return { user: null, reason: 'refresh_failed', session: null };
  }
}

export function sanitizeAuthUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  };
}

export function sanitizeRedirectPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  return next;
}

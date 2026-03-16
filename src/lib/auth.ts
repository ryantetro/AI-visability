import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser } from '@/types/auth';
import { getSupabaseAnonClient, getSupabaseClient } from '@/lib/supabase';

export const AUTH_COOKIE_NAME = 'aiso_auth_session';
export const REFRESH_COOKIE_NAME = 'aiso_refresh_token';
const ACCESS_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

export async function requestOtp(email: string, next?: string) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error('Please enter a valid email address.');
  }

  const supabase = getSupabaseAnonClient();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let redirectTo = `${siteUrl}/auth/callback`;
  if (next && next.startsWith('/')) {
    redirectTo += `?next=${encodeURIComponent(next)}`;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function verifyOtp(email: string, code: string) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error('Please enter a valid email address.');
  }

  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: code.trim(),
    type: 'email',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('Verification succeeded but no session was returned.');
  }

  const user: AuthUser = {
    id: data.user?.id ?? normalized,
    email: data.user?.email ?? normalized,
    name: buildNameFromEmail(data.user?.email ?? normalized),
    provider: 'email',
  };

  return { user, accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

/** Verify Magic Link (token_hash from URL when user clicks email link). */
export async function verifyMagicLink(tokenHash: string) {
  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('Verification succeeded but no session was returned.');
  }

  const user: AuthUser = {
    id: data.user?.id ?? '',
    email: data.user?.email ?? '',
    name: buildNameFromEmail(data.user?.email ?? ''),
    provider: 'email',
  };

  return { user, accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

export async function getAuthUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;

    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: buildNameFromEmail(data.user.email ?? ''),
      provider: 'email',
    };
  } catch {
    return null;
  }
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(AUTH_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/api/auth/refresh',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
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
    path: '/api/auth/refresh',
    maxAge: 0,
  });
}


export function sanitizeAuthUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  };
}

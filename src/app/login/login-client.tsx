'use client';

import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth';
import { getDomain } from '@/lib/url-utils';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'check-email' | 'reset-password';
type CheckEmailKind = 'signup' | 'recovery';

function normalizeNext(next: string | null) {
  if (!next || !next.startsWith('/')) return '/dashboard';
  if (next.startsWith('//')) return '/dashboard';
  return next;
}

function resolveMode(value: string | null): AuthMode {
  if (value === 'sign-up') return 'sign-up';
  if (value === 'forgot-password') return 'forgot-password';
  if (value === 'check-email') return 'check-email';
  if (value === 'reset-password') return 'reset-password';
  return 'sign-in';
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <path d="M16 3 A13 13 0 0 1 27.3 18.5" fill="none" stroke="var(--color-primary-500)" strokeWidth="3" strokeLinecap="round" />
      <path d="M27.3 18.5 A13 13 0 0 1 4.7 18.5" fill="none" stroke="var(--color-band-ai-ready)" strokeWidth="3" strokeLinecap="round" />
      <path d="M4.7 18.5 A13 13 0 0 1 16 3" fill="none" stroke="var(--color-accent-500)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AuthInput({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  icon: ComponentType<{ className?: string }>;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-all"
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(10, 10, 12, 0.86)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent text-[15px] outline-none"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
      />
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const allPassed = hasMinLength && hasLetter && hasNumber;
  const started = password.length > 0;

  const items = [
    { label: `${PASSWORD_MIN_LENGTH}+ characters`, passed: hasMinLength },
    { label: 'One letter', passed: hasLetter },
    { label: 'One number', passed: hasNumber },
  ];

  return (
    <div className="flex items-center gap-3 px-1">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2">
          {i > 0 && (
            <div
              className="h-3 w-px"
              style={{ background: 'var(--border-default)' }}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-300"
              style={{
                background: item.passed
                  ? 'rgba(37, 201, 114, 0.15)'
                  : started && !item.passed
                    ? 'rgba(255, 82, 82, 0.1)'
                    : 'var(--surface-contrast)',
                border: item.passed
                  ? '1px solid rgba(37, 201, 114, 0.3)'
                  : '1px solid var(--border-default)',
              }}
            >
              {item.passed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="#25c972" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className="text-[11px] font-medium transition-colors duration-300"
              style={{
                color: item.passed
                  ? 'var(--color-band-ai-ready)'
                  : 'var(--text-muted)',
              }}
            >
              {item.label}
            </span>
          </div>
        </div>
      ))}
      {allPassed && (
        <div className="ml-auto">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-check-done">
            <circle cx="7" cy="7" r="6" fill="rgba(37, 201, 114, 0.12)" stroke="rgba(37, 201, 114, 0.35)" strokeWidth="1" />
            <path d="M4 7.2L6 9.2L10 5" stroke="#25c972" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>(() => resolveMode(searchParams.get('mode')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [checkEmailKind, setCheckEmailKind] = useState<CheckEmailKind>('signup');
  const redirectingRef = useRef(false);

  const nextPath = normalizeNext(searchParams.get('next'));
  const scanUrl = searchParams.get('scanUrl');
  const callbackError = searchParams.get('error');
  const targetDomain = useMemo(() => {
    if (!scanUrl) return null;
    try {
      return getDomain(scanUrl);
    } catch {
      return null;
    }
  }, [scanUrl]);

  const passwordsMatch = password === confirmPassword;
  const passwordIsValid = password.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password);

  async function completePostLoginRedirect() {
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('aiso_auth');
        channel.postMessage({ type: 'login' });
        channel.close();
      }
    } catch { /* degrade gracefully */ }

    if (scanUrl) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: scanUrl }),
        });
        if (res.ok) {
          const { id } = await res.json();
          router.replace(`/report?report=${id}`);
          return;
        }
      } catch { /* fall through to dashboard */ }
      router.replace('/dashboard');
      return;
    }

    router.replace(nextPath);
  }

  useEffect(() => {
    setMode(resolveMode(searchParams.get('mode')));
  }, [searchParams]);

  useEffect(() => {
    if (callbackError) {
      setError(callbackError);
    }
  }, [callbackError]);

  useEffect(() => {
    if (!loading && user && mode !== 'reset-password') {
      void completePostLoginRedirect();
    }
  }, [loading, mode, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetTransientState = () => {
    setError('');
    setSubmitting(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    resetTransientState();
    setMode(nextMode);
  };

  const handleSignIn = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to sign in.');
      }

      await refresh();
      await completePostLoginRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, next: nextPath, scanUrl }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to create your account.');
      }

      // If signup returned a session, cookies are already set — refresh and redirect
      if (payload.session) {
        await refresh();
        await completePostLoginRedirect();
        return;
      }

      // Otherwise auto-login with the same credentials to establish a session
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        const loginPayload = await loginRes.json();
        throw new Error(loginPayload.error || 'Account created but automatic sign-in failed. Please sign in manually.');
      }

      await refresh();
      await completePostLoginRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next: nextPath, scanUrl }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to send your reset link.');
      }

      setEmailHint(email);
      setCheckEmailKind('recovery');
      switchMode('check-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to reset your password.');
      }

      await refresh();
      await completePostLoginRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const titleByMode: Record<AuthMode, string> = {
    'sign-in': 'Welcome back',
    'sign-up': 'Create your account',
    'forgot-password': 'Reset your password',
    'check-email': 'Check your inbox',
    'reset-password': 'Choose a new password',
  };

  const subtitleByMode: Record<AuthMode, string> = {
    'sign-in': 'Sign in to access your AI visibility dashboard.',
    'sign-up': 'Start monitoring how AI search engines see your business.',
    'forgot-password': "We'll send a secure reset link to your email.",
    'check-email': 'Your next step is waiting in your inbox.',
    'reset-password': 'Set a new password to regain access.',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-page)' }}>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
        {/* Ambient glows — matching landing hero */}
        <div
          className="absolute left-1/2 top-0 -z-10 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.08] blur-[160px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-primary-400), transparent 70%)' }}
        />
        <div
          className="absolute left-1/2 top-20 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-accent-400), transparent 70%)' }}
        />

        <div className="relative z-10 w-full max-w-[460px] mx-auto">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-8 animate-hero-fade" style={{ animationDelay: '0ms' }}>
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <BrandMark />
              <span
                className="text-[1.6rem] font-bold tracking-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                AISO
              </span>
            </Link>
          </div>

          {/* Main card */}
          <div
            className="aiso-card-soft animate-hero-fade"
            style={{
              padding: '2rem 2rem',
              animationDelay: '80ms',
            }}
          >
            {/* Header */}
            <div className="text-center">
              {targetDomain ? (
                <div className="mb-4 flex justify-center">
                  <span className="aiso-pill">
                    Scanning {targetDomain}
                  </span>
                </div>
              ) : null}

              <h1
                className="text-[1.7rem] font-bold tracking-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.15 }}
              >
                {titleByMode[mode]}
              </h1>
              <p
                className="mt-2.5 text-sm leading-relaxed"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {subtitleByMode[mode]}
              </p>
            </div>

            {/* Form */}
            <div className="mt-7 space-y-4">
              {(mode === 'sign-in' || mode === 'sign-up' || mode === 'forgot-password') && (
                <AuthInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              )}

              {mode === 'sign-up' ? (
                <AuthInput
                  icon={UserRound}
                  type="text"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    setError('');
                  }}
                  placeholder="Your name (optional)"
                  autoComplete="name"
                />
              ) : null}

              {(mode === 'sign-in' || mode === 'sign-up' || mode === 'reset-password') && (
                <AuthInput
                  icon={LockKeyhole}
                  type="password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setError('');
                  }}
                  placeholder={mode === 'reset-password' ? 'Choose a new password' : 'Password'}
                  autoComplete={mode === 'reset-password' ? 'new-password' : mode === 'sign-up' ? 'new-password' : 'current-password'}
                />
              )}

              {(mode === 'sign-up' || mode === 'reset-password') && (
                <>
                  <AuthInput
                    icon={LockKeyhole}
                    type="password"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      setError('');
                    }}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                  <PasswordChecklist password={password} />
                </>
              )}

              {/* Check email state */}
              {mode === 'check-email' ? (
                <div
                  className="p-5 text-left"
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--surface-soft)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 p-2.5"
                      style={{
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--surface-contrast)',
                      }}
                    >
                      <Mail className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {checkEmailKind === 'signup' ? 'Verify your email address' : 'Password reset link sent'}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        {checkEmailKind === 'signup'
                          ? `We sent a confirmation link to ${emailHint || 'your inbox'}. Click it to activate your account.`
                          : `We sent a secure reset link to ${emailHint || 'your inbox'}. Open it on this device to set a new password.`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => switchMode('sign-in')}
                      className="aiso-button aiso-button-secondary"
                      style={{ height: '44px', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}
                    >
                      Back to sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode(checkEmailKind === 'signup' ? 'sign-up' : 'forgot-password')}
                      className="aiso-button aiso-button-primary"
                      style={{ height: '44px', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Sign in actions */}
              {mode === 'sign-in' ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={submitting || !email || !password}
                    className="aiso-button aiso-button-primary w-full"
                    style={{ height: '50px', justifyContent: 'center', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem' }}
                  >
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('sign-up')}
                      className="font-medium transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      Create account
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Sign up actions */}
              {mode === 'sign-up' ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSignUp}
                    disabled={submitting || !email || !password || !confirmPassword || !passwordIsValid || !passwordsMatch}
                    className="aiso-button aiso-button-primary w-full"
                    style={{ height: '50px', justifyContent: 'center', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem' }}
                  >
                    {submitting ? 'Creating account...' : 'Create account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('sign-in')}
                    className="w-full text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              ) : null}

              {/* Forgot password actions */}
              {mode === 'forgot-password' ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={submitting || !email}
                    className="aiso-button aiso-button-primary w-full"
                    style={{ height: '50px', justifyContent: 'center', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem' }}
                  >
                    {submitting ? 'Sending reset link...' : 'Send reset link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('sign-in')}
                    className="w-full text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : null}

              {/* Reset password actions */}
              {mode === 'reset-password' ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={submitting || !password || !confirmPassword || !passwordIsValid || !passwordsMatch}
                    className="aiso-button aiso-button-primary w-full"
                    style={{ height: '50px', justifyContent: 'center', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem' }}
                  >
                    {submitting ? 'Updating password...' : 'Update password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="w-full text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    Need a new reset link?
                  </button>
                </div>
              ) : null}

              {error ? (
                <p className="text-center text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 space-y-2 text-center animate-hero-fade" style={{ animationDelay: '160ms' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              By continuing, you agree to our{' '}
              <Link
                href="/terms"
                className="underline underline-offset-4 transition-colors"
                style={{ color: 'var(--text-tertiary)', textDecorationColor: 'var(--border-default)' }}
              >
                Terms of Service
              </Link>
              .
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Need help?{' '}
              <a
                href="mailto:ryan@yourwebsitescore.com"
                className="underline underline-offset-4 transition-colors"
                style={{ color: 'var(--text-tertiary)', textDecorationColor: 'var(--border-default)' }}
              >
                Email me
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

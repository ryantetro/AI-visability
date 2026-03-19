'use client';

import { type ComponentType, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth';
import { getDomain } from '@/lib/url-utils';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'check-email' | 'reset-password';
type CheckEmailKind = 'signup' | 'recovery';

function normalizeNext(next: string | null) {
  if (!next || !next.startsWith('/')) return '/analysis';
  if (next.startsWith('//')) return '/analysis';
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
    <svg viewBox="0 0 32 32" className="h-10 w-10" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <path
        d="M16 3 A13 13 0 0 1 27.3 18.5"
        fill="none"
        stroke="#356df4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M27.3 18.5 A13 13 0 0 1 4.7 18.5"
        fill="none"
        stroke="#25c972"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M4.7 18.5 A13 13 0 0 1 16 3"
        fill="none"
        stroke="#16b7ca"
        strokeWidth="3"
        strokeLinecap="round"
      />
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
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors focus-within:border-white/20">
      <Icon className="h-4 w-4 text-zinc-500" />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
      />
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const items = [
    { label: `${PASSWORD_MIN_LENGTH}+ characters`, passed: hasMinLength },
    { label: 'At least one letter', passed: hasLetter },
    { label: 'At least one number', passed: hasNumber },
  ];

  return (
    <div className="grid gap-2 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Password Requirements
      </p>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              item.passed
                ? 'border-[#25c972]/30 bg-[#25c972]/12 text-[#7ee8af]'
                : 'border-white/8 bg-white/[0.03] text-zinc-500'
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
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
  const [canSetPassword, setCanSetPassword] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [checkEmailKind, setCheckEmailKind] = useState<CheckEmailKind>('signup');

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
    // Broadcast login to other tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('aiso_auth');
        channel.postMessage({ type: 'login' });
        channel.close();
      }
    } catch { /* degrade gracefully */ }

    if (scanUrl) {
      router.replace(`/analysis?prefill=${encodeURIComponent(scanUrl)}`);
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
    setCanSetPassword(false);
    setSubmitting(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    resetTransientState();
    setMode(nextMode);
  };

  const handleSignIn = async () => {
    setSubmitting(true);
    setError('');
    setCanSetPassword(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.code === 'INVALID_CREDENTIALS') {
          setCanSetPassword(true);
        }
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

      if (payload.requiresEmailVerification) {
        setEmailHint(email);
        setCheckEmailKind('signup');
        switchMode('check-email');
        return;
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

  const sendPasswordSetup = async () => {
    if (!email) {
      setError('Enter your email address first so we can send your password setup link.');
      return;
    }

    await handleForgotPassword();
  };

  const titleByMode: Record<AuthMode, string> = {
    'sign-in': 'Sign in to your workspace',
    'sign-up': 'Create your AISO account',
    'forgot-password': 'Reset your password',
    'check-email': 'Check your inbox',
    'reset-password': 'Choose a new password',
  };

  const subtitleByMode: Record<AuthMode, string> = {
    'sign-in': 'Professional AI visibility monitoring starts with a secure account.',
    'sign-up': 'Create a verified account to save scans, unlock reports, and manage billing.',
    'forgot-password': 'We’ll send you a secure reset link so you can get back into your account.',
    'check-email': 'Your next step is in your inbox.',
    'reset-password': 'Finish your recovery flow by setting a new password.',
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(53,109,244,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(37,201,114,0.12),transparent_22%),radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_55%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:120px_120px]" />

        <div className="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_520px] lg:items-center">
          <div className="hidden rounded-[32px] border border-white/8 bg-[rgba(15,15,17,0.6)] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:block">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 text-[#25c972]" />
                Secure Account Access
              </div>
              <h2 className="mt-8 text-4xl font-semibold tracking-tight text-white">
                Standard SaaS auth, built for teams that need confidence.
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-zinc-400">
                Save scans, unlock full reports, manage your billing, and return to active audits without juggling emailed one-time codes.
              </p>

              <div className="mt-10 grid gap-4">
                {[
                  {
                    icon: Sparkles,
                    title: 'Verified accounts',
                    body: 'New accounts confirm ownership first, then land directly inside the product.',
                  },
                  {
                    icon: KeyRound,
                    title: 'Password recovery built in',
                    body: 'Lost access? Reset links take you straight into a secure password recovery flow.',
                  },
                  {
                    icon: ArrowRight,
                    title: 'Keeps your scan in motion',
                    body: targetDomain
                      ? `After auth, we’ll take you right back to ${targetDomain}.`
                      : 'After auth, you go right back to analysis without losing your place.',
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-2xl border border-white/8 bg-white/[0.04] p-2.5">
                        <Icon className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">{body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full">
            <div className="rounded-[28px] border border-white/10 bg-[rgba(22,22,24,0.92)] px-7 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-8">
              <div className="flex flex-col items-center text-center">
                <p className="text-[15px] text-zinc-400">Welcome to</p>
                <div className="mt-4 flex items-center gap-3">
                  <BrandMark />
                  <h1 className="text-[2.2rem] font-semibold tracking-tight text-white sm:text-[2.4rem]">
                    AISO
                  </h1>
                </div>
                {targetDomain ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    Continue to scan <span className="font-medium text-zinc-300">{targetDomain}</span>
                  </p>
                ) : null}
                <h2 className="mt-6 text-[1.9rem] font-semibold tracking-tight text-white">
                  {titleByMode[mode]}
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                  {subtitleByMode[mode]}
                </p>
              </div>

              <div className="mt-8 space-y-5">
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

                {mode === 'check-email' ? (
                  <div className="rounded-[24px] border border-white/8 bg-black/20 p-5 text-left">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                        <Mail className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {checkEmailKind === 'signup' ? 'Verify your email address' : 'Password reset link sent'}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {checkEmailKind === 'signup'
                            ? `We sent a confirmation link to ${emailHint || 'your inbox'}. Click it to activate your account and continue into AISO.`
                            : `We sent a secure reset link to ${emailHint || 'your inbox'}. Open it on this device to set a new password.`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => switchMode('sign-in')}
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                      >
                        Back to sign in
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode(checkEmailKind === 'signup' ? 'sign-up' : 'forgot-password')}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
                      >
                        Use a different email
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === 'sign-in' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={submitting || !email || !password}
                      className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? 'Signing in...' : 'Sign in'}
                    </button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-zinc-400 transition-colors hover:text-zinc-200"
                      >
                        Forgot password?
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('sign-up')}
                        className="text-zinc-300 transition-colors hover:text-white"
                      >
                        Create account
                      </button>
                    </div>
                    {canSetPassword ? (
                      <div className="rounded-2xl border border-[#356df4]/25 bg-[#356df4]/10 p-4 text-left">
                        <p className="text-sm font-medium text-white">Used the old passwordless flow?</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                          Send yourself a password setup link and switch your account to the new sign-in flow.
                        </p>
                        <button
                          type="button"
                          onClick={sendPasswordSetup}
                          className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-white/[0.08] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                        >
                          Set your password
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {mode === 'sign-up' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSignUp}
                      disabled={submitting || !email || !password || !confirmPassword || !passwordIsValid || !passwordsMatch}
                      className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? 'Creating account...' : 'Create account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('sign-in')}
                      className="w-full text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                ) : null}

                {mode === 'forgot-password' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={submitting || !email}
                      className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? 'Sending reset link...' : 'Send reset link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('sign-in')}
                      className="w-full text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : null}

                {mode === 'reset-password' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={submitting || !password || !confirmPassword || !passwordIsValid || !passwordsMatch}
                      className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? 'Updating password...' : 'Update password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="w-full text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      Need a new reset link?
                    </button>
                  </div>
                ) : null}

                {error ? (
                  <p className="text-center text-sm text-red-400">{error}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-7 space-y-3 text-center">
              <p className="text-sm text-zinc-500">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white">
                  Terms of Service
                </Link>
                .
              </p>
              <p className="text-sm text-zinc-500">
                Need help?{' '}
                <a
                  href="mailto:ryan@yourwebsitescore.com"
                  className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
                >
                  Email me
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

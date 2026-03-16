'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getDomain } from '@/lib/url-utils';

function normalizeNext(next: string | null) {
  if (!next || !next.startsWith('/')) return '/analysis';
  return next;
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


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nextPath = normalizeNext(searchParams.get('next'));
  const scanUrl = searchParams.get('scanUrl');
  const targetDomain = useMemo(() => {
    if (!scanUrl) return null;
    try {
      return getDomain(scanUrl);
    } catch {
      return null;
    }
  }, [scanUrl]);

  async function completePostLoginRedirect() {
    if (scanUrl) {
      router.replace(`/analysis?prefill=${encodeURIComponent(scanUrl)}`);
      return;
    }

    router.replace(nextPath);
  }

  useEffect(() => {
    if (!loading && user) {
      void completePostLoginRedirect();
    }
  }, [loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendCode = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next: nextPath }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to send sign-in code.');
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send sign-in code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!codeSent) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to verify code.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_30%),radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_55%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:120px_120px]" />

        <div className="relative z-10 w-full max-w-[520px]">
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
            </div>

            <div className="mt-8 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors focus-within:border-white/20">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
                  />
                </div>

                {codeSent ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setError('');
                      }}
                      placeholder="Enter 6-digit code"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white/20"
                    />
                    <p className="text-xs text-zinc-500">
                      Check your inbox for the one-time sign-in code.
                    </p>
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={submitting || code.length !== 6}
                      className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? 'Verifying...' : 'Continue with Email'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={submitting}
                    className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#e8e8e8] px-4 text-base font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
                  >
                    {submitting ? 'Sending code...' : 'Sign in with Email'}
                  </button>
                )}
              </div>

              {error ? (
                <p className="text-center text-sm text-red-400">{error}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-7 space-y-3 text-center">
            <p className="text-sm text-zinc-500">
              By signing up, you agree to our{' '}
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
  );
}

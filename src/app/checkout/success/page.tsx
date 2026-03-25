'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [resolvedScanId, setResolvedScanId] = useState(searchParams.get('scanId'));
  const [verifying, setVerifying] = useState(Boolean(searchParams.get('session_id')));
  const [verifyError, setVerifyError] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const existingScanId = searchParams.get('scanId');

    if (!sessionId || existingScanId) {
      setResolvedScanId(existingScanId);
      setVerifying(false);
      return;
    }

    let active = true;

    async function verify() {
      try {
        const res = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          throw new Error('Verification failed');
        }

        const payload = await res.json();
        if (!active) return;
        if (payload.paid && payload.scanId) {
          setResolvedScanId(payload.scanId);
        }
      } catch {
        if (active) setVerifyError(true);
      } finally {
        if (active) {
          setVerifying(false);
        }
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact flex min-h-screen items-center justify-center py-16">
      <div className="aiso-card flex max-w-2xl flex-col items-center gap-6 px-8 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(53,109,244,0.18)', boxShadow: '0 14px 28px rgba(36, 85, 220, 0.24)' }}>
          <svg className="h-8 w-8" style={{ color: 'var(--color-primary-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="aiso-kicker">Payment Confirmed</p>
        <h1 className="app-h2 font-bold" style={{ color: 'var(--text-primary)' }}>
          Payment Successful
        </h1>
        <p className="app-body app-measure max-w-md" style={{ color: 'var(--text-tertiary)' }}>
          {verifying
            ? 'Confirming your checkout session and unlocking your advanced implementation tools.'
            : resolvedScanId
              ? 'Your AI visibility fix files are ready. Follow the guided install steps to boost your score.'
              : 'Your plan has been upgraded. Head to your dashboard to access all features.'}
        </p>
        {!verifying && (
          <>
            <Link
              href={resolvedScanId ? `/dashboard?report=${resolvedScanId}` : '/dashboard'}
              className="aiso-button aiso-button-primary px-6 py-3 text-sm"
            >
              {resolvedScanId ? 'Open Advanced Tools' : 'Go to Dashboard'}
            </Link>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Plan upgrades apply within 30 seconds. If your new features aren't visible yet, refresh the page.
            </p>
          </>
        )}
        {verifyError && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-error-500, #ef4444)' }}>
            We couldn't confirm your session automatically.{' '}
            <Link href="/dashboard" className="underline">Go to dashboard</Link> — your payment was received and your plan will update shortly.
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="aiso-spinner h-10 w-10 animate-spin rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

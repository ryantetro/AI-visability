'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scanId');

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact flex min-h-screen items-center justify-center py-16">
      <div className="aiso-card flex max-w-2xl flex-col items-center gap-6 px-8 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-primary-50)', boxShadow: '0 14px 28px rgba(5, 150, 105, 0.16)' }}>
          <svg className="h-8 w-8" style={{ color: 'var(--color-primary-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="aiso-kicker">Payment Confirmed</p>
        <h1 className="app-h2 font-bold" style={{ color: 'var(--text-primary)' }}>
          Payment Successful!
        </h1>
        <p className="app-body app-measure max-w-md" style={{ color: 'var(--text-tertiary)' }}>
          Your AI visibility fix files are ready. Follow the guided install steps to boost your score.
        </p>
        {scanId && (
          <Link
            href={`/dashboard/${scanId}`}
            className="aiso-button aiso-button-primary px-6 py-3 text-sm"
          >
            View Your Fix Files
          </Link>
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

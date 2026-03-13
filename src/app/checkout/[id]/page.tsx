'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handleSimulatePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.paid) {
          router.push(`/checkout/success?scanId=${data.scanId}`);
        }
      }
    } catch {
      // silently fail
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="aiso-page app-page aiso-shell app-shell-compact flex min-h-screen items-center justify-center py-16">
      <div className="aiso-card w-full max-w-xl p-8 sm:p-10">
        <p className="aiso-kicker mb-3">Checkout</p>
        <h1 className="app-h2 mb-2 font-bold" style={{ color: 'var(--text-primary)' }}>
          Complete Your Purchase
        </h1>
        <p className="app-body mb-6" style={{ color: 'var(--text-tertiary)' }}>
          AI Visibility Fix Package — auto-generated files to boost your AI search presence.
        </p>

        <div className="aiso-card-soft mb-6 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fix Package</span>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>$99.00</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <li>- Custom llms.txt file</li>
            <li>- Optimized robots.txt directives</li>
            <li>- Organization JSON-LD schema</li>
            <li>- Updated sitemap.xml</li>
            <li>- Step-by-step install guide</li>
          </ul>
        </div>

        <div
          className="mb-5 rounded-2xl border border-dashed px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em]"
          style={{
            borderColor: 'rgba(245, 158, 11, 0.34)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            color: 'var(--color-warning)',
          }}
        >
          Mock / fallback checkout - no real payment will be charged
        </div>

        <button
          onClick={handleSimulatePayment}
          disabled={processing}
          className="aiso-button aiso-button-primary w-full py-3 text-sm"
        >
          {processing ? 'Processing...' : 'Continue to Package Access'}
        </button>
      </div>
    </div>
  );
}

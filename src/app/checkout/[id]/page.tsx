'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Crown, ShieldCheck } from 'lucide-react';

const INCLUDED = [
  'Custom llms.txt file',
  'Optimized robots.txt directives',
  'Organization JSON-LD schema',
  'Updated sitemap.xml',
  'Step-by-step install guide',
];

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
          router.push(`/dashboard?report=${data.scanId}&checkout=success&session_id=${id}`);
        }
      }
    } catch {
      // silently fail
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060606] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,12,14,0.98)_0%,rgba(7,7,8,0.99)_100%)] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)] sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <Crown className="h-6 w-6 text-amber-400" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Checkout
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white">
              Complete Your Purchase
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              AI Visibility Fix Package — auto-generated files to boost your AI search presence.
            </p>
          </div>

          {/* Package card */}
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">Fix Package</span>
              <span className="text-xl font-bold text-white">$35.00</span>
            </div>
            <div className="mt-1 text-[12px] text-zinc-500">One-time payment</div>

            <div className="mt-4 space-y-2.5">
              {INCLUDED.map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25c972]/15">
                    <Check className="h-3 w-3 text-[#25c972]" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Mock notice */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-[12px] leading-5 text-amber-300/90">
              Mock checkout — no real payment will be charged
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleSimulatePayment}
            disabled={processing}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#356df4] text-sm font-semibold text-white shadow-[0_0_20px_rgba(53,109,244,0.25)] transition-all hover:bg-[#4578f5] hover:shadow-[0_0_24px_rgba(53,109,244,0.35)] disabled:opacity-50"
          >
            {processing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </div>
            ) : (
              'Continue to Package Access'
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-zinc-500">
            Instant access after payment
          </p>
        </div>
      </div>
    </div>
  );
}

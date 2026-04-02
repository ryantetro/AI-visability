import { PricingSection } from '@/components/pricing/pricing-section';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-gray-900">
      <PricingSection
        title="Simple, transparent pricing"
        description="Start free. Upgrade when you need full access to your AI visibility dashboard, monitoring, and fix tools."
        context="pricing"
        showBackLink
      />
    </div>
  );
}

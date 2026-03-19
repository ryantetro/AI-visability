'use client';

import { useState } from 'react';
import { Bell, CreditCard, Mail } from 'lucide-react';
import Link from 'next/link';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { usePlan } from '@/hooks/use-plan';
import { PLANS } from '@/lib/pricing';
import { useDomainContext } from '@/contexts/domain-context';

interface SettingsSectionProps {
  domain: string;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
  onDisableMonitoring: () => void;
}

export function SettingsSection({
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
  onDisableMonitoring,
}: SettingsSectionProps) {
  const [notificationAlertsOn, setNotificationAlertsOn] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const { tier, plan, email } = usePlan();
  const planConfig = PLANS[tier];
  const { monitoredSites } = useDomainContext();

  const billingCycle = plan.includes('annual') ? 'Annual' : plan.includes('monthly') ? 'Monthly' : '';

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          // Stripe not configured — fall back to pricing page
          window.location.href = '/pricing';
          return;
        }
        throw new Error(data.error || 'Failed to open billing portal');
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Fallback to pricing page on any error
      window.location.href = '/pricing';
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing & Plan */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Billing"
          title="Billing & Plan"
          description="Manage your subscription and usage."
        />
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Current Plan</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-bold',
                  tier === 'pro' ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : tier === 'starter' ? 'bg-[#25c972]/15 text-[#25c972]'
                    : 'bg-white/10 text-zinc-400'
                )}>
                  {planConfig.name}
                </span>
                {tier !== 'free' && billingCycle && (
                  <span className="text-[10px] text-zinc-500">{billingCycle}</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Domains</p>
              <p className="mt-1 text-sm font-medium text-white">{monitoredSites.length} / {planConfig.domains}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Prompts Tracked</p>
              <p className="mt-1 text-sm font-medium text-white">0 / {planConfig.prompts}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {tier === 'free' ? (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1]"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade Plan
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenBillingPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenBillingPortal}
                  disabled={portalLoading}
                  className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  {portalLoading ? 'Opening...' : 'Cancel Plan'}
                </button>
              </>
            )}
          </div>
        </div>
      </DashboardPanel>

      {/* Monitoring & Alerts */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Monitoring"
          title="Monitoring & Alerts"
          description={`Automated scans and email alerts for ${domain}.`}
        />
        <div className="mt-5 space-y-4">
          {/* Scan schedule */}
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Automated Scans</p>
              <p className="mt-1 text-[12px] text-zinc-400">
                Runs {tier === 'pro' ? 'daily' : 'weekly'} and tracks score changes over time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'inline-block h-2 w-2 rounded-full',
                monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600'
              )} />
              <span className="text-[12px] text-zinc-400">
                {monitoringConnected ? 'Active' : 'Inactive'}
              </span>
              {monitoringConnected ? (
                <button
                  type="button"
                  onClick={onDisableMonitoring}
                  disabled={monitoringLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  <Bell className="h-3 w-3" />
                  {monitoringLoading ? 'Disabling...' : 'Disable'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEnableMonitoring}
                  disabled={monitoringLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Bell className="h-3 w-3" />
                  {monitoringLoading ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>
          </div>

          {/* Score alerts toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Score Change Alerts</p>
              <p className="mt-1 text-[12px] text-zinc-400">
                Get emailed when your score moves by 2+ points
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationAlertsOn}
              onClick={() => setNotificationAlertsOn(!notificationAlertsOn)}
              className={cn(
                'relative h-5 w-10 shrink-0 rounded-full transition-colors',
                notificationAlertsOn ? 'bg-[#25c972]' : 'bg-white/20'
              )}
            >
              <span className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                notificationAlertsOn ? 'left-[calc(100%-1.125rem)]' : 'left-0.5'
              )} />
            </button>
          </div>

          {/* Alert email */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <label htmlFor="notif-email" className="text-sm font-medium text-white">Alert email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="notif-email"
                type="email"
                value={email}
                readOnly
                className="h-10 w-full rounded-lg border border-white/10 bg-[#1b1b1c] py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none cursor-default opacity-80"
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Alerts are sent to your login email</p>
          </div>
        </div>
      </DashboardPanel>

      {/* Account Info */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Account"
          title="Account Info"
          description="Your plan details and usage."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Domain</p>
            <p className="mt-1 text-sm font-medium text-white">{domain}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Email</p>
            <p className="mt-1 text-sm font-medium text-white">{email || '—'}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</p>
            <p className={cn(
              'mt-1 text-sm font-medium',
              monitoringConnected ? 'text-[#25c972]' : 'text-zinc-400'
            )}>
              {monitoringConnected ? 'Monitoring Active' : 'Monitoring Inactive'}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Plan</p>
            <p className="mt-1 text-sm font-medium text-white">
              {tier === 'free' ? 'Free' : `${planConfig.name} (${billingCycle || 'Monthly'})`}
            </p>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}

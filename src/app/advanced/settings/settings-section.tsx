'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Bell, Copy, CreditCard, KeyRound, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { buildBotTrackingInstallPrompt, buildBotTrackingSnippet, type BotTrackingRuntime } from '@/lib/llm-prompts';
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

type TrackingKeyState = {
  siteKey: string | null;
  domain: string;
  createdAt: string | null;
};

function normalizeAppUrl(url: string) {
  return url.replace(/\/$/, '');
}

function SettingsMetaStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'primary' | 'success' | 'warning';
    valueClassName?: string;
  }>;
}) {
  const toneClasses: Record<NonNullable<(typeof items)[number]['tone']>, string> = {
    default: 'text-white',
    primary: 'text-[var(--color-primary)]',
    success: 'text-[#34d399]',
    warning: 'text-[#f6c177]',
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-[132px] rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
          <p
            className={cn(
              'mt-1.5 text-[14px] font-semibold leading-5',
              toneClasses[item.tone ?? 'default'],
              item.valueClassName
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function SettingsRow({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-t border-white/8 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-white">{title}</p>
          {description && (
            <p className="mt-1.5 text-[13px] leading-6 text-zinc-400">{description}</p>
          )}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
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
  const [trackingRuntime, setTrackingRuntime] = useState<BotTrackingRuntime>('next');
  const [trackingKey, setTrackingKey] = useState<TrackingKeyState>({
    siteKey: null,
    domain,
    createdAt: null,
  });
  const [trackingKeyLoading, setTrackingKeyLoading] = useState(true);
  const [trackingKeySaving, setTrackingKeySaving] = useState(false);
  const [trackingCopying, setTrackingCopying] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [trackingPromptCopying, setTrackingPromptCopying] = useState(false);
  const [trackingPromptCopied, setTrackingPromptCopied] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState(() => normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL || ''));
  const { tier, plan, email } = usePlan();
  const planConfig = PLANS[tier];
  const { monitoredSites } = useDomainContext();

  const billingCycle = plan.includes('annual') ? 'Annual' : plan.includes('monthly') ? 'Monthly' : '';
  // Use production origin when viewing AISO in prod, so copied snippets POST to the right API
  const snippetAppUrl =
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.startsWith('http://localhost')
      ? normalizeAppUrl(window.location.origin)
      : appUrl || 'http://localhost:3000';
  const snippet = trackingKey.siteKey
    ? buildBotTrackingSnippet(trackingRuntime, snippetAppUrl, trackingKey.siteKey)
    : '';

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

  useEffect(() => {
    if (appUrl || typeof window === 'undefined') return;
    setAppUrl(normalizeAppUrl(window.location.origin));
  }, [appUrl]);

  useEffect(() => {
    let active = true;

    async function loadTrackingKey() {
      setTrackingKeyLoading(true);
      setTrackingError(null);
      setTrackingCopied(false);
      setTrackingPromptCopied(false);

      try {
        const res = await fetch(`/api/user/tracking-key?domain=${encodeURIComponent(domain)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load tracking key');
        }

        setTrackingKey({
          siteKey: typeof data.siteKey === 'string' ? data.siteKey : null,
          domain,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
        });
      } catch (error) {
        if (!active) return;
        setTrackingKey({ siteKey: null, domain, createdAt: null });
        setTrackingError(error instanceof Error ? error.message : 'Failed to load tracking key');
      } finally {
        if (active) {
          setTrackingKeyLoading(false);
        }
      }
    }

    void loadTrackingKey();
    return () => { active = false; };
  }, [domain]);

  const handleGenerateTrackingKey = async () => {
    setTrackingKeySaving(true);
    setTrackingError(null);
    setTrackingCopied(false);
    setTrackingPromptCopied(false);

    try {
      const res = await fetch('/api/user/tracking-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate tracking key');
      }

      setTrackingKey({
        siteKey: data.siteKey,
        domain: data.domain || domain,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : 'Failed to generate tracking key');
    } finally {
      setTrackingKeySaving(false);
    }
  };

  const handleCopySnippet = async () => {
    if (!snippet) return;
    setTrackingCopying(true);
    setTrackingError(null);

    try {
      await navigator.clipboard.writeText(snippet);
      setTrackingCopied(true);
      window.setTimeout(() => setTrackingCopied(false), 1800);
    } catch {
      setTrackingError('Copy failed. Your browser blocked clipboard access.');
    } finally {
      setTrackingCopying(false);
    }
  };

  const handleCopyTrackingPrompt = async () => {
    if (!trackingKey.siteKey) return;
    const installPrompt = buildBotTrackingInstallPrompt({
      domain,
      runtime: trackingRuntime,
      appUrl: snippetAppUrl,
      siteKey: trackingKey.siteKey,
    });

    setTrackingPromptCopying(true);
    setTrackingError(null);

    try {
      await navigator.clipboard.writeText(installPrompt);
      setTrackingPromptCopied(true);
      window.setTimeout(() => setTrackingPromptCopied(false), 1800);
    } catch {
      setTrackingError('Copy failed. Your browser blocked clipboard access.');
    } finally {
      setTrackingPromptCopying(false);
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
        <SettingsMetaStrip
          items={[
            {
              label: 'Plan',
              value: planConfig.name,
              tone: tier === 'pro' ? 'primary' : tier === 'starter' ? 'success' : 'default',
            },
            {
              label: 'Billing',
              value: tier === 'free' ? 'Free tier' : billingCycle || 'Monthly',
              tone: tier === 'free' ? 'warning' : 'default',
            },
            {
              label: 'Domains',
              value: `${monitoredSites.length} / ${planConfig.domains}`,
            },
            {
              label: 'Prompts tracked',
              value: `0 / ${planConfig.prompts}`,
            },
          ]}
        />

        <div className="mt-5">
          <SettingsRow
            title="Subscription controls"
            description={
              tier === 'free'
                ? 'Upgrade to unlock more tracked domains, more prompts, and higher monitoring limits.'
                : 'Open the billing portal to update payment details, switch plans, or manage your subscription.'
            }
            action={
              tier === 'free' ? (
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
              )
            }
          />
        </div>
      </DashboardPanel>

      {/* Monitoring & Alerts */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Monitoring"
          title="Monitoring & Alerts"
          description={`Automated scans and email alerts for ${domain}.`}
        />
        <SettingsMetaStrip
          items={[
            {
              label: 'Scan cadence',
              value: tier === 'pro' ? 'Daily' : 'Weekly',
            },
            {
              label: 'Monitoring',
              value: monitoringConnected ? 'Active' : 'Inactive',
              tone: monitoringConnected ? 'success' : 'default',
              valueClassName: monitoringConnected ? undefined : 'text-zinc-300',
            },
            {
              label: 'Alerts',
              value: notificationAlertsOn ? 'Enabled' : 'Muted',
              tone: notificationAlertsOn ? 'primary' : 'default',
              valueClassName: notificationAlertsOn ? undefined : 'text-zinc-300',
            },
          ]}
        />

        <div className="mt-5">
          <SettingsRow
            title="Automated scans"
            description={`Runs ${tier === 'pro' ? 'daily' : 'weekly'} and tracks score changes over time for ${domain}.`}
            action={
              <>
                <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] text-zinc-300">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600'
                    )}
                  />
                  <span>{monitoringConnected ? 'Active' : 'Inactive'}</span>
                </div>
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
              </>
            }
          />

          <SettingsRow
            title="Score change alerts"
            description="Get emailed when your score moves by 2 or more points."
            action={
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
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                    notificationAlertsOn ? 'left-[calc(100%-1.125rem)]' : 'left-0.5'
                  )}
                />
              </button>
            }
          />

          <SettingsRow
            title="Alert email"
            description="Alerts are sent to your login email by default."
            action={
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-200">
                <Mail className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>{email || '—'}</span>
              </div>
            }
          />
        </div>
      </DashboardPanel>

      {/* Bot Tracking */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Tracking"
          title="AI Bot Tracking"
          description="Server-side middleware snippet that detects AI crawler visits and reports them to your dashboard."
        />

        {/* Key info + actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1 text-[12px] font-semibold text-[var(--color-primary)]">
              {domain}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[12px] text-zinc-300">
              {trackingKey.createdAt
                ? `Key issued ${new Date(trackingKey.createdAt).toLocaleDateString()}`
                : 'No key yet'}
            </span>
            {trackingKey.siteKey && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[12px] font-medium text-emerald-300">
                Ready to install
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateTrackingKey}
              disabled={trackingKeySaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {trackingKey.siteKey ? <RefreshCw className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
              {trackingKeySaving ? 'Saving...' : trackingKey.siteKey ? 'Regenerate Key' : 'Generate Key'}
            </button>
            <button
              type="button"
              onClick={handleCopySnippet}
              disabled={!trackingKey.siteKey || trackingCopying}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              {trackingCopied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleCopyTrackingPrompt}
              disabled={!trackingKey.siteKey || trackingPromptCopying}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-2 text-[12px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              {trackingPromptCopied ? 'Copied prompt' : trackingPromptCopying ? 'Copying...' : 'Copy to LLM'}
            </button>
          </div>
        </div>

        {/* Runtime toggle */}
        <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-white/8 bg-[#0f1012] p-1">
          <button
            type="button"
            onClick={() => setTrackingRuntime('next')}
            className={cn(
              'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
              trackingRuntime === 'next'
                ? 'bg-white text-[#09090b]'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Next.js / Vercel
          </button>
          <button
            type="button"
            onClick={() => setTrackingRuntime('express')}
            className={cn(
              'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
              trackingRuntime === 'express'
                ? 'bg-white text-[#09090b]'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Express / Node
          </button>
        </div>

        {/* Code block */}
        <div className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-[#09090b]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
            <p className="text-[12px] font-medium text-zinc-300">
              {trackingRuntime === 'next' ? 'middleware.js' : 'server.js'}
            </p>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              Server-side only
            </span>
          </div>
          <pre className="max-h-[420px] overflow-auto px-4 py-4 text-[12px] leading-6 text-zinc-300">
            <code>
              {trackingKeyLoading
                ? '// Loading tracking key...'
                : trackingKey.siteKey
                  ? snippet
                  : '// Generate a site key to render your snippet.'}
            </code>
          </pre>
        </div>

        {trackingError && (
          <p className="mt-3 text-[12px] text-red-400">{trackingError}</p>
        )}

        {/* How it works — flat numbered list */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">How it works</p>
          <ol className="space-y-2 text-[13px] leading-6 text-zinc-400">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-semibold text-zinc-300">1</span>
              <span>Check <code className="text-zinc-300">User-Agent</code> in server middleware before sending the response.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-semibold text-zinc-300">2</span>
              <span>Post to AISO with your site key — the key resolves the domain server-side, so no spoofable domain field is needed.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-semibold text-zinc-300">3</span>
              <span>Bot visits appear automatically in your AI Crawler Traffic panel.</span>
            </li>
          </ol>
          <p className="text-[12px] leading-5 text-zinc-500">
            Regenerating the key immediately invalidates the previous snippet.
          </p>
        </div>
      </DashboardPanel>

      {/* Account Info */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Account"
          title="Account Info"
          description="Your plan details and usage."
        />
        <SettingsMetaStrip
          items={[
            { label: 'Domain', value: domain },
            { label: 'Email', value: email || '—' },
            {
              label: 'Status',
              value: monitoringConnected ? 'Monitoring active' : 'Monitoring inactive',
              tone: monitoringConnected ? 'success' : 'default',
              valueClassName: monitoringConnected ? undefined : 'text-zinc-300',
            },
            {
              label: 'Plan',
              value: tier === 'free' ? 'Free' : `${planConfig.name} (${billingCycle || 'Monthly'})`,
              tone: tier === 'pro' ? 'primary' : tier === 'starter' ? 'success' : 'default',
            },
          ]}
        />

        <div className="mt-5">
          <SettingsRow
            title="Workspace domain"
            description="This is the current domain context for the settings on this page."
            action={<span className="text-[12px] font-medium text-white">{domain}</span>}
          />
          <SettingsRow
            title="Account email"
            description="Used for sign-in, billing receipts, and monitoring notifications."
            action={<span className="text-[12px] font-medium text-white">{email || '—'}</span>}
          />
          <SettingsRow
            title="Monitoring status"
            description="Reflects whether automated scans are currently running for this domain."
            action={(
              <span
                className={cn(
                  'text-[12px] font-medium',
                  monitoringConnected ? 'text-[#25c972]' : 'text-zinc-400'
                )}
              >
                {monitoringConnected ? 'Active' : 'Inactive'}
              </span>
            )}
          />
        </div>
      </DashboardPanel>
    </div>
  );
}

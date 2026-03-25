'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Copy, CreditCard, KeyRound, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { isUnlimitedPlanLimit } from '@/lib/account-access-overrides';
import { cn } from '@/lib/utils';
import { buildBotTrackingInstallPrompt, buildBotTrackingSnippet, type BotTrackingRuntime } from '@/lib/llm-prompts';
import { formatRelativeTime } from '@/app/advanced/lib/utils';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
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
  lastUsedAt: string | null;
};

type OpportunityAlertState = {
  opportunityAlertsEnabled: boolean;
  lastOpportunityAlertAt: number | null;
  hydrated: boolean;
};

function normalizeAppUrl(url: string) {
  return url.replace(/\/$/, '');
}

/* ── Minimal row: label left, control right, thin divider ─────────── */
function FieldRow({
  label,
  description,
  value,
  action,
  children,
}: {
  label: string;
  description?: string;
  value?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-zinc-300">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-5 text-zinc-500">{description}</p>
        )}
      </div>
      {value !== undefined && (
        <p className="shrink-0 text-[13px] font-medium text-white">{value}</p>
      )}
      {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
      {children && <div className="mt-2 w-full sm:mt-0">{children}</div>}
    </div>
  );
}

/* ── Section card: very subtle bg, thin border, rounded ───────────── */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]', className)}>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-[#25c972]/40 bg-[#25c972]/20'
          : 'border-white/[0.08] bg-white/[0.06]'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export function SettingsSection({
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
  onDisableMonitoring,
}: SettingsSectionProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [trackingRuntime, setTrackingRuntime] = useState<BotTrackingRuntime>('next');
  const [trackingKey, setTrackingKey] = useState<TrackingKeyState>({
    siteKey: null,
    domain,
    createdAt: null,
    lastUsedAt: null,
  });
  const [trackingKeyLoading, setTrackingKeyLoading] = useState(true);
  const [trackingKeySaving, setTrackingKeySaving] = useState(false);
  const [trackingCopying, setTrackingCopying] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [trackingPromptCopying, setTrackingPromptCopying] = useState(false);
  const [trackingPromptCopied, setTrackingPromptCopied] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [opportunityAlertState, setOpportunityAlertState] = useState<OpportunityAlertState>({
    opportunityAlertsEnabled: true,
    lastOpportunityAlertAt: null,
    hydrated: false,
  });
  const [opportunityAlertSaving, setOpportunityAlertSaving] = useState(false);
  const [opportunityAlertError, setOpportunityAlertError] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState(() => normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL || ''));
  const { tier, plan, email, maxDomains, maxPrompts } = usePlan();
  const { user } = useAuth();
  const planConfig = PLANS[tier];
  const { monitoredSites } = useDomainContext();
  const displayEmail = user?.email ?? email;

  const billingCycle = plan.includes('annual') ? 'Annual' : plan.includes('monthly') ? 'Monthly' : '';
  const trackedDomainsValue = isUnlimitedPlanLimit(maxDomains)
    ? `${monitoredSites.length} / Unlimited`
    : `${monitoredSites.length} / ${maxDomains}`;
  const trackedPromptsValue = isUnlimitedPlanLimit(maxPrompts)
    ? '-- / Unlimited'
    : `-- / ${maxPrompts}`;
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
          lastUsedAt: typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null,
        });
      } catch (error) {
        if (!active) return;
        setTrackingKey({ siteKey: null, domain, createdAt: null, lastUsedAt: null });
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

  useEffect(() => {
    let active = true;

    async function loadOpportunityAlertState() {
      setOpportunityAlertError(null);
      setOpportunityAlertState((prev) => ({ ...prev, hydrated: false }));

      if (!monitoringConnected) {
        setOpportunityAlertState({
          opportunityAlertsEnabled: true,
          lastOpportunityAlertAt: null,
          hydrated: true,
        });
        return;
      }

      try {
        const res = await fetch('/api/monitoring');
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load monitoring settings');
        }

        const record = Array.isArray(data.domains)
          ? data.domains.find((entry: { domain: string }) => entry.domain === domain)
          : null;

        setOpportunityAlertState({
          opportunityAlertsEnabled: typeof record?.opportunityAlertsEnabled === 'boolean' ? record.opportunityAlertsEnabled : true,
          lastOpportunityAlertAt: typeof record?.lastOpportunityAlertAt === 'number' ? record.lastOpportunityAlertAt : null,
          hydrated: true,
        });
      } catch (error) {
        if (!active) return;
        setOpportunityAlertState({
          opportunityAlertsEnabled: true,
          lastOpportunityAlertAt: null,
          hydrated: true,
        });
        setOpportunityAlertError(error instanceof Error ? error.message : 'Failed to load monitoring settings');
      }
    }

    void loadOpportunityAlertState();
    return () => { active = false; };
  }, [domain, monitoringConnected]);

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
        lastUsedAt: typeof data.lastUsedAt === 'string' ? data.lastUsedAt : null,
      });
      localStorage.setItem('aiso_onboarding_tracking_installed', '1');
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

  const handleToggleOpportunityAlerts = async () => {
    if (!monitoringConnected || opportunityAlertSaving) return;

    const previous = opportunityAlertState.opportunityAlertsEnabled;
    const next = !previous;

    setOpportunityAlertSaving(true);
    setOpportunityAlertError(null);
    setOpportunityAlertState((state) => ({
      ...state,
      opportunityAlertsEnabled: next,
    }));

    try {
      const res = await fetch(`/api/monitoring/${encodeURIComponent(domain)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityAlertsEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update opportunity alerts');
      }

      setOpportunityAlertState({
        opportunityAlertsEnabled: typeof data.opportunityAlertsEnabled === 'boolean' ? data.opportunityAlertsEnabled : next,
        lastOpportunityAlertAt: typeof data.lastOpportunityAlertAt === 'number' ? data.lastOpportunityAlertAt : null,
        hydrated: true,
      });
    } catch (error) {
      setOpportunityAlertState((state) => ({
        ...state,
        opportunityAlertsEnabled: previous,
        hydrated: true,
      }));
      setOpportunityAlertError(error instanceof Error ? error.message : 'Failed to update opportunity alerts');
    } finally {
      setOpportunityAlertSaving(false);
    }
  };

  /* ── Shared button styles ──────────────────────────────────────── */
  const btnBase = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium transition-colors disabled:opacity-50';
  const btnPrimary = cn(btnBase, 'bg-white/[0.08] text-zinc-200 hover:bg-white/[0.12]');
  const btnAccent = cn(btnBase, 'bg-[var(--color-primary)] text-white hover:opacity-90');

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-12">
      {/* ─── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-white">Settings</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Manage workspace preferences for <span className="text-zinc-400">{domain}</span>
        </p>
      </div>

      {/* ─── Plan & Billing ──────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Plan & Billing</h2>
        <p className="mt-1 text-[12px] text-zinc-500">Your current subscription and usage limits.</p>

        <Card className="mt-4">
          <FieldRow label="Current plan" value={planConfig.name} />
          <FieldRow
            label="Billing cycle"
            value={tier === 'free' ? 'Free tier' : billingCycle || 'Monthly'}
          />
          <FieldRow
            label="Tracked domains"
            value={trackedDomainsValue}
          />
          <FieldRow
            label="Prompts tracked"
            value={trackedPromptsValue}
          />

          {/* Action row */}
          <div className="flex items-center gap-3 px-5 py-4">
            {tier === 'free' ? (
              <Link href="/pricing" className={btnPrimary}>
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade Plan
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenBillingPortal}
                  disabled={portalLoading}
                  className={btnPrimary}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel your plan? You\'ll lose access to advanced features at the end of your billing period.')) {
                      handleOpenBillingPortal();
                    }
                  }}
                  disabled={portalLoading}
                  className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  Cancel Plan
                </button>
              </>
            )}
          </div>
        </Card>
      </section>

      {/* ─── Monitoring & Alerts ─────────────────────────────────── */}
      <section id="monitoring" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">Monitoring</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Automated scans and email alerts for {domain}.
        </p>

        <Card className="mt-4">
          <FieldRow
            label="Automated scans"
            description={`Runs ${tier === 'pro' ? 'daily' : 'weekly'} and tracks score changes over time.`}
            action={
              <>
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600'
                  )}
                />
                <span className="text-[12px] text-zinc-400">
                  {monitoringConnected ? 'Active' : 'Inactive'}
                </span>
                {monitoringConnected ? (
                  <button
                    type="button"
                    onClick={onDisableMonitoring}
                    disabled={monitoringLoading}
                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    {monitoringLoading ? 'Disabling...' : 'Disable'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onEnableMonitoring}
                    disabled={monitoringLoading}
                    className={cn(btnAccent, 'px-3 py-1.5 text-[11px]')}
                  >
                    {monitoringLoading ? 'Enabling...' : 'Enable'}
                  </button>
                )}
              </>
            }
          />

          <FieldRow
            label="AI opportunity alerts"
            description="Email me when AI engines are crawling my site but not sending visitors yet."
            action={
              <>
                <span className="text-[12px] text-zinc-400">
                  {opportunityAlertState.opportunityAlertsEnabled ? 'On' : 'Off'}
                </span>
                <ToggleSwitch
                  checked={opportunityAlertState.opportunityAlertsEnabled}
                  disabled={!monitoringConnected || opportunityAlertSaving || !opportunityAlertState.hydrated}
                  onToggle={handleToggleOpportunityAlerts}
                />
              </>
            }
          >
            {!monitoringConnected ? (
              <p className="text-[12px] text-zinc-600">
                Enable automated scans for this domain to turn opportunity alerts on.
              </p>
            ) : opportunityAlertError ? (
              <p className="text-[12px] text-red-400">{opportunityAlertError}</p>
            ) : opportunityAlertState.lastOpportunityAlertAt ? (
              <p className="text-[12px] text-zinc-600">
                Last opportunity email sent {formatRelativeTime(opportunityAlertState.lastOpportunityAlertAt)}.
              </p>
            ) : (
              <p className="text-[12px] text-zinc-600">
                Alerts are sent to your login email when crawler attention is high and referrals are still low.
              </p>
            )}
          </FieldRow>

          <FieldRow
            label="Alert email"
            description="Alerts are sent to your login email."
            action={
              <span className="flex items-center gap-2 text-[13px] text-zinc-300">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                {displayEmail || '—'}
              </span>
            }
          />
        </Card>
      </section>

      {/* ─── AI Bot Tracking ─────────────────────────────────────── */}
      <section id="tracking" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">AI Bot Tracking</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Server-side middleware that detects AI crawler visits and reports them to your dashboard.
        </p>

        <Card className="mt-4">
          {/* Key status row */}
          <FieldRow
            label="Site key"
            description={
              !trackingKey.siteKey
                ? 'No key generated yet'
                : [
                    trackingKey.createdAt
                      ? `Issued ${new Date(trackingKey.createdAt).toLocaleDateString()}`
                      : null,
                    trackingKey.lastUsedAt
                      ? `Last signal from your site: ${formatRelativeTime(new Date(trackingKey.lastUsedAt).getTime())}`
                      : 'No signals from your live site yet — deploy the snippet on production, then visits will update this.',
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            action={
              <button
                type="button"
                onClick={handleGenerateTrackingKey}
                disabled={trackingKeySaving}
                className={cn(btnAccent, 'py-1.5 text-[11px]')}
              >
                {trackingKey.siteKey ? <RefreshCw className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
                {trackingKeySaving ? 'Saving...' : trackingKey.siteKey ? 'Regenerate' : 'Generate Key'}
              </button>
            }
          />

          {/* Runtime toggle + code block */}
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                <button
                  type="button"
                  onClick={() => setTrackingRuntime('next')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                    trackingRuntime === 'next'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Next.js
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingRuntime('express')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                    trackingRuntime === 'express'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Express
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  disabled={!trackingKey.siteKey || trackingCopying}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy className="h-3 w-3" />
                  {trackingCopied ? 'Copied' : 'Copy snippet'}
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={handleCopyTrackingPrompt}
                  disabled={!trackingKey.siteKey || trackingPromptCopying}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy className="h-3 w-3" />
                  {trackingPromptCopied ? 'Copied' : 'Copy to LLM'}
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.06] bg-[#09090b]">
              <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2">
                <p className="text-[11px] font-medium text-zinc-500">
                  {trackingRuntime === 'next' ? 'middleware.js' : 'server.js'}
                </p>
                <span className="text-[10px] text-zinc-600">server-side</span>
              </div>
              <pre className="max-h-[380px] overflow-auto px-4 py-3 text-[12px] leading-6 text-zinc-400">
                <code>
                  {trackingKeyLoading
                    ? '// Loading tracking key...'
                    : trackingKey.siteKey
                      ? snippet
                      : '// Generate a site key to see your snippet.'}
                </code>
              </pre>
            </div>

            {trackingError && (
              <p className="mt-2 text-[12px] text-red-400">{trackingError}</p>
            )}
          </div>

          {/* How it works — minimal */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">How it works</p>
            <ol className="mt-2.5 space-y-1.5 text-[12px] leading-5 text-zinc-500">
              <li>1. Checks <code className="text-zinc-400">User-Agent</code> for AI bots and <code className="text-zinc-400">Referer</code> for AI engine click-throughs.</li>
              <li>2. Posts to AISO with your site key — domain is resolved server-side.</li>
              <li>3. Bot visits appear in AI Crawler Traffic; human referrals appear in AI Referral Traffic.</li>
            </ol>
            <p className="mt-2 text-[11px] text-zinc-600">
              Regenerating the key invalidates the previous snippet.
            </p>
          </div>
        </Card>
      </section>

      {/* ─── Account ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Account</h2>
        <p className="mt-1 text-[12px] text-zinc-500">Your account details.</p>

        <Card className="mt-4">
          <FieldRow label="Email" value={displayEmail || '—'} />
          <FieldRow label="Workspace domain" value={domain} />
          <FieldRow
            label="Monitoring status"
            value={
              <span className={cn('flex items-center gap-2', monitoringConnected ? 'text-[#25c972]' : 'text-zinc-500')}>
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600')} />
                {monitoringConnected ? 'Active' : 'Inactive'}
              </span>
            }
          />
        </Card>
      </section>
    </div>
  );
}

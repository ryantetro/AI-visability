'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, KeyRound, Loader2, Lock, Mail, MessageSquare, RefreshCw, Trash2, UserMinus, UserPlus, Users, Zap } from 'lucide-react';
import { isUnlimitedPlanLimit } from '@/lib/account-access-overrides';
import { cn } from '@/lib/utils';
import { buildBotTrackingInstallPrompt, buildBotTrackingSnippet, type BotTrackingRuntime } from '@/lib/llm-prompts';
import { formatRelativeTime, formatShortDate } from '@/app/advanced/lib/utils';
import { usePlan } from '@/hooks/use-plan';
import { invalidateBillingStatus, useBillingStatus } from '@/hooks/use-billing-status';
import { useAuth } from '@/hooks/use-auth';
import {
  AI_PLATFORMS,
  PAYMENT_PLAN_IDS,
  PLANS,
  PLATFORM_LABELS,
  TIER_LEVEL,
  canAccess,
  getPlanDisplayName,
  isPaymentPlanString,
  planStringToTier,
  type AIPlatform,
  type PaymentPlanString,
  type PlanTier,
} from '@/lib/pricing';
import { useTeam } from '@/hooks/use-team';
import { invalidatePlanCache } from '@/hooks/use-plan';
import { REGIONS } from '@/lib/region-gating';
import { useDomainContext } from '@/contexts/domain-context';
import { buildLoginHref, getCurrentAppPath } from '@/lib/app-paths';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type {
  BillingConnectionState,
  BillingRecoveryAction,
  LimitIssue,
  PlanChangePreviewResponse,
} from '@/lib/billing';

interface SettingsSectionProps {
  domain: string;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
  onDisableMonitoring: () => void;
  tier?: PlanTier;
  onOpenUnlock?: () => void;
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

const CHANGE_PLAN_OPTIONS: PaymentPlanString[] = [...PAYMENT_PLAN_IDS];

function normalizeAppUrl(url: string) {
  return url.replace(/\/$/, '');
}

function parseIsoTimestamp(value?: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatRemainingAccess(timestamp?: number | null) {
  if (!timestamp) return null;

  const diffMs = timestamp - Date.now();
  const diffDays = Math.ceil(diffMs / 86400000);

  if (diffDays <= 0) return 'Ends today';
  if (diffDays === 1) return '1 day left';
  if (diffDays < 45) return `${diffDays} days left`;

  const diffMonths = Math.round(diffDays / 30);
  return diffMonths <= 1 ? 'About 1 month left' : `About ${diffMonths} months left`;
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildIssueKey(issue: LimitIssue) {
  return `${issue.category}:${issue.memberUserId ?? 'shared'}:${issue.domain ?? 'global'}`;
}

function uniqueIssues(issues: LimitIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = buildIssueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getBillingAutoRepairStorageKey(ownerId: string) {
  return `aiso:billing-auto-repair:${ownerId}`;
}

/** Convert a 2-letter country code to its flag emoji */
function regionFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
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
  tier: _tierProp,
  onOpenUnlock,
}: SettingsSectionProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [stripePlanRedirectLoading, setStripePlanRedirectLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingRepairing, setBillingRepairing] = useState(false);
  const [billingRecoveryOverride, setBillingRecoveryOverride] = useState<{
    state: BillingConnectionState;
    message: string | null;
    action: BillingRecoveryAction;
  } | null>(null);
  const [cancelPlanModalOpen, setCancelPlanModalOpen] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [changePlanError, setChangePlanError] = useState<string | null>(null);
  const [changePlanSuccess, setChangePlanSuccess] = useState<string | null>(null);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState<PaymentPlanString | null>(null);
  const [changePlanPreview, setChangePlanPreview] = useState<PlanChangePreviewResponse | null>(null);
  const previewCacheRef = useRef<Record<string, PlanChangePreviewResponse>>({});
  const previewAbortRef = useRef<AbortController | null>(null);
  const [memberPrioritySaving, setMemberPrioritySaving] = useState<string | null>(null);
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
  const [selectedPlatforms, setSelectedPlatforms] = useState<AIPlatform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [platformsSaving, setPlatformsSaving] = useState(false);
  const [platformsError, setPlatformsError] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us-en']);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsSaving, setRegionsSaving] = useState(false);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [trimExpanded, setTrimExpanded] = useState(false);
  const {
    tier,
    plan,
    email,
    maxDomains,
    maxPrompts,
    maxPlatforms,
    maxRegions,
    maxSeats,
    teamId,
    planExpiresAt,
    planCancelAtPeriodEnd,
    refresh: refreshPlan,
  } = usePlan();
  const { user } = useAuth();
  const planConfig = PLANS[tier];
  const [changePlanCycle, setChangePlanCycle] = useState<'monthly' | 'annual'>(plan.includes('annual') ? 'annual' : 'monthly');
  const teamData = useTeam();
  const billingStatus = useBillingStatus();
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamCreating, setTeamCreating] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [memberRemoving, setMemberRemoving] = useState<string | null>(null);
  const [invitationRevoking, setInvitationRevoking] = useState<string | null>(null);
  const [teamActionLoading, setTeamActionLoading] = useState(false);

  const hasMultiSeat = canAccess(tier, 'pro');
  const pendingChange = billingStatus.status?.pendingChange ?? null;
  const canManageBilling = billingStatus.status?.canManageBilling ?? tier !== 'free';
  const billingConnectionState = billingRecoveryOverride?.state ?? billingStatus.status?.billingConnectionState ?? (tier === 'free' ? 'free' : 'healthy');
  const billingManagementMode = billingStatus.status?.billingManagementMode ?? (tier === 'free' ? 'none' : 'stripe');
  const billingRecoveryMessage = billingRecoveryOverride?.message ?? billingStatus.status?.recoveryMessage ?? null;
  const billingRecoveryAction = billingRecoveryOverride?.action ?? billingStatus.status?.recoveryAction ?? null;
  const canSelfServeBilling = billingStatus.status?.canSelfServeBilling ?? canManageBilling;
  const activeReadiness = billingStatus.status?.activeReadiness ?? null;
  const readiness = billingStatus.status?.readiness ?? null;
  const billingCurrentPlan = billingStatus.status?.currentPlan ?? plan;
  const billingCurrentTier = billingStatus.status?.currentTier ?? tier;
  const billingPlanConfig = PLANS[billingCurrentTier];
  const readinessIssues = readiness ? uniqueIssues(readiness.issues) : [];
  const viewerReadinessIssues = readiness ? uniqueIssues(readiness.viewerIssues) : [];
  const viewerOverageIssues = billingStatus.status ? uniqueIssues(billingStatus.status.overageIssues) : [];
  const activeIssues = activeReadiness ? uniqueIssues(activeReadiness.issues) : [];
  const visibleBillingIssues = canManageBilling ? readinessIssues : viewerReadinessIssues;
  const currentPlanOptions = useMemo(() => (
    CHANGE_PLAN_OPTIONS
  ), []);
  const defaultTargetPlan = useMemo(() => {
    if (pendingChange?.targetPlan) {
      return pendingChange.targetPlan;
    }

    const currentCycle = billingCurrentPlan.includes('annual') ? 'annual' : 'monthly';
    const alternateCycle = currentCycle === 'annual' ? 'monthly' : 'annual';
    const sameTierCycleSwitch = currentPlanOptions.find((planId) => (
      planId !== billingCurrentPlan
      && planStringToTier(planId) === billingCurrentTier
      && planId.includes(alternateCycle)
    ));
    if (sameTierCycleSwitch) return sameTierCycleSwitch;

    // Pick the first plan of a different tier, matching the current billing cycle
    const differentTierPlan = currentPlanOptions.find((planId) => {
      const t = planStringToTier(planId);
      return t !== billingCurrentTier && t !== 'free' && planId.includes(currentCycle);
    });
    if (differentTierPlan) return differentTierPlan;

    // Fallback: any plan of a different tier
    return (currentPlanOptions.find((planId) => {
      const t = planStringToTier(planId);
      return t !== billingCurrentTier && t !== 'free';
    }) ?? null) as PaymentPlanString | null;
  }, [billingCurrentPlan, billingCurrentTier, currentPlanOptions, pendingChange?.targetPlan]);

  const handleCreateTeam = async () => {
    if (!teamNameInput.trim()) return;
    setTeamCreating(true);
    setTeamError(null);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamNameInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create team');
      setTeamNameInput('');
      invalidatePlanCache();
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setTeamCreating(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
      setInviteEmail('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviteSending(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the team?')) return;
    setTeamError(null);
    setMemberRemoving(userId);
    try {
      const res = await fetch(`/api/teams/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setMemberRemoving(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setTeamError(null);
    setInvitationRevoking(invitationId);
    try {
      const res = await fetch(`/api/teams/invite/${encodeURIComponent(invitationId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to revoke invitation');
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    } finally {
      setInvitationRevoking(null);
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Leave this team? You will lose access to shared domains and data.')) return;
    setTeamError(null);
    setTeamActionLoading(true);
    try {
      const res = await fetch('/api/teams/leave', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to leave team');
      invalidatePlanCache();
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to leave team');
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleDissolveTeam = async () => {
    if (!window.confirm('Dissolve this team? All members will be removed and team data will be deleted. This cannot be undone.')) return;
    setTeamError(null);
    setTeamActionLoading(true);
    try {
      const res = await fetch('/api/teams/dissolve', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to dissolve team');
      invalidatePlanCache();
      invalidateBillingStatus();
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to dissolve team');
    } finally {
      setTeamActionLoading(false);
    }
  };
  const { monitoredSites, handleUnlockComplete } = useDomainContext();
  const displayEmail = user?.email ?? email;

  /* ── Admin feedback viewer state ──────────────────────────── */
  const [feedbackItems, setFeedbackItems] = useState<{
    id: string;
    user_email: string;
    user_name: string | null;
    category: string;
    message: string;
    page_url: string | null;
    created_at: string;
  }[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);

  const activePromptMetric = activeReadiness?.metrics.find((metric) => metric.category === 'prompts') ?? null;
  const activeDomainMetric = activeReadiness?.metrics.find((metric) => metric.category === 'domains') ?? null;
  const billingOwnerEmail = billingStatus.status?.billingOwner.email ?? null;
  const pendingEffectiveTimestamp = parseIsoTimestamp(pendingChange?.effectiveAt ?? null);
  const pendingEffectiveLabel = formatShortDate(pendingEffectiveTimestamp);
  const pendingRemainingLabel = formatRemainingAccess(pendingEffectiveTimestamp);
  const changeTargetIsSamePlan = selectedTargetPlan === billingCurrentPlan;
  const stripeHostedPlanChange = Boolean(changePlanPreview?.change.canUseStripe);
  const selectedTargetTier = selectedTargetPlan ? planStringToTier(selectedTargetPlan) : null;
  const selectedTargetIsDowngrade = Boolean(
    selectedTargetTier
      && selectedTargetTier !== billingCurrentTier
      && canAccess(billingCurrentTier, selectedTargetTier),
  );
  const seatPriorityMembers = teamData.members.filter((member) => member.role !== 'owner');
  const seatPriorityIssues = (pendingChange ? visibleBillingIssues : (canManageBilling ? activeIssues : viewerOverageIssues))
    .filter((issue) => issue.category === 'seats' || issue.category === 'pending_invites');

  const billingCycle = billingCurrentPlan.includes('annual') ? 'Annual' : billingCurrentPlan.includes('monthly') ? 'Monthly' : '';
  const effectivePlanExpiresAt = billingStatus.status?.currentPeriodEnd ?? planExpiresAt;
  const effectiveCancelAtPeriodEnd = billingStatus.status?.cancelAtPeriodEnd ?? planCancelAtPeriodEnd;
  const planExpiresAtTimestamp = parseIsoTimestamp(effectivePlanExpiresAt);
  const accessEndsOnLabel = formatShortDate(planExpiresAtTimestamp);
  const remainingAccessLabel = formatRemainingAccess(planExpiresAtTimestamp);
  const hasScheduledCancellation = billingCurrentTier !== 'free' && effectiveCancelAtPeriodEnd;
  const showBillingRecoveryCard = billingRepairing || (billingConnectionState !== 'healthy' && billingConnectionState !== 'free');
  const showCustomBillingCard = !billingRepairing
    && billingManagementMode === 'custom'
    && billingCurrentTier !== 'free'
    && Boolean(billingRecoveryMessage);
  const billingActionsBlocked = billingCurrentTier !== 'free' && (!canSelfServeBilling || billingRepairing || billingConnectionState === 'unrecoverable');
  const trackedDomainsCurrent = activeDomainMetric?.current ?? monitoredSites.length;
  const trackedDomainsValue = isUnlimitedPlanLimit(maxDomains)
    ? `${trackedDomainsCurrent} / Unlimited`
    : `${trackedDomainsCurrent} / ${maxDomains}`;
  const trackedPromptsValue = activePromptMetric
    ? `${activePromptMetric.current} / ${isUnlimitedPlanLimit(maxPrompts) ? 'Unlimited' : maxPrompts}`
    : isUnlimitedPlanLimit(maxPrompts)
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

  const handleReconnectBilling = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent ?? false;

    setBillingRepairing(true);
    setBillingRecoveryOverride({
      state: 'repairing',
      message: 'We’re reconnecting your Stripe billing record now.',
      action: null,
    });
    if (!silent) {
      setBillingError(null);
      setChangePlanError(null);
      setChangePlanSuccess(null);
    }

    try {
      const res = await fetch('/api/billing/reconcile', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reconnect billing');
      }

      const [status] = await Promise.all([billingStatus.refresh(), refreshPlan(), teamData.refresh()]);
      const nextConnectionState = status?.billingConnectionState ?? (data.billingConnectionState as BillingConnectionState | undefined);
      const nextRecoveryMessage = typeof status?.recoveryMessage === 'string'
        ? status.recoveryMessage
        : (typeof data.recoveryMessage === 'string' ? data.recoveryMessage : null);
      const nextRecoveryAction = (status?.recoveryAction
        ?? (typeof data.recoveryAction === 'string' ? data.recoveryAction : null)) as BillingRecoveryAction;

      if (nextConnectionState && nextConnectionState !== 'healthy' && nextConnectionState !== 'free') {
        setBillingRecoveryOverride({
          state: nextConnectionState,
          message: nextRecoveryMessage ?? 'Billing changes are temporarily unavailable for this workspace.',
          action: nextRecoveryAction,
        });
      } else {
        setBillingRecoveryOverride(null);
      }

      if ((status?.billingConnectionState === 'healthy' || status?.billingConnectionState === 'free' || data.ok) && !silent) {
        setChangePlanSuccess('Billing reconnected successfully.');
      }

      return Boolean(status?.billingConnectionState === 'healthy' || status?.billingConnectionState === 'free' || data.ok);
    } catch (error) {
      if (!silent) {
        setBillingError(error instanceof Error ? error.message : 'We couldn’t reconnect billing right now.');
      }
      setBillingRecoveryOverride({
        state: 'unrecoverable',
        message: 'We couldn’t reconnect an active Stripe subscription for this workspace. Billing changes are temporarily unavailable until this record is reviewed.',
        action: 'contact_support',
      });
      return false;
    } finally {
      setBillingRepairing(false);
    }
  }, [billingStatus, refreshPlan, teamData]);

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    setBillingError(null);
    try {
      const returnPath = getCurrentAppPath('/settings');
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath }),
      });
      if (res.status === 401) {
        window.location.href = buildLoginHref(returnPath);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'repair_required') {
          setBillingRecoveryOverride({
            state: (data.billingConnectionState ?? 'repairable') as BillingConnectionState,
            message: typeof data.recoveryMessage === 'string' ? data.recoveryMessage : data.error || 'Billing needs attention before Stripe can open.',
            action: (typeof data.recoveryAction === 'string' ? data.recoveryAction : null) as BillingRecoveryAction,
          });
          return;
        }
        throw new Error(data.error || 'Failed to open billing portal');
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error('Billing portal session did not include a redirect URL.');
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to open billing portal right now.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleConfirmCancelPlan = async () => {
    setCancelPlanModalOpen(false);
    await handleOpenBillingPortal();
  };

  const handleReactivatePlan = async () => {
    setReactivateLoading(true);
    setBillingError(null);
    setChangePlanSuccess(null);
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'repair_required') {
          setBillingRecoveryOverride({
            state: (data.billingConnectionState ?? 'repairable') as BillingConnectionState,
            message: typeof data.recoveryMessage === 'string' ? data.recoveryMessage : data.error || 'Billing needs attention before this plan can be reactivated.',
            action: (typeof data.recoveryAction === 'string' ? data.recoveryAction : null) as BillingRecoveryAction,
          });
          return;
        }
        throw new Error(data.error || 'Failed to reactivate this subscription');
      }

      setChangePlanSuccess('Your current plan will keep renewing automatically again.');
      invalidatePlanCache();
      invalidateBillingStatus();
      await Promise.all([billingStatus.refresh(), teamData.refresh()]);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Failed to reactivate this subscription');
    } finally {
      setReactivateLoading(false);
    }
  };

  const syncStripeHostedPlanChange = useCallback(async (targetPlan: PaymentPlanString) => {
    setChangePlanModalOpen(false);
    setChangePlanError(null);
    setBillingError(null);
    setChangePlanSuccess(`Stripe confirmed your request. Syncing ${getPlanDisplayName(targetPlan)} in the dashboard...`);

    invalidatePlanCache();
    invalidateBillingStatus();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const [status] = await Promise.all([
        billingStatus.refresh(),
        refreshPlan(),
        teamData.refresh(),
      ]);

      if (status?.currentPlan === targetPlan) {
        setChangePlanSuccess(`${getPlanDisplayName(targetPlan)} is now active.`);
        return;
      }

      if (attempt < 3) {
        await wait(1200);
      }
    }

    setChangePlanSuccess(`Stripe accepted the change to ${getPlanDisplayName(targetPlan)}. The dashboard may take a few more seconds to reflect it.`);
  }, [billingStatus, refreshPlan, teamData]);

  const handleContinuePlanChangeInStripe = async () => {
    if (!selectedTargetPlan) return;

    setStripePlanRedirectLoading(true);
    setChangePlanError(null);
    setBillingError(null);
    setChangePlanSuccess(null);

    try {
      const returnPath = getCurrentAppPath('/settings');
      const res = await fetch('/api/billing/change-plan/stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan: selectedTargetPlan, returnPath }),
      });
      if (res.status === 401) {
        window.location.href = buildLoginHref(returnPath);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'repair_required') {
          setBillingRecoveryOverride({
            state: (data.billingConnectionState ?? 'repairable') as BillingConnectionState,
            message: typeof data.recoveryMessage === 'string' ? data.recoveryMessage : data.error || 'Billing needs attention before Stripe can open this plan change.',
            action: (typeof data.recoveryAction === 'string' ? data.recoveryAction : null) as BillingRecoveryAction,
          });
          return;
        }
        throw new Error(data.error || 'Failed to open Stripe for this plan change');
      }
      if (typeof data.url === 'string' && data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error('Stripe did not return a hosted change-plan URL.');
    } catch (error) {
      setChangePlanError(error instanceof Error ? error.message : 'Failed to open Stripe for this plan change');
    } finally {
      setStripePlanRedirectLoading(false);
    }
  };

  const handlePreviewPlanChange = useCallback(async (targetPlan: PaymentPlanString) => {
    // Abort any in-flight preview request
    if (previewAbortRef.current) previewAbortRef.current.abort();

    setSelectedTargetPlan(targetPlan);
    setChangePlanError(null);

    // Serve from cache instantly
    const cached = previewCacheRef.current[targetPlan];
    if (cached) {
      setChangePlanPreview(cached);
      return;
    }

    setPreviewLoading(true);
    setChangePlanPreview(null);
    const controller = new AbortController();
    previewAbortRef.current = controller;
    try {
      const res = await fetch('/api/billing/change-plan/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'repair_required') {
          setBillingRecoveryOverride({
            state: (data.billingConnectionState ?? 'repairable') as BillingConnectionState,
            message: typeof data.recoveryMessage === 'string' ? data.recoveryMessage : data.error || 'Billing needs attention before previewing this plan change.',
            action: (typeof data.recoveryAction === 'string' ? data.recoveryAction : null) as BillingRecoveryAction,
          });
          setChangePlanPreview(null);
          setChangePlanError(null);
          return;
        }
        throw new Error(data.error || 'Failed to preview this plan change');
      }
      const snapshot = data as PlanChangePreviewResponse;
      previewCacheRef.current[targetPlan] = snapshot;
      // Only apply if this is still the selected plan (not stale)
      if (previewAbortRef.current === controller) {
        setChangePlanPreview(snapshot);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setChangePlanPreview(null);
      setChangePlanError(error instanceof Error ? error.message : 'Failed to preview this plan change');
    } finally {
      if (previewAbortRef.current === controller) {
        setPreviewLoading(false);
        previewAbortRef.current = null;
      }
    }
  }, []);

  const handleSchedulePlanChange = async () => {
    if (!selectedTargetPlan) return;
    setChangePlanLoading(true);
    setChangePlanError(null);
    setChangePlanSuccess(null);
    try {
      const res = await fetch('/api/billing/change-plan/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan: selectedTargetPlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'repair_required') {
          setBillingRecoveryOverride({
            state: (data.billingConnectionState ?? 'repairable') as BillingConnectionState,
            message: typeof data.recoveryMessage === 'string' ? data.recoveryMessage : data.error || 'Billing needs attention before scheduling this plan change.',
            action: (typeof data.recoveryAction === 'string' ? data.recoveryAction : null) as BillingRecoveryAction,
          });
          setChangePlanError(null);
          return;
        }
        throw new Error(data.error || 'Failed to schedule this plan change');
      }

      setChangePlanSuccess(`Scheduled ${getPlanDisplayName(selectedTargetPlan)} for the next billing period.`);
      invalidateBillingStatus();
      await billingStatus.refresh();
      invalidatePlanCache();
      setChangePlanModalOpen(false);
    } catch (error) {
      setChangePlanError(error instanceof Error ? error.message : 'Failed to schedule this plan change');
    } finally {
      setChangePlanLoading(false);
    }
  };

  const handleCancelScheduledPlanChange = async () => {
    setChangePlanLoading(true);
    setBillingError(null);
    try {
      const res = await fetch('/api/billing/change-plan/cancel', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel the scheduled plan change');
      }
      setChangePlanSuccess('Scheduled plan change canceled.');
      invalidateBillingStatus();
      await billingStatus.refresh();
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Failed to cancel the scheduled plan change');
    } finally {
      setChangePlanLoading(false);
    }
  };

  const handleUpdateMemberPriority = async (userId: string, nextRank: number) => {
    setTeamError(null);
    setMemberPrioritySaving(userId);
    try {
      const res = await fetch(`/api/teams/members/${encodeURIComponent(userId)}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planAccessRank: nextRank }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update member priority');
      await Promise.all([teamData.refresh(), billingStatus.refresh()]);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Failed to update member priority');
    } finally {
      setMemberPrioritySaving(null);
    }
  };

  useEffect(() => {
    if (appUrl || typeof window === 'undefined') return;
    setAppUrl(normalizeAppUrl(window.location.origin));
  }, [appUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (billingConnectionState === 'healthy' || billingConnectionState === 'free') {
      setBillingRecoveryOverride(null);
      return;
    }

    if (!billingStatus.status || !canManageBilling || billingConnectionState !== 'repairable' || billingRepairing) {
      return;
    }

    const ownerId = billingStatus.status.billingOwner.userId;
    const storageKey = getBillingAutoRepairStorageKey(ownerId);
    if (window.sessionStorage.getItem(storageKey) === 'attempted') {
      return;
    }

    window.sessionStorage.setItem(storageKey, 'attempted');
    void handleReconnectBilling({ silent: true });
  }, [billingConnectionState, billingStatus.status, canManageBilling, billingRepairing, handleReconnectBilling]);

  // Modal open/close lifecycle — cleanup on close, auto-select on open
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (!changePlanModalOpen) {
      // Cleanup on close
      if (previewAbortRef.current) {
        previewAbortRef.current.abort();
        previewAbortRef.current = null;
      }
      previewCacheRef.current = {};
      setSelectedTargetPlan(null);
      setChangePlanPreview(null);
      setChangePlanError(null);
      setPreviewLoading(false);
      hasAutoSelectedRef.current = false;
      return;
    }

    // Auto-select once when modal opens — never override user clicks
    if (hasAutoSelectedRef.current) return;
    hasAutoSelectedRef.current = true;

    // Reset billing cycle to match current plan
    const cycle = billingCurrentPlan.includes('annual') ? 'annual' : 'monthly';
    setChangePlanCycle(cycle);

    if (defaultTargetPlan) {
      void handlePreviewPlanChange(defaultTargetPlan);
    }
  }, [billingCurrentPlan, changePlanModalOpen, defaultTargetPlan, handlePreviewPlanChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const billingState = params.get('billing');
    const targetPlanParam = params.get('target_plan');
    if (billingState !== 'plan_updated' || !targetPlanParam || !isPaymentPlanString(targetPlanParam)) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('billing');
    url.searchParams.delete('target_plan');
    window.history.replaceState({}, '', url.toString());

    void syncStripeHostedPlanChange(targetPlanParam);
  }, [syncStripeHostedPlanChange]);

  // Load selected platforms for this domain
  useEffect(() => {
    let active = true;
    async function loadPlatforms() {
      setPlatformsLoading(true);
      try {
        const res = await fetch(`/api/user/domains/platforms?domain=${encodeURIComponent(domain)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (data.selectedPlatforms) {
          setSelectedPlatforms(data.selectedPlatforms);
        } else {
          // Default: first N platforms by priority
          setSelectedPlatforms(AI_PLATFORMS.slice(0, maxPlatforms) as AIPlatform[]);
        }
      } catch {
        if (!active) return;
        setSelectedPlatforms(AI_PLATFORMS.slice(0, maxPlatforms) as AIPlatform[]);
      } finally {
        if (active) setPlatformsLoading(false);
      }
    }
    void loadPlatforms();
    return () => { active = false; };
  }, [domain, maxPlatforms]);

  // Load selected regions for this domain
  useEffect(() => {
    let active = true;
    async function loadRegions() {
      setRegionsLoading(true);
      try {
        const res = await fetch(`/api/user/domains/regions?domain=${encodeURIComponent(domain)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (data.selectedRegions) {
          setSelectedRegions(data.selectedRegions);
        } else {
          setSelectedRegions(['us-en']);
        }
      } catch {
        if (!active) return;
        setSelectedRegions(['us-en']);
      } finally {
        if (active) setRegionsLoading(false);
      }
    }
    void loadRegions();
    return () => { active = false; };
  }, [domain]);

  const handleToggleRegion = async (regionId: string) => {
    const isSelected = selectedRegions.includes(regionId);
    let next: string[];
    if (isSelected) {
      if (selectedRegions.length <= 1) return;
      next = selectedRegions.filter((r) => r !== regionId);
    } else {
      if (selectedRegions.length >= maxRegions) {
        setRegionsError(`Your ${PLANS[tier].name} plan allows up to ${maxRegions} region${maxRegions !== 1 ? 's' : ''}. Upgrade for more.`);
        return;
      }
      next = [...selectedRegions, regionId];
    }
    setSelectedRegions(next);
    setRegionsSaving(true);
    setRegionsError(null);
    try {
      const res = await fetch('/api/user/domains/regions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, regions: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRegionsError(data.error || 'Failed to save region selection');
        setSelectedRegions(selectedRegions);
      }
    } catch {
      setRegionsError('Failed to save region selection');
      setSelectedRegions(selectedRegions);
    } finally {
      setRegionsSaving(false);
    }
  };

  const handleTogglePlatform = async (platform: AIPlatform) => {
    const isSelected = selectedPlatforms.includes(platform);
    let next: AIPlatform[];
    if (isSelected) {
      // Don't allow deselecting the last platform
      if (selectedPlatforms.length <= 1) return;
      next = selectedPlatforms.filter((p) => p !== platform);
    } else {
      if (selectedPlatforms.length >= maxPlatforms) {
        setPlatformsError(`Your ${PLANS[tier].name} plan allows up to ${maxPlatforms} platforms. Upgrade for more.`);
        return;
      }
      next = [...selectedPlatforms, platform];
    }
    setSelectedPlatforms(next);
    setPlatformsSaving(true);
    setPlatformsError(null);
    try {
      const res = await fetch('/api/user/domains/platforms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, platforms: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPlatformsError(data.error || 'Failed to save platform selection');
        // Revert
        setSelectedPlatforms(selectedPlatforms);
      }
    } catch {
      setPlatformsError('Failed to save platform selection');
      setSelectedPlatforms(selectedPlatforms);
    } finally {
      setPlatformsSaving(false);
    }
  };

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

  /* ── Tabs ────────────────────────────────────────────────────── */
  type SettingsTab = 'general' | 'team' | 'monitoring' | 'platforms' | 'feedback';

  const isAdmin = user?.email === 'ryantetro@gmail.com';

  const TABS: { key: SettingsTab; label: string; icon: ReactNode }[] = [
    { key: 'general', label: 'General', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { key: 'team', label: 'Team', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'monitoring', label: 'Monitoring', icon: <Mail className="h-3.5 w-3.5" /> },
    { key: 'platforms', label: 'Platforms', icon: <KeyRound className="h-3.5 w-3.5" /> },
    ...(isAdmin ? [{ key: 'feedback' as const, label: 'Feedback', icon: <MessageSquare className="h-3.5 w-3.5" /> }] : []),
  ];

  const getInitialTab = useCallback((): SettingsTab => {
    if (typeof window === 'undefined') return 'general';
    const hash = window.location.hash.replace('#', '') as SettingsTab;
    if (TABS.some((t) => t.key === hash)) return hash;
    return 'general';
  }, []);

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }, []);

  /* ── Fetch admin feedback ─────────────────────────────────── */
  useEffect(() => {
    if (activeTab !== 'feedback' || !isAdmin || feedbackLoaded) return;

    setFeedbackLoading(true);
    fetch('/api/feedback')
      .then((res) => res.json())
      .then((data) => {
        setFeedbackItems(data.feedback ?? []);
        setFeedbackLoaded(true);
      })
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  }, [activeTab, isAdmin, feedbackLoaded]);

  const isTabLocked = useCallback((minTier: PlanTier) => !canAccess(tier, minTier), [tier]);

  /* ── Shared button styles ──────────────────────────────────────── */
  const btnBase = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium transition-colors disabled:opacity-50';
  const btnPrimary = cn(btnBase, 'bg-white/[0.08] text-zinc-200 hover:bg-white/[0.12]');
  const btnAccent = cn(btnBase, 'bg-[var(--color-primary)] text-white hover:opacity-90');

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* ─── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-white">Settings</h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Manage workspace preferences for <span className="text-zinc-400">{domain}</span>
        </p>
      </div>

      {/* ─── Tab navigation ──────────────────────────────────────── */}
      <nav className="mt-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.015] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Tab content ─────────────────────────────────────────── */}
      <div className="mt-8 space-y-10">

      {/* ─── GENERAL TAB ─────────────────────────────────────────── */}
      {activeTab === 'general' && (
      <>
      {/* ─── Plan & Billing ──────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Plan & Billing</h2>
        <p className="mt-1 text-[12px] text-zinc-500">Your current subscription and usage limits.</p>

        {billingStatus.status?.trimmedAt && !billingStatus.status?.trimBannerDismissed && (
          <div className="mb-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-300" />
                <div>
                  <p className="text-[12px] font-medium text-zinc-200">
                    {billingStatus.status.trimFailed
                      ? "We couldn't fully adjust your workspace. Please review your settings."
                      : 'Your workspace was adjusted to fit your new plan.'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Adjusted on {new Date(billingStatus.status.trimmedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrimExpanded((prev) => !prev)}
                  className="text-[11px] font-medium text-sky-300 transition-colors hover:text-sky-200"
                >
                  {trimExpanded ? 'Hide details' : 'View what changed'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/user/trim-banner', { method: 'PATCH' });
                    await billingStatus.refresh();
                  }}
                  className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
            {trimExpanded && (
              <div className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-zinc-400">
                <p>Your workspace was automatically adjusted to fit your plan limits. Domains may have been hidden, competitors removed, or platforms/regions adjusted.</p>
                <p className="mt-1">Visit your domain and team settings to review the changes.</p>
              </div>
            )}
          </div>
        )}

        {billingStatus.status?.pendingChange && billingStatus.status.pendingChange.targetTier && billingStatus.status.currentTier && TIER_LEVEL[billingStatus.status.pendingChange.targetTier] < TIER_LEVEL[billingStatus.status.currentTier] && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[12px] text-zinc-200">
                Switching to <span className="font-semibold">{billingStatus.status.pendingChange.targetLabel}</span> on{' '}
                {new Date(billingStatus.status.pendingChange.effectiveAt ?? '').toLocaleDateString()}
                {billingStatus.status.readiness.viewerIssues.length > 0 && (
                  <span className="text-zinc-400">
                    {' · '}{billingStatus.status.readiness.viewerIssues.length} auto-adjustment{billingStatus.status.readiness.viewerIssues.length === 1 ? '' : 's'} pending
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChangePlanModalOpen(true)}
              className="text-[11px] font-medium text-amber-300 transition-colors hover:text-amber-200"
            >
              Cancel change
            </button>
          </div>
        )}

        {showBillingRecoveryCard && (
          <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100/80">
                  {billingRepairing
                    ? 'Reconnecting billing'
                    : billingConnectionState === 'unrecoverable'
                      ? 'Billing record needs review'
                      : 'Billing record needs reconnection'}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                  {billingRepairing
                    ? 'We’re reconnecting your Stripe billing record now.'
                    : billingRecoveryMessage ?? 'Billing changes are temporarily unavailable for this workspace.'}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                  {billingConnectionState === 'unrecoverable'
                    ? `Plan changes and Stripe portal actions stay paused for ${billingOwnerEmail ?? 'this workspace'} until the record is reviewed.`
                    : 'Plan changes and Stripe portal actions will unlock automatically as soon as the billing record is healthy again.'}
                </p>
              </div>
              {billingRecoveryAction === 'retry' && (
                <button
                  type="button"
                  onClick={() => void handleReconnectBilling()}
                  disabled={billingRepairing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-black/20 px-4 py-2 text-[12px] font-medium text-amber-100 transition-colors hover:border-amber-200/30 hover:text-white disabled:opacity-50"
                >
                  {billingRepairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {billingRepairing ? 'Reconnecting...' : 'Retry connection'}
                </button>
              )}
            </div>
          </div>
        )}

        {showCustomBillingCard && (
          <div className="mb-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">
                  Custom billing arrangement
                </p>
                <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                  {billingRecoveryMessage}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                  Stripe self-serve billing actions are disabled for this workspace. Reach out internally before changing the plan or billing method.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card className="mt-4">
          <FieldRow label="Current plan" value={planConfig.name} />
          <FieldRow
            label="Billing cycle"
            value={tier === 'free' ? 'Free tier' : billingCycle || 'Monthly'}
          />
          <FieldRow
            label="Billing status"
            description={
              hasScheduledCancellation
                ? accessEndsOnLabel !== '--'
                  ? `Your subscription has been canceled and will stay active until ${accessEndsOnLabel}.`
                  : 'Your subscription has been canceled and will stay active through the end of the current billing period.'
                : tier === 'free'
                  ? 'No active subscription.'
                  : 'Your plan is active and set to renew automatically.'
            }
            value={
              hasScheduledCancellation
                ? 'Canceled, still active'
                : tier === 'free'
                  ? 'No subscription'
                  : 'Active'
            }
          />
          {hasScheduledCancellation && (
            <FieldRow
              label="Access until"
              description="After this date, your workspace will move to the Free plan unless you keep renewal turned on."
              value={accessEndsOnLabel}
            />
          )}
          <FieldRow
            label="Tracked domains"
            value={trackedDomainsValue}
          />
          <FieldRow
            label="Saved prompts"
            description={teamId ? 'Highest saved prompt count for a team member.' : 'Total saved prompts on this account.'}
            value={trackedPromptsValue}
          />
          {hasScheduledCancellation && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="rounded-2xl border border-amber-300/15 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),rgba(255,255,255,0.02)_58%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100/80">Cancellation scheduled</p>
                    <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                      {accessEndsOnLabel !== '--'
                        ? `Your ${planConfig.name} features stay available until ${accessEndsOnLabel}.`
                        : 'Your current plan stays available through the end of this billing period.'}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                      You can still use the dashboard normally until access ends. Use Keep Current Plan below to remove the scheduled cancellation instantly.
                    </p>
                  </div>
                  {remainingAccessLabel && (
                    <div className="inline-flex items-center rounded-full border border-amber-200/15 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-amber-50/90">
                      {remainingAccessLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!canManageBilling && billingOwnerEmail && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="rounded-2xl border border-sky-300/15 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),rgba(255,255,255,0.02)_60%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">Managed by owner</p>
                <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                  Billing for this workspace is managed by <span className="text-white">{billingOwnerEmail}</span>.
                </p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                  You can still see upcoming downgrade requirements here, but only the billing owner can schedule or cancel plan changes.
                </p>
              </div>
            </div>
          )}

          {pendingChange && !hasScheduledCancellation && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="rounded-2xl border border-[#25c972]/20 bg-[radial-gradient(circle_at_top,rgba(37,201,114,0.16),rgba(255,255,255,0.02)_62%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ef0c1]">Plan change scheduled</p>
                    <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                      {pendingChange.targetLabel} is scheduled for {pendingEffectiveLabel !== '--' ? pendingEffectiveLabel : 'your next billing renewal'}.
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                      {readiness?.blockers
                        ? `${readiness.blockers} cleanup item${readiness.blockers === 1 ? '' : 's'} still need attention before the lower plan becomes active.`
                        : 'Your workspace is already aligned with the scheduled plan change.'}
                    </p>
                  </div>
                  {pendingRemainingLabel && (
                    <div className="inline-flex items-center rounded-full border border-[#25c972]/20 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-[#bff5d6]">
                      {pendingRemainingLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(pendingChange || viewerOverageIssues.length > 0) && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {pendingChange ? 'Downgrade readiness' : 'Active cleanup required'}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-zinc-200">
                      {pendingChange
                        ? 'Your workspace will be automatically adjusted when the plan change takes effect.'
                        : 'Some features are limited because this workspace exceeds the current plan limits.'}
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] font-medium text-zinc-200">
                    {pendingChange
                      ? `${visibleBillingIssues.length} issue${visibleBillingIssues.length === 1 ? '' : 's'}`
                      : `${viewerOverageIssues.length} blocker${viewerOverageIssues.length === 1 ? '' : 's'}`}
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {(pendingChange ? visibleBillingIssues : viewerOverageIssues).slice(0, 5).map((issue) => (
                    <a
                      key={buildIssueKey(issue)}
                      href={issue.cleanupHref}
                      className="group flex items-start justify-between rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03]"
                    >
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex h-2 w-2 rounded-full',
                            issue.severity === 'advisory' ? 'bg-amber-300' : 'bg-red-300',
                          )} />
                          <p className="text-[12px] font-medium text-zinc-100">{issue.title}</p>
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-zinc-400">{issue.description}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-white">
                        {issue.cleanupLabel}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Next-tier feature preview */}
          {tier === 'free' && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Unlock with Starter</p>
              <ul className="space-y-1.5 text-[12px] text-zinc-400">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Weekly automated monitoring</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />25 prompt tracking slots</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Brand section &amp; AI referral tracking</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />All fixes + copy-to-LLM</li>
              </ul>
              <button type="button" onClick={() => handleUnlockComplete('starter_monthly')} className={cn(btnAccent, 'mt-3 inline-flex py-2 text-[11px]')}>
                <Zap className="h-3 w-3" />
                Upgrade to Starter — $49/mo
              </button>
            </div>
          )}
          {tier === 'starter' && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Unlock with Pro</p>
              <ul className="space-y-1.5 text-[12px] text-zinc-400">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Up to 3 domains</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Competitor tracking (3 competitors)</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Daily monitoring &amp; data export</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />75 prompts &amp; 4 AI platforms</li>
              </ul>
              <button type="button" onClick={() => handleUnlockComplete('pro_monthly')} className={cn(btnAccent, 'mt-3 inline-flex py-2 text-[11px]')}>
                <Zap className="h-3 w-3" />
                Upgrade to Pro — $99/mo
              </button>
            </div>
          )}
          {tier === 'pro' && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Unlock with Growth</p>
              <ul className="space-y-1.5 text-[12px] text-zinc-400">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Up to 10 domains</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Unlimited platforms, regions &amp; seats</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />Full CSV/JSON export &amp; white-label</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-400/60" />200 prompts &amp; 10 competitors</li>
              </ul>
              <button type="button" onClick={() => handleUnlockComplete('growth_monthly')} className={cn(btnAccent, 'mt-3 inline-flex py-2 text-[11px]')}>
                <Zap className="h-3 w-3" />
                Upgrade to Growth — $249/mo
              </button>
            </div>
          )}
          {tier === 'growth' && (
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[12px] text-[#25c972]">You&apos;re on the Growth plan — full access to all features</p>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-3 px-5 py-4">
            {tier === 'free' ? (
              <button type="button" onClick={() => handleUnlockComplete('starter_monthly')} className={btnPrimary}>
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade Plan
              </button>
            ) : !canManageBilling ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-[11px] font-medium text-sky-100/90">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
                Billing owner only
              </span>
            ) : (
              <>
                {!hasScheduledCancellation && (
                  <button
                    type="button"
                    onClick={() => {
                      setChangePlanError(null);
                      setChangePlanSuccess(null);
                      setChangePlanModalOpen(true);
                    }}
                    disabled={changePlanLoading || stripePlanRedirectLoading || billingActionsBlocked}
                    className={btnPrimary}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {pendingChange ? 'Update Scheduled Change' : 'Change Plan'}
                  </button>
                )}
                  <button
                    type="button"
                    onClick={hasScheduledCancellation ? () => void handleReactivatePlan() : handleOpenBillingPortal}
                    disabled={portalLoading || reactivateLoading || billingActionsBlocked}
                    className={btnPrimary}
                  >
                  <CreditCard className="h-3.5 w-3.5" />
                  {hasScheduledCancellation
                    ? reactivateLoading
                      ? 'Keeping plan...'
                      : 'Keep Current Plan'
                    : portalLoading
                      ? 'Opening...'
                      : 'Billing & Invoices'}
                </button>
                {hasScheduledCancellation && (
                  <button
                    type="button"
                    onClick={handleOpenBillingPortal}
                    disabled={portalLoading || reactivateLoading || billingActionsBlocked}
                    className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
                  >
                    {portalLoading ? 'Opening Stripe...' : 'Billing & Invoices'}
                  </button>
                )}
                {pendingChange && !hasScheduledCancellation ? (
                  <button
                    type="button"
                    onClick={() => void handleCancelScheduledPlanChange()}
                    disabled={changePlanLoading || billingActionsBlocked}
                    className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
                  >
                    {changePlanLoading ? 'Canceling...' : 'Cancel Scheduled Change'}
                  </button>
                ) : hasScheduledCancellation ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-[11px] font-medium text-amber-100/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200" />
                    Cancellation scheduled
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelPlanModalOpen(true)}
                    disabled={portalLoading || billingActionsBlocked}
                    className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    Cancel Plan
                  </button>
                )}
              </>
            )}
          </div>
          {(billingError || billingStatus.error || changePlanSuccess) && (
            <div className="border-t border-white/[0.06] px-5 py-3">
              {billingError && <p className="text-[12px] text-red-400">{billingError}</p>}
              {!billingError && billingStatus.error && <p className="text-[12px] text-red-400">{billingStatus.error}</p>}
              {!billingError && !billingStatus.error && changePlanSuccess && <p className="text-[12px] text-[#25c972]">{changePlanSuccess}</p>}
            </div>
          )}
          {hasScheduledCancellation && !billingError && !billingStatus.error && (
            <div className="border-t border-white/[0.06] px-5 py-3">
              <p className="text-[12px] text-zinc-500">
                Keep Current Plan uses Stripe directly in-app. Stripe Billing is still available for payment methods and invoices.
              </p>
            </div>
          )}
        </Card>
      </section>

      <Sheet open={changePlanModalOpen} onOpenChange={setChangePlanModalOpen}>
        <SheetContent
          side="center"
          showClose={false}
          className="max-h-[calc(100vh-2rem)] max-w-2xl border-white/[0.08] bg-[#0c0c0e] p-0 shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
        >
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <div>
                <SheetTitle className="text-[16px] font-semibold tracking-[-0.01em] text-white">
                  Change plan
                </SheetTitle>
                <SheetDescription className="mt-1 text-[12px] text-zinc-500">
                  Choose a plan below. Simple upgrades continue in Stripe, while downgrades stay here so we can verify limits first.
                </SheetDescription>
              </div>
              <SheetClose
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <span className="text-lg leading-none">&times;</span>
              </SheetClose>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-5">
              {/* Billing cycle toggle */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setChangePlanCycle('monthly');
                      if (selectedTargetPlan?.includes('annual')) {
                        const newPlan = selectedTargetPlan.replace('annual', 'monthly') as PaymentPlanString;
                        void handlePreviewPlanChange(newPlan);
                      }
                    }}
                    className={cn(
                      'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors',
                      changePlanCycle === 'monthly'
                        ? 'bg-white/[0.1] text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePlanCycle('annual');
                      if (selectedTargetPlan?.includes('monthly')) {
                        const newPlan = selectedTargetPlan.replace('monthly', 'annual') as PaymentPlanString;
                        void handlePreviewPlanChange(newPlan);
                      }
                    }}
                    className={cn(
                      'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors',
                      changePlanCycle === 'annual'
                        ? 'bg-white/[0.1] text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    Annual
                    <span className="ml-1.5 rounded-full bg-[#25c972]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#25c972]">
                      Save ~20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {(['starter', 'pro', 'growth'] as const).map((cardTier) => {
                  const cardPlan = PLANS[cardTier];
                  const planId = `${cardTier}_${changePlanCycle}` as PaymentPlanString;
                  const isCurrent = planId === billingCurrentPlan;
                  const isSelected = !isCurrent && selectedTargetPlan === planId;
                  const isDowngrade = !isCurrent && canAccess(billingCurrentTier, cardTier);
                  const monthlyPrice = changePlanCycle === 'annual' && cardPlan.annualPrice > 0
                    ? Math.round(cardPlan.annualPrice / 12)
                    : cardPlan.monthlyPrice;

                  if (!currentPlanOptions.includes(planId)) return null;

                  return (
                    <button
                      key={planId}
                      type="button"
                      onClick={() => { if (!isCurrent) void handlePreviewPlanChange(planId); }}
                      disabled={isCurrent}
                      className={cn(
                        'relative flex flex-col rounded-2xl border p-4 text-left transition-all',
                        isCurrent
                          ? 'border-white/[0.12] bg-white/[0.04] cursor-default opacity-60'
                          : isSelected
                            ? 'border-[#25c972]/40 bg-[#25c972]/[0.08] ring-1 ring-[#25c972]/20 cursor-pointer'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] cursor-pointer'
                      )}
                    >
                      {/* Badge: Current or Selected */}
                      {isCurrent ? (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/[0.12] bg-[#0c0c0e] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                          Your plan
                        </span>
                      ) : isSelected ? (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#25c972] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                          {isDowngrade ? 'Switch to' : 'Upgrade to'}
                        </span>
                      ) : null}

                      <p className={cn('text-[13px] font-semibold', isCurrent ? 'text-zinc-400' : 'text-white')}>{cardPlan.name}</p>

                      <div className="mt-2 flex items-baseline gap-0.5">
                        <span className={cn('text-[22px] font-bold', isCurrent ? 'text-zinc-500' : 'text-white')}>${monthlyPrice}</span>
                        <span className="text-[11px] text-zinc-500">/mo</span>
                      </div>
                      {changePlanCycle === 'annual' && (
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          {formatMoney(cardPlan.annualPrice * 100)}/yr
                        </p>
                      )}

                      <ul className="mt-3 flex-1 space-y-1.5">
                        {cardPlan.features.slice(0, 4).map((f) => (
                          <li key={f} className={cn('flex items-start gap-1.5 text-[11px] leading-4', isCurrent ? 'text-zinc-600' : 'text-zinc-400')}>
                            <Check className={cn('mt-0.5 h-3 w-3 shrink-0', isCurrent ? 'text-zinc-600' : 'text-[#25c972]/60')} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {!isCurrent && !isSelected && (
                        <p className="mt-3 text-center text-[11px] font-medium text-zinc-500">
                          Select
                        </p>
                      )}
                      {isSelected && (
                        <p className="mt-3 text-center text-[11px] font-medium text-[#25c972]">
                          Selected
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Transition summary — clear "from → to" */}
              {selectedTargetPlan && !changeTargetIsSamePlan && (() => {
                const targetTier = planStringToTier(selectedTargetPlan);
                const targetConfig = PLANS[targetTier];
                const isDown = canAccess(billingCurrentTier, targetTier) && billingCurrentTier !== targetTier;
                const targetMonthly = changePlanCycle === 'annual' && targetConfig.annualPrice > 0
                  ? Math.round(targetConfig.annualPrice / 12)
                  : targetConfig.monthlyPrice;
                return (
                  <div className={cn(
                    'mt-4 flex items-center justify-center gap-3 rounded-xl border px-4 py-3',
                    isDown ? 'border-amber-400/15 bg-amber-400/[0.04]' : 'border-[#25c972]/15 bg-[#25c972]/[0.04]'
                  )}>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Current</p>
                      <p className="text-[13px] font-semibold text-zinc-300">{billingPlanConfig.name}</p>
                    </div>
                    <div className={cn('flex h-6 w-6 items-center justify-center rounded-full', isDown ? 'bg-amber-400/15' : 'bg-[#25c972]/15')}>
                      {isDown
                        ? <ArrowDown className="h-3 w-3 text-amber-300" />
                        : <ArrowUp className="h-3 w-3 text-[#25c972]" />
                      }
                    </div>
                    <div className="text-center">
                      <p className={cn('text-[10px] uppercase tracking-wider', isDown ? 'text-amber-400/70' : 'text-[#25c972]/70')}>{isDown ? 'Downgrade' : 'Upgrade'}</p>
                      <p className="text-[13px] font-semibold text-white">{targetConfig.name} <span className="font-normal text-zinc-500">${targetMonthly}/mo</span></p>
                    </div>
                  </div>
                );
              })()}

              {selectedTargetPlan && !changeTargetIsSamePlan && tier !== 'free' && billingConnectionState !== 'healthy' && (
                <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-amber-100">
                        {billingRepairing ? 'Reconnecting billing...' : 'Billing record needs attention'}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-zinc-300">
                        {billingRepairing
                          ? 'We’re reconnecting your Stripe record now. This modal will unlock automatically if the repair succeeds.'
                          : billingRecoveryMessage ?? 'Billing changes are temporarily unavailable for this workspace.'}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                        {billingConnectionState === 'unrecoverable'
                          ? 'Plan changes stay disabled until the Stripe record is reviewed.'
                          : 'We’ll retry the Stripe lookup before allowing this plan change.'}
                      </p>
                    </div>
                    {billingRecoveryAction === 'retry' && (
                      <button
                        type="button"
                        onClick={() => void handleReconnectBilling()}
                        disabled={billingRepairing}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200/20 bg-black/20 px-3 py-2 text-[11px] font-medium text-amber-100 transition-colors hover:border-amber-200/30 hover:text-white disabled:opacity-50"
                      >
                        {billingRepairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {billingRepairing ? 'Reconnecting...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Readiness panel — shows when a plan is selected */}
              {selectedTargetPlan && !changeTargetIsSamePlan && (
                <div className="mt-3">
                  {previewLoading && !changePlanPreview ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-8 text-[12px] text-zinc-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking readiness...
                    </div>
                  ) : changePlanPreview && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-zinc-400">
                            {stripeHostedPlanChange
                              ? 'Stripe-hosted change'
                              : changePlanPreview.sameEntitlements
                                ? 'Billing cycle change only — same features.'
                                : selectedTargetIsDowngrade
                                  ? 'Auto-adjust preview'
                                  : 'Guided limit check'}
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                            {changePlanPreview.change.reason}
                          </p>
                          {selectedTargetIsDowngrade && !changePlanPreview.sameEntitlements && (
                            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                              These items will be automatically adjusted when your plan changes. You can resolve them now if you prefer.
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-medium',
                          stripeHostedPlanChange
                            ? 'bg-sky-400/10 text-sky-300'
                            : changePlanPreview.blockers
                              ? selectedTargetIsDowngrade
                                ? 'bg-sky-400/10 text-sky-300'
                                : 'bg-amber-400/10 text-amber-300'
                              : 'bg-[#25c972]/10 text-[#25c972]'
                        )}>
                          {stripeHostedPlanChange
                            ? 'Stripe'
                            : changePlanPreview.blockers
                              ? selectedTargetIsDowngrade
                                ? `${changePlanPreview.blockers + changePlanPreview.advisories} auto-adjustment${(changePlanPreview.blockers + changePlanPreview.advisories) === 1 ? '' : 's'}`
                                : `${changePlanPreview.blockers} blocker${changePlanPreview.blockers === 1 ? '' : 's'}`
                              : 'Ready'}
                        </span>
                      </div>

                      {stripeHostedPlanChange ? (
                        <div className="mt-3 rounded-lg border border-sky-300/10 bg-sky-400/[0.05] px-3 py-3">
                          <p className="text-[12px] leading-5 text-zinc-200">
                            Stripe will confirm the final billing details securely before applying this change.
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                            We&apos;ll bring you back here and refresh the workspace automatically after Stripe finishes.
                          </p>
                        </div>
                      ) : (
                        <>
                          {(changePlanPreview.metrics ?? []).length > 0 && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              {(changePlanPreview.metrics ?? []).map((metric) => (
                                <div key={metric.category} className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">{metric.label}</p>
                                  <p className={cn(
                                    'mt-1 text-[13px] font-semibold',
                                    metric.status === 'over_limit' ? 'text-amber-300' : 'text-white'
                                  )}>
                                    {metric.current} / {metric.limit ?? '∞'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {(changePlanPreview.issues ?? []).length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {changePlanPreview.issues.slice(0, 4).map((issue) => (
                                <a
                                  key={buildIssueKey(issue)}
                                  href={issue.cleanupHref}
                                  className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 transition-colors hover:border-white/[0.1]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      'inline-flex h-1.5 w-1.5 rounded-full',
                                      issue.severity === 'advisory' ? 'bg-amber-300' : 'bg-red-300',
                                    )} />
                                    <span className="text-[11px] text-zinc-300">{issue.title}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">{issue.cleanupLabel}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {(changePlanPreview.issues ?? []).length === 0 && !changePlanPreview.sameEntitlements && (
                            <p className="mt-3 flex items-center gap-2 text-[11px] text-[#25c972]/80">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              No blockers — ready for the guided change flow.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {changePlanError && (
                <p className="mt-3 text-[12px] text-red-400">{changePlanError}</p>
              )}

              {/* Footer actions */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  {pendingChange && (
                    <button
                      type="button"
                      onClick={() => void handleCancelScheduledPlanChange()}
                      disabled={changePlanLoading || stripePlanRedirectLoading || billingActionsBlocked}
                      className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
                    >
                      Cancel scheduled change
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChangePlanModalOpen(false)}
                    disabled={changePlanLoading || stripePlanRedirectLoading || billingRepairing}
                    className="rounded-lg px-4 py-2 text-[12px] font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stripeHostedPlanChange
                      ? () => void handleContinuePlanChangeInStripe()
                      : () => void handleSchedulePlanChange()}
                    disabled={stripeHostedPlanChange
                      ? stripePlanRedirectLoading || previewLoading || !changePlanPreview || Boolean(changePlanError) || !selectedTargetPlan || changeTargetIsSamePlan || billingActionsBlocked
                      : changePlanLoading || previewLoading || !changePlanPreview || Boolean(changePlanError) || !selectedTargetPlan || changeTargetIsSamePlan || billingActionsBlocked}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#25c972] px-5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {(changePlanLoading || stripePlanRedirectLoading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {stripeHostedPlanChange
                      ? stripePlanRedirectLoading
                        ? 'Opening Stripe...'
                        : 'Continue in Stripe'
                      : pendingChange
                        ? 'Update change'
                        : 'Confirm change'}
                    {stripeHostedPlanChange ? <ExternalLink className="h-3.5 w-3.5" /> : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={cancelPlanModalOpen} onOpenChange={setCancelPlanModalOpen}>
        <SheetContent
          side="center"
          showClose={false}
          className="max-w-md border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),rgba(12,12,14,0.98)_42%),linear-gradient(180deg,rgba(12,12,14,0.98)_0%,rgba(8,8,10,1)_100%)] p-0 shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
        >
          <div className="relative overflow-hidden rounded-[1.75rem]">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />

            <div className="px-6 pb-6 pt-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.18)]">
                    <AlertTriangle className="h-5 w-5 text-red-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300/80">Billing Change</p>
                    <SheetTitle className="mt-1 text-[1.15rem] font-semibold tracking-[-0.02em] text-white">
                      Cancel your plan?
                    </SheetTitle>
                  </div>
                </div>

                <SheetClose
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                  aria-label="Close cancel plan dialog"
                >
                  <span className="text-lg leading-none">×</span>
                </SheetClose>
              </div>

              <SheetDescription className="mt-5 text-[13px] leading-6 text-zinc-300">
                Your subscription will be managed in Stripe Billing. You&rsquo;ll keep access to your current features until the end of this billing period.
              </SheetDescription>

              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-[12px] font-medium text-zinc-100">What happens next</p>
                <ul className="mt-3 space-y-2 text-[12px] leading-5 text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-red-300/80" />
                    You&apos;ll be redirected to Stripe&apos;s secure billing portal.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-red-300/80" />
                    Cancellation takes effect at the end of the active billing cycle.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-red-300/80" />
                    You can still return to manage payment methods or reactivate there.
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCancelPlanModalOpen(false)}
                  disabled={portalLoading}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  Keep Plan
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmCancelPlan()}
                  disabled={portalLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {portalLoading ? 'Opening Stripe...' : 'Continue to Stripe'}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      </>
      )}

      {/* ─── TEAM TAB ────────────────────────────────────────────── */}
      {activeTab === 'team' && (
      <GatedTabContent locked={isTabLocked('starter')} label="Team management requires Starter" onUpgrade={onOpenUnlock}>
      <>
      {/* ─── Team Management ──────────────────────────────────────── */}
      <section id="team" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">Team</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          {hasMultiSeat
            ? 'Invite team members to share tracked domains and AI visibility data.'
            : 'Upgrade to Pro or Growth to invite team members.'}
        </p>

        <Card className="mt-4">
          {!hasMultiSeat ? (
            /* ── Locked state ──────────────────────────────────── */
            <div className="px-5 py-6 text-center">
              <Lock className="mx-auto h-5 w-5 text-zinc-600" />
              <p className="mt-2 text-[13px] text-zinc-400">
                Team management is available on Pro and Growth plans.
              </p>
              <button
                type="button"
                onClick={() => handleUnlockComplete('pro_monthly')}
                className={cn(btnPrimary, 'mt-4 inline-flex')}
              >
                Upgrade to unlock
              </button>
            </div>
          ) : !teamData.team ? (
            /* ── No team yet — create one ──────────────────────── */
            <div className="px-5 py-5">
              <p className="text-[13px] text-zinc-300">Create a team to start inviting members.</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="Team name"
                  maxLength={50}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:border-[var(--color-primary)] focus:outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateTeam(); }}
                />
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={teamCreating || !teamNameInput.trim()}
                  className={cn(btnAccent, 'py-2 text-[12px]')}
                >
                  <Users className="h-3.5 w-3.5" />
                  {teamCreating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
              {teamError && <p className="mt-2 text-[12px] text-red-400">{teamError}</p>}
            </div>
          ) : teamData.role === 'owner' ? (
            /* ── Owner view ────────────────────────────────────── */
            <>
              {/* Team info */}
              <FieldRow
                label="Team name"
                value={teamData.team.name}
              />
              <FieldRow
                label="Seats"
                value={
                  maxSeats === -1
                    ? `${teamData.seatCount} / Unlimited`
                    : `${teamData.seatCount} / ${maxSeats}`
                }
              />

              {seatPriorityIssues.length > 0 && (
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-300/8 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100/80">Seat priority</p>
                    <p className="mt-2 text-[13px] leading-6 text-zinc-100">
                      This scheduled downgrade is tighter than the current seat usage. Pending invites are revoked first, then lower-priority members are suspended when the plan change takes effect.
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-zinc-400">
                      Use the priority selectors below to decide which members keep full access first.
                    </p>
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="border-b border-white/[0.06] px-5 py-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Members</p>
                <div className="space-y-2">
                  {teamData.members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-zinc-200">{member.email || member.user_id}</span>
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-medium',
                              member.role === 'owner'
                                ? 'bg-[#6c63ff]/20 text-[#6c63ff]'
                                : 'bg-white/[0.06] text-zinc-500'
                            )}>
                              {member.role}
                            </span>
                          </div>
                          {member.role !== 'owner' && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] text-zinc-500">Priority</span>
                              <select
                                value={member.plan_access_rank ?? 1}
                                onChange={(event) => void handleUpdateMemberPriority(member.user_id, Number(event.target.value))}
                                disabled={memberPrioritySaving === member.user_id}
                                className="rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[11px] text-zinc-200 focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                              >
                                {seatPriorityMembers.map((_, index) => (
                                  <option key={index + 1} value={index + 1}>
                                    {index + 1}
                                  </option>
                                ))}
                              </select>
                              {memberPrioritySaving === member.user_id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {member.role !== 'owner' && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(member.user_id)}
                            disabled={memberRemoving === member.user_id}
                            className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite form */}
              <div className="border-b border-white/[0.06] px-5 py-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Invite member</p>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:border-[var(--color-primary)] focus:outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSendInvite(); }}
                  />
                  <button
                    type="button"
                    onClick={handleSendInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    className={cn(btnAccent, 'py-2 text-[12px]')}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {inviteSending ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
                {inviteError && <p className="mt-2 text-[12px] text-red-400">{inviteError}</p>}
                {inviteSuccess && <p className="mt-2 text-[12px] text-[#25c972]">Invitation sent!</p>}

                {/* Pending invitations */}
                {teamData.invitations.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-medium text-zinc-600">Pending invitations</p>
                    {teamData.invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                        <span className="text-[12px] text-zinc-400">{inv.email}</span>
                        <button
                          type="button"
                          onClick={() => void handleRevokeInvitation(inv.id)}
                          disabled={invitationRevoking === inv.id}
                          className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                        >
                          {invitationRevoking === inv.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dissolve */}
              <div className="px-5 py-4">
                <button
                  type="button"
                  onClick={handleDissolveTeam}
                  disabled={teamActionLoading}
                  className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {teamActionLoading ? 'Dissolving...' : 'Dissolve Team'}
                </button>
              </div>
              {teamError && (
                <div className="border-t border-white/[0.06] px-5 py-3 text-[12px] text-red-400">
                  {teamError}
                </div>
              )}
            </>
          ) : (
            /* ── Member view ───────────────────────────────────── */
            <>
              <FieldRow label="Team name" value={teamData.team.name} />
              <FieldRow label="Your role" value="Member" />

              {/* Members list (read-only) */}
              <div className="border-b border-white/[0.06] px-5 py-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Members</p>
                <div className="space-y-2">
                  {teamData.members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                      <span className="text-[13px] text-zinc-200">{member.email || member.user_id}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        member.role === 'owner'
                          ? 'bg-[#6c63ff]/20 text-[#6c63ff]'
                          : 'bg-white/[0.06] text-zinc-500'
                      )}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave team */}
              <div className="px-5 py-4">
                <button
                  type="button"
                  onClick={handleLeaveTeam}
                  disabled={teamActionLoading}
                  className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  {teamActionLoading ? 'Leaving...' : 'Leave Team'}
                </button>
              </div>
              {teamError && (
                <div className="border-t border-white/[0.06] px-5 py-3 text-[12px] text-red-400">
                  {teamError}
                </div>
              )}
            </>
          )}
        </Card>
      </section>

      </>
      </GatedTabContent>
      )}

      {/* ─── MONITORING TAB ──────────────────────────────────────── */}
      {activeTab === 'monitoring' && (
      <GatedTabContent locked={isTabLocked('starter')} label="Monitoring requires Starter" onUpgrade={onOpenUnlock}>
      <>
      {/* ─── Monitoring & Alerts ─────────────────────────────────── */}
      <section id="monitoring" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">Monitoring</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Automated scans and email alerts for {domain}.
        </p>

        <Card className="mt-4">
          <FieldRow
            label="Automated scans"
            description={`Runs ${tier === 'pro' || tier === 'growth' ? 'daily' : 'weekly'} and tracks score changes over time.`}
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

      {/* ─── AI Bot Tracking ────────────────────────────────────── */}
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
              <li>2. Posts to airadr with your site key — domain is resolved server-side.</li>
              <li>3. Bot visits appear in AI Crawler Traffic; human referrals appear in AI Referral Traffic.</li>
            </ol>
            <p className="mt-2 text-[11px] text-zinc-600">
              Regenerating the key invalidates the previous snippet.
            </p>
          </div>
        </Card>
      </section>

      </>
      </GatedTabContent>
      )}

      {/* ─── PLATFORMS TAB ───────────────────────────────────────── */}
      {activeTab === 'platforms' && (
      <GatedTabContent locked={isTabLocked('starter')} label="Platform settings require Starter" onUpgrade={onOpenUnlock}>
      <>
      {/* ─── AI Platform Selection ──────────────────────────────── */}
      <section id="platforms" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">AI Platforms</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Choose which AI engines to track for {domain}. Your {planConfig.name} plan includes up to {maxPlatforms} platform{maxPlatforms !== 1 ? 's' : ''}.
        </p>

        <Card className="mt-4">
          {platformsLoading ? (
            <div className="px-5 py-4 text-[13px] text-zinc-500">Loading platforms...</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {AI_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform);
                const isDisabled = !isSelected && selectedPlatforms.length >= maxPlatforms;
                return (
                  <div key={platform} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-zinc-200">{PLATFORM_LABELS[platform]}</span>
                      {isDisabled && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500">
                          Upgrade to add
                        </span>
                      )}
                    </div>
                    <ToggleSwitch
                      checked={isSelected}
                      disabled={platformsSaving || (isDisabled && !isSelected) || (isSelected && selectedPlatforms.length <= 1)}
                      onToggle={() => void handleTogglePlatform(platform)}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {platformsError && (
            <div className="border-t border-white/[0.06] px-5 py-3 text-[12px] text-red-400">
              {platformsError}
            </div>
          )}
          {selectedPlatforms.length >= maxPlatforms && tier !== 'growth' && (
            <div className="border-t border-white/[0.06] px-5 py-3">
              <button
                type="button"
                onClick={() => handleUnlockComplete(tier === 'free' ? 'starter_monthly' : tier === 'starter' ? 'pro_monthly' : 'growth_monthly')}
                className="text-[12px] font-medium text-[var(--color-primary)] transition-colors hover:text-white"
              >
                Upgrade for more platforms &rarr;
              </button>
            </div>
          )}
        </Card>
      </section>

      {/* ─── Region Targeting ──────────────────────────────────── */}
      <section id="regions" className="scroll-mt-6">
        <h2 className="text-[15px] font-semibold text-white">Region Targeting</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Choose regions for AI mention testing. Your {planConfig.name} plan includes {planConfig.regions === -1 ? 'unlimited' : planConfig.regions} region{planConfig.regions !== 1 ? 's' : ''}.
          {planConfig.regions === 1 && (
            <> Upgrade to Pro for multi-region testing.</>
          )}
        </p>

        <Card className="mt-4">
          {regionsLoading ? (
            <div className="px-5 py-4 text-[13px] text-zinc-500">Loading regions...</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {REGIONS.map((region) => {
                const isSelected = selectedRegions.includes(region.id);
                const isDisabled = !isSelected && selectedRegions.length >= maxRegions;
                return (
                  <div key={region.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{regionFlag(region.flag)}</span>
                      <div>
                        <span className="text-[13px] font-medium text-zinc-200">{region.label}</span>
                        <span className="ml-2 text-[11px] text-zinc-500">{region.language}</span>
                      </div>
                      {isDisabled && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-500">
                          Upgrade to add
                        </span>
                      )}
                    </div>
                    <ToggleSwitch
                      checked={isSelected}
                      disabled={regionsSaving || (isDisabled && !isSelected) || (isSelected && selectedRegions.length <= 1)}
                      onToggle={() => void handleToggleRegion(region.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {regionsError && (
            <div className="border-t border-white/[0.06] px-5 py-3 text-[12px] text-red-400">
              {regionsError}
            </div>
          )}
          {selectedRegions.length >= maxRegions && tier !== 'growth' && (
            <div className="border-t border-white/[0.06] px-5 py-3">
              <button
                type="button"
                onClick={() => handleUnlockComplete(tier === 'free' ? 'starter_monthly' : tier === 'starter' ? 'pro_monthly' : 'growth_monthly')}
                className="text-[12px] font-medium text-[var(--color-primary)] transition-colors hover:text-white"
              >
                Upgrade for more regions &rarr;
              </button>
            </div>
          )}
        </Card>
      </section>

      </>
      </GatedTabContent>
      )}

      {/* ─── Account (General tab) ──────────────────────────────────── */}
      {activeTab === 'general' && (
      <>
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

      </>
      )}

      {/* ─── FEEDBACK TAB (admin only) ──────────────────────────── */}
      {activeTab === 'feedback' && isAdmin && (
      <>
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-white">User Feedback</h2>
            <p className="mt-1 text-[12px] text-zinc-500">
              {feedbackLoading ? 'Loading...' : `${feedbackItems.length} submission${feedbackItems.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {feedbackLoaded && (
            <button
              type="button"
              onClick={() => { setFeedbackLoaded(false); }}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </div>

        {feedbackLoading ? (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feedback...
          </div>
        ) : feedbackItems.length === 0 ? (
          <Card className="mt-4">
            <div className="px-5 py-8 text-center text-[13px] text-zinc-500">
              No feedback submitted yet.
            </div>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {feedbackItems.map((item) => (
              <Card key={item.id} className="!p-0">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-zinc-400">{item.user_email}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      item.category === 'bug' && 'bg-red-500/10 text-red-400',
                      item.category === 'feature' && 'bg-sky-500/10 text-sky-400',
                      item.category === 'general' && 'bg-white/[0.06] text-zinc-400',
                    )}>
                      {item.category === 'bug' ? 'Bug' : item.category === 'feature' ? 'Feature' : 'General'}
                    </span>
                    <span className="ml-auto text-[11px] text-zinc-600">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-6 text-zinc-300">
                    {item.message}
                  </p>
                  {item.page_url && (
                    <p className="mt-2 truncate text-[11px] text-zinc-600">{item.page_url}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      </>
      )}

    </div>
    </div>
  );
}

function GatedTabContent({
  locked,
  label,
  children,
  onUpgrade,
}: {
  locked: boolean;
  label: string;
  children: ReactNode;
  onUpgrade?: () => void;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="select-none pointer-events-none blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d0f]/60 to-[#0d0d0f]/90 rounded-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#161618]/95 px-8 py-6 shadow-2xl shadow-black/50 backdrop-blur-sm text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#356df4]/15">
            <Lock className="h-5 w-5 text-[#356df4]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">{label}</p>
            <p className="mt-1 text-[12px] text-zinc-400 max-w-[260px]">
              Upgrade your plan to access this feature.
            </p>
          </div>
          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#356df4] px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Upgrade to unlock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

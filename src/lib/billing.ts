import {
  type BillingCycle,
  type PaymentPlanString,
  type PlanTier,
  PLANS,
  getPlanDisplayName,
  isPaymentPlanString,
  planStringToTier,
  TIER_LEVEL,
  AI_PLATFORMS,
} from '@/lib/pricing';
import { REGIONS } from '@/lib/region-gating';
import { getAccountAccessOverride, isUnlimitedPlanLimit } from '@/lib/account-access-overrides';
import { getUserAccess } from '@/lib/access';
import {
  getTeamForUser,
  getTeamMembers,
  listPendingInvitations,
  type TeamInvitation,
  type TeamMember,
} from '@/lib/team-management';
import { getSupabaseClient } from '@/lib/supabase';
import { getOrCreateProfile, type UserProfile } from '@/lib/user-profile';

export type LimitCategory =
  | 'domains'
  | 'seats'
  | 'pending_invites'
  | 'prompts'
  | 'competitors'
  | 'platforms'
  | 'regions'
  | 'content_pages';

export type LimitIssueSeverity = 'blocker' | 'advisory';
export type OverageMode = 'none' | 'cleanup_required';

export interface BillingOwnerSummary {
  userId: string;
  email: string | null;
  teamId: string | null;
  teamName: string | null;
  source: 'self' | 'team_owner';
}

export interface PendingPlanChange {
  targetPlan: PaymentPlanString;
  targetTier: PlanTier;
  targetLabel: string;
  effectiveAt: string | null;
  scheduleId: string | null;
  status: 'scheduled';
}

export interface LimitIssue {
  id: string;
  category: LimitCategory;
  severity: LimitIssueSeverity;
  scope: 'team' | 'member';
  title: string;
  description: string;
  current: number;
  limit: number | null;
  overflowBy: number;
  cleanupHref: string;
  cleanupLabel: string;
  memberUserId?: string;
  memberEmail?: string | null;
  domain?: string | null;
  requiresOwnerAction?: boolean;
}

export interface PlanUsageMetric {
  category: LimitCategory;
  label: string;
  current: number;
  limit: number | null;
  overflowBy: number;
  status: 'within_limit' | 'over_limit';
  note?: string;
}

export interface PlanUsageSnapshot {
  targetPlan: string;
  targetTier: PlanTier;
  targetLabel: string;
  effectiveAt: string | null;
  ready: boolean;
  blockers: number;
  advisories: number;
  metrics: PlanUsageMetric[];
  issues: LimitIssue[];
  viewerIssues: LimitIssue[];
  sameEntitlements: boolean;
}

export interface BillingStatus {
  currentPlan: string;
  currentTier: PlanTier;
  currentPeriodEnd: string | null;
  canManageBilling: boolean;
  billingOwner: BillingOwnerSummary;
  cancelAtPeriodEnd: boolean;
  pendingChange: PendingPlanChange | null;
  overageMode: OverageMode;
  overageIssues: LimitIssue[];
  readiness: PlanUsageSnapshot;
  activeReadiness: PlanUsageSnapshot;
}

export type ChangePlanDecision =
  | 'stripe_upgrade'
  | 'stripe_cycle_switch'
  | 'guided_downgrade'
  | 'guided_pending_change'
  | 'guided_schedule_attached'
  | 'guided_cancel'
  | 'guided_reactivate'
  | 'blocked_member_not_owner';

export interface PlanChangeResolution {
  decision: ChangePlanDecision;
  targetPlan: PaymentPlanString;
  targetTier: PlanTier;
  targetLabel: string;
  currentPlan: string;
  currentTier: PlanTier;
  reason: string;
  canUseStripe: boolean;
}

export interface PlanChangePreviewResponse extends PlanUsageSnapshot {
  change: PlanChangeResolution;
}

interface BillingProfileRecord extends UserProfile {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
  pending_plan: string | null;
  pending_plan_effective_at: string | null;
}

export interface BillingContext {
  viewerUserId: string;
  viewerEmail: string;
  teamId: string | null;
  teamName: string | null;
  teamRole: 'owner' | 'member' | null;
  canManageBilling: boolean;
  access: Awaited<ReturnType<typeof getUserAccess>>;
  effectiveUserIds: string[];
  teamMembers: TeamMember[];
  pendingInvitations: TeamInvitation[];
  billingOwner: BillingOwnerSummary;
  billingProfile: BillingProfileRecord;
}

interface DomainUsageRow {
  user_id: string;
  domain: string;
  selected_platforms: string[] | null;
  selected_regions: string[] | null;
}

interface PromptUsageRow {
  user_id: string;
  domain: string;
}

interface CompetitorUsageRow {
  user_id: string;
  domain: string;
}

interface ContentPageUsageRow {
  user_id: string;
}

interface UsageRows {
  domains: DomainUsageRow[];
  prompts: PromptUsageRow[];
  competitors: CompetitorUsageRow[];
  contentPages: ContentPageUsageRow[];
}

interface PlanLimits {
  domains: number;
  prompts: number;
  platforms: number;
  competitors: number;
  regions: number;
  seats: number;
  contentPages: number;
}

function normalizeLimit(limit: number): number | null {
  if (limit === -1 || isUnlimitedPlanLimit(limit)) return null;
  return limit;
}

function overflowBy(current: number, limit: number | null) {
  if (limit === null) return 0;
  return Math.max(0, current - limit);
}

function buildMetric(
  category: LimitCategory,
  label: string,
  current: number,
  limit: number | null,
  note?: string,
): PlanUsageMetric {
  const extra = overflowBy(current, limit);
  return {
    category,
    label,
    current,
    limit,
    overflowBy: extra,
    status: extra > 0 ? 'over_limit' : 'within_limit',
    note,
  };
}

function getPlanCycle(plan: string): BillingCycle | null {
  if (plan.includes('annual')) return 'annual';
  if (plan.includes('monthly')) return 'monthly';
  return null;
}

function isExplicitlyDisabled(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no';
}

export function isHybridChangePlanEnabled() {
  return !isExplicitlyDisabled(process.env.BILLING_HYBRID_CHANGE_PLAN);
}

function getChangePlanReason(decision: ChangePlanDecision, targetLabel: string, canUseStripe: boolean) {
  switch (decision) {
    case 'stripe_upgrade':
      return canUseStripe
        ? `${targetLabel} can be confirmed securely in Stripe.`
        : `${targetLabel} will stay in the guided flow because the hosted Stripe handoff is unavailable right now.`;
    case 'stripe_cycle_switch':
      return canUseStripe
        ? 'This billing-cycle change can be confirmed securely in Stripe.'
        : 'This billing-cycle change will stay in the guided flow because the hosted Stripe handoff is unavailable right now.';
    case 'guided_downgrade':
      return `Downgrades to ${targetLabel} stay here so we can verify your workspace fits the lower plan.`;
    case 'guided_pending_change':
      return 'This subscription already has a scheduled change. Update or cancel that guided change here first.';
    case 'guided_schedule_attached':
      return 'This subscription already has a Stripe schedule attached, so plan changes stay in the guided flow.';
    case 'guided_cancel':
      return 'Cancellation continues in the guided flow.';
    case 'guided_reactivate':
      return 'Reactivation continues in the guided flow.';
    case 'blocked_member_not_owner':
      return 'Only the billing owner can change plans for this workspace.';
    default:
      return 'This plan change stays in the guided flow.';
  }
}

export function isStripeHostedChangeDecision(decision: ChangePlanDecision) {
  return decision === 'stripe_upgrade' || decision === 'stripe_cycle_switch';
}

export function getBillingPlanLabel(plan: string): string {
  if (isPaymentPlanString(plan)) {
    return getPlanDisplayName(plan);
  }

  const tier = planStringToTier(plan);
  const cycle = getPlanCycle(plan);
  if (cycle) {
    return `${PLANS[tier].name} ${cycle === 'annual' ? 'Annual' : 'Monthly'}`;
  }
  return PLANS[tier].name;
}

export function resolvePlanChangeDecision(
  context: BillingContext,
  targetPlan: PaymentPlanString,
  options: {
    hybridEnabled?: boolean;
    stripeAvailable?: boolean;
  } = {},
): PlanChangeResolution {
  const currentPlan = context.access.plan;
  const currentTier = context.access.tier;
  const targetTier = planStringToTier(targetPlan);
  const targetLabel = getBillingPlanLabel(targetPlan);
  const hybridEnabled = options.hybridEnabled ?? isHybridChangePlanEnabled();
  const stripeAvailable = options.stripeAvailable ?? false;
  const canUseStripe = hybridEnabled && stripeAvailable;

  let decision: ChangePlanDecision;

  if (!context.canManageBilling) {
    decision = 'blocked_member_not_owner';
  } else if (context.billingProfile.pending_plan) {
    decision = 'guided_pending_change';
  } else if (context.billingProfile.stripe_subscription_schedule_id) {
    decision = 'guided_schedule_attached';
  } else if (targetTier < currentTier) {
    decision = 'guided_downgrade';
  } else if (targetTier > currentTier) {
    decision = 'stripe_upgrade';
  } else {
    decision = 'stripe_cycle_switch';
  }

  return {
    decision,
    targetPlan,
    targetTier,
    targetLabel,
    currentPlan,
    currentTier,
    reason: getChangePlanReason(decision, targetLabel, canUseStripe && isStripeHostedChangeDecision(decision)),
    canUseStripe: canUseStripe && isStripeHostedChangeDecision(decision),
  };
}

function getPlanLimits(plan: string, email: string | null): PlanLimits {
  const tier = planStringToTier(plan);
  const config = PLANS[tier];
  const override = getAccountAccessOverride(email);

  return {
    domains: override?.maxDomains ?? config.domains,
    prompts: override?.maxPrompts ?? config.prompts,
    platforms: config.platforms,
    competitors: config.competitors,
    regions: config.regions,
    seats: config.seats,
    contentPages: config.contentPages,
  };
}

function getMonthStartIso() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return monthStart.toISOString();
}

async function getBillingProfileById(userId: string, fallbackEmail?: string): Promise<BillingProfileRecord> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('user_profiles')
    .select(`
      id,
      email,
      plan,
      scans_used,
      free_scan_limit,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_schedule_id,
      plan_expires_at,
      plan_cancel_at_period_end,
      pending_plan,
      pending_plan_effective_at,
      plan_updated_at,
      created_at,
      updated_at
    `)
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    return data as BillingProfileRecord;
  }

  if (!fallbackEmail) {
    throw new Error('Billing profile not found');
  }

  const profile = await getOrCreateProfile(userId, fallbackEmail);
  return {
    ...profile,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_schedule_id: null,
    pending_plan: null,
    pending_plan_effective_at: null,
  };
}

async function loadUsageRows(userIds: string[]): Promise<UsageRows> {
  const supabase = getSupabaseClient();
  const monthStart = getMonthStartIso();

  const [
    domainResult,
    promptResult,
    competitorResult,
    contentPageResult,
  ] = await Promise.all([
    supabase
      .from('user_domains')
      .select('user_id, domain, selected_platforms, selected_regions')
      .in('user_id', userIds)
      .eq('hidden', false),
    supabase
      .from('monitored_prompts')
      .select('user_id, domain')
      .in('user_id', userIds),
    supabase
      .from('user_competitors')
      .select('user_id, domain')
      .in('user_id', userIds),
    supabase
      .from('generated_content_pages')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', monthStart),
  ]);

  return {
    domains: (domainResult.data ?? []) as DomainUsageRow[],
    prompts: (promptResult.data ?? []) as PromptUsageRow[],
    competitors: (competitorResult.data ?? []) as CompetitorUsageRow[],
    contentPages: (contentPageResult.data ?? []) as ContentPageUsageRow[],
  };
}

function buildOverflowMembers(
  teamMembers: TeamMember[],
  seatLimit: number | null,
  pendingInviteCount: number,
): TeamMember[] {
  if (seatLimit === null || teamMembers.length + pendingInviteCount <= seatLimit) {
    return [];
  }

  const owner = teamMembers.find((member) => member.role === 'owner') ?? null;
  const rankedMembers = teamMembers
    .filter((member) => member.role !== 'owner')
    .sort((a, b) => {
      const rankA = a.plan_access_rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.plan_access_rank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.joined_at.localeCompare(b.joined_at);
    });

  const remainingOverflow = Math.max(0, teamMembers.length + pendingInviteCount - seatLimit - pendingInviteCount);
  if (remainingOverflow <= 0) {
    return [];
  }

  const protectedOwnerSlots = owner ? 1 : 0;
  const allowedMemberCount = Math.max(0, seatLimit - protectedOwnerSlots);
  return rankedMembers.slice(allowedMemberCount);
}

function issueAppliesToViewer(issue: LimitIssue, context: BillingContext) {
  if (context.canManageBilling) return true;
  return issue.memberUserId === context.viewerUserId;
}

function buildPromptIssues(
  context: BillingContext,
  rows: UsageRows,
  promptLimit: number | null,
  targetLabel: string,
): LimitIssue[] {
  if (promptLimit === null) return [];

  const counts = new Map<string, number>();
  for (const row of rows.prompts) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return context.effectiveUserIds.flatMap((userId) => {
    const current = counts.get(userId) ?? 0;
    if (current <= promptLimit) return [];

    const member = context.teamMembers.find((entry) => entry.user_id === userId);
    return [{
      id: `prompts:${userId}`,
      category: 'prompts' as const,
      severity: 'blocker' as const,
      scope: context.teamId ? 'member' as const : 'team' as const,
      title: member?.email
        ? `${member.email} has too many saved prompts`
        : 'Saved prompt limit exceeded',
      description: member?.email
        ? `${member.email} has ${current} saved prompts. ${targetLabel} only allows ${promptLimit} prompts per member.`
        : `You have ${current} saved prompts. This plan allows ${promptLimit} prompts per member.`,
      current,
      limit: promptLimit,
      overflowBy: current - promptLimit,
      cleanupHref: '/dashboard',
      cleanupLabel: 'Review prompts',
      memberUserId: userId,
      memberEmail: member?.email ?? null,
      requiresOwnerAction: false,
    }];
  });
}

function buildCompetitorIssues(
  context: BillingContext,
  rows: UsageRows,
  competitorLimit: number | null,
  targetLabel: string,
): LimitIssue[] {
  if (competitorLimit === null) return [];

  const counts = new Map<string, number>();
  for (const row of rows.competitors) {
    const key = `${row.user_id}:${row.domain}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const issues: LimitIssue[] = [];

  for (const [key, current] of counts) {
    if (current <= competitorLimit) continue;
    const [userId, domain] = key.split(':');
    const member = context.teamMembers.find((entry) => entry.user_id === userId);
    issues.push({
      id: `competitors:${key}`,
      category: 'competitors',
      severity: 'blocker',
      scope: context.teamId ? 'member' : 'team',
      title: domain
        ? `${domain} exceeds competitor tracking`
        : 'Competitor tracking limit exceeded',
      description: member?.email
        ? `${member.email} is tracking ${current} competitors on ${domain}. ${targetLabel} allows ${competitorLimit} competitors per domain.`
        : `You are tracking ${current} competitors on ${domain}. This plan allows ${competitorLimit} competitors per domain.`,
      current,
      limit: competitorLimit,
      overflowBy: current - competitorLimit,
      cleanupHref: '/competitors',
      cleanupLabel: 'Manage competitors',
      memberUserId: userId,
      memberEmail: member?.email ?? null,
      domain,
      requiresOwnerAction: false,
    });
  }

  return issues;
}

function buildDomainSelectionIssues(
  context: BillingContext,
  rows: UsageRows,
  category: 'platforms' | 'regions',
  limit: number | null,
  targetLabel: string,
): LimitIssue[] {
  if (limit === null) return [];

  const selector = category === 'platforms'
    ? (row: DomainUsageRow) => row.selected_platforms?.length ?? 0
    : (row: DomainUsageRow) => row.selected_regions?.length ?? 0;

  return rows.domains.flatMap((row) => {
    const current = selector(row);
    if (current <= limit) return [];

    const member = context.teamMembers.find((entry) => entry.user_id === row.user_id);
    return [{
      id: `${category}:${row.user_id}:${row.domain}`,
      category,
      severity: 'blocker' as const,
      scope: context.teamId ? 'member' as const : 'team' as const,
      title: category === 'platforms'
        ? `${row.domain} tracks too many platforms`
        : `${row.domain} targets too many regions`,
      description: member?.email
        ? `${member.email} selected ${current} ${category} for ${row.domain}. ${targetLabel} allows ${limit} per domain.`
        : `You selected ${current} ${category} for ${row.domain}. This plan allows ${limit} per domain.`,
      current,
      limit,
      overflowBy: current - limit,
      cleanupHref: '/settings#platforms',
      cleanupLabel: category === 'platforms' ? 'Adjust platforms' : 'Adjust regions',
      memberUserId: row.user_id,
      memberEmail: member?.email ?? null,
      domain: row.domain,
      requiresOwnerAction: false,
    }];
  });
}

function buildContentPageIssues(
  context: BillingContext,
  rows: UsageRows,
  contentLimit: number | null,
  targetLabel: string,
): LimitIssue[] {
  if (contentLimit === null || contentLimit <= 0) return [];

  const counts = new Map<string, number>();
  for (const row of rows.contentPages) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return [...counts.entries()].flatMap(([userId, current]) => {
    if (current <= contentLimit) return [];
    const member = context.teamMembers.find((entry) => entry.user_id === userId);
    return [{
      id: `content_pages:${userId}`,
      category: 'content_pages' as const,
      severity: 'advisory' as const,
      scope: context.teamId ? 'member' as const : 'team' as const,
      title: 'Monthly content generation is already over the target plan',
      description: member?.email
        ? `${member.email} has already generated ${current} pages this month. New pages will stay paused on ${targetLabel} until the monthly reset or an upgrade.`
        : `You have already generated ${current} pages this month. New pages will stay paused on ${targetLabel} until the monthly reset or an upgrade.`,
      current,
      limit: contentLimit,
      overflowBy: current - contentLimit,
      cleanupHref: '/dashboard',
      cleanupLabel: 'View content usage',
      memberUserId: userId,
      memberEmail: member?.email ?? null,
      requiresOwnerAction: false,
    }];
  });
}

function getMaxCount(values: Iterable<number>) {
  let max = 0;
  for (const value of values) {
    if (value > max) max = value;
  }
  return max;
}

export async function resolveBillingContext(userId: string, email: string): Promise<BillingContext> {
  const teamInfo = await getTeamForUser(userId);
  const access = await getUserAccess(userId, email);

  if (!teamInfo) {
    const profile = await getBillingProfileById(userId, email);
    return {
      viewerUserId: userId,
      viewerEmail: email,
      teamId: null,
      teamName: null,
      teamRole: null,
      canManageBilling: true,
      access,
      effectiveUserIds: [userId],
      teamMembers: [{
        id: userId,
        team_id: '',
        user_id: userId,
        role: 'owner',
        status: 'active' as const,
        plan_access_rank: 0,
        joined_at: profile.created_at,
        email: profile.email,
      }],
      pendingInvitations: [],
      billingOwner: {
        userId,
        email: profile.email,
        teamId: null,
        teamName: null,
        source: 'self',
      },
      billingProfile: profile,
    };
  }

  const [teamMembers, pendingInvitations, billingProfile] = await Promise.all([
    getTeamMembers(teamInfo.team.id),
    listPendingInvitations(teamInfo.team.id),
    getBillingProfileById(teamInfo.team.owner_id),
  ]);

  return {
    viewerUserId: userId,
    viewerEmail: email,
    teamId: teamInfo.team.id,
    teamName: teamInfo.team.name,
    teamRole: teamInfo.role,
    canManageBilling: teamInfo.role === 'owner',
    access,
    effectiveUserIds: teamMembers.map((member) => member.user_id),
    teamMembers,
    pendingInvitations,
    billingOwner: {
      userId: teamInfo.team.owner_id,
      email: billingProfile.email,
      teamId: teamInfo.team.id,
      teamName: teamInfo.team.name,
      source: teamInfo.role === 'member' ? 'team_owner' : 'self',
    },
    billingProfile,
  };
}

export async function buildPlanUsageSnapshot(
  context: BillingContext,
  targetPlan: string,
  effectiveAt: string | null = null,
  options: { forceChecks?: boolean } = {},
): Promise<PlanUsageSnapshot> {
  const rows = await loadUsageRows(context.effectiveUserIds);
  const currentTier = context.access.tier;
  const targetTier = planStringToTier(targetPlan);
  const sameEntitlements = currentTier === targetTier;
  const shouldCheckIssues = options.forceChecks || !sameEntitlements;
  const targetLabel = getBillingPlanLabel(targetPlan);
  const limits = getPlanLimits(targetPlan, context.billingProfile.email);
  const domainLimit = normalizeLimit(limits.domains);
  const seatLimit = normalizeLimit(limits.seats);
  const promptLimit = normalizeLimit(limits.prompts);
  const competitorLimit = normalizeLimit(limits.competitors);
  const platformLimit = normalizeLimit(limits.platforms);
  const regionLimit = normalizeLimit(limits.regions);
  const contentLimit = normalizeLimit(limits.contentPages);
  const teamSeatCount = context.teamMembers.length + context.pendingInvitations.length;

  const promptCounts = new Map<string, number>();
  for (const row of rows.prompts) {
    promptCounts.set(row.user_id, (promptCounts.get(row.user_id) ?? 0) + 1);
  }

  const competitorCounts = new Map<string, number>();
  for (const row of rows.competitors) {
    const key = `${row.user_id}:${row.domain}`;
    competitorCounts.set(key, (competitorCounts.get(key) ?? 0) + 1);
  }

  const contentCounts = new Map<string, number>();
  for (const row of rows.contentPages) {
    contentCounts.set(row.user_id, (contentCounts.get(row.user_id) ?? 0) + 1);
  }

  const issues: LimitIssue[] = [];

  if (shouldCheckIssues) {
    if (domainLimit !== null && rows.domains.length > domainLimit) {
      issues.push({
        id: 'domains:team',
        category: 'domains',
        severity: 'blocker',
        scope: 'team',
        title: 'Shared domain count exceeds the target plan',
        description: `This workspace has ${rows.domains.length} tracked domains. ${targetLabel} allows ${domainLimit} shared domain${domainLimit === 1 ? '' : 's'}. Remove or hide domains before the downgrade takes effect.`,
        current: rows.domains.length,
        limit: domainLimit,
        overflowBy: rows.domains.length - domainLimit,
        cleanupHref: '/settings#general',
        cleanupLabel: 'Review tracked domains',
        requiresOwnerAction: true,
      });
    }

    if (seatLimit !== null && teamSeatCount > seatLimit) {
      issues.push({
        id: 'seats:team',
        category: 'seats',
        severity: 'blocker',
        scope: 'team',
        title: 'Seat usage exceeds the target plan',
        description: `This team is using ${teamSeatCount} seats including pending invitations. ${targetLabel} allows ${seatLimit} seat${seatLimit === 1 ? '' : 's'}.`,
        current: teamSeatCount,
        limit: seatLimit,
        overflowBy: teamSeatCount - seatLimit,
        cleanupHref: '/settings#team',
        cleanupLabel: 'Review seats',
        requiresOwnerAction: true,
      });

      if (context.pendingInvitations.length > 0) {
        issues.push({
          id: 'pending_invites:team',
          category: 'pending_invites',
          severity: 'blocker',
          scope: 'team',
          title: 'Pending invitations count against the seat cap',
          description: `${context.pendingInvitations.length} pending invitation${context.pendingInvitations.length === 1 ? '' : 's'} must be revoked before active members lose access priority.`,
          current: context.pendingInvitations.length,
          limit: Math.max(0, seatLimit - context.teamMembers.length),
          overflowBy: Math.max(0, teamSeatCount - seatLimit),
          cleanupHref: '/settings#team',
          cleanupLabel: 'Manage invitations',
          requiresOwnerAction: true,
        });
      }

      const overflowMembers = buildOverflowMembers(
        context.teamMembers,
        seatLimit,
        context.pendingInvitations.length,
      );

      for (const member of overflowMembers) {
        issues.push({
          id: `seat_member:${member.user_id}`,
          category: 'seats',
          severity: 'blocker',
          scope: 'member',
          title: 'This member would move into cleanup-only access',
          description: member.email
            ? `${member.email} falls outside the retained seat priority for ${targetLabel}.`
            : 'This member falls outside the retained seat priority for the target plan.',
          current: teamSeatCount,
          limit: seatLimit,
          overflowBy: 1,
          cleanupHref: '/settings#team',
          cleanupLabel: 'Adjust seat priority',
          memberUserId: member.user_id,
          memberEmail: member.email ?? null,
          requiresOwnerAction: true,
        });
      }
    }

    issues.push(...buildPromptIssues(context, rows, promptLimit, targetLabel));
    issues.push(...buildCompetitorIssues(context, rows, competitorLimit, targetLabel));
    issues.push(...buildDomainSelectionIssues(context, rows, 'platforms', platformLimit, targetLabel));
    issues.push(...buildDomainSelectionIssues(context, rows, 'regions', regionLimit, targetLabel));
    issues.push(...buildContentPageIssues(context, rows, contentLimit, targetLabel));
  }

  const viewerIssues = issues.filter((issue) => issueAppliesToViewer(issue, context));
  const blockers = issues.filter((issue) => issue.severity === 'blocker').length;
  const advisories = issues.filter((issue) => issue.severity === 'advisory').length;

  const metrics: PlanUsageMetric[] = [
    buildMetric('domains', 'Tracked domains', rows.domains.length, domainLimit, 'Shared across the billing owner and team members'),
    buildMetric('seats', 'Seats in use', teamSeatCount, seatLimit, context.teamId ? 'Includes active members and pending invitations' : 'Single-account plan'),
    buildMetric(
      'prompts',
      'Saved prompts',
      getMaxCount(promptCounts.values()),
      promptLimit,
      context.teamId ? 'Highest saved prompt count for one member' : 'Saved prompts on this account',
    ),
    buildMetric(
      'competitors',
      'Competitors per domain',
      getMaxCount(competitorCounts.values()),
      competitorLimit,
      'Highest competitor count on a single domain',
    ),
    buildMetric(
      'platforms',
      'Platforms per domain',
      getMaxCount(rows.domains.map((row) => row.selected_platforms?.length ?? 0)),
      platformLimit,
      'Highest selected platform count on one domain',
    ),
    buildMetric(
      'regions',
      'Regions per domain',
      getMaxCount(rows.domains.map((row) => row.selected_regions?.length ?? 0)),
      regionLimit,
      'Highest selected region count on one domain',
    ),
    buildMetric(
      'content_pages',
      'Generated pages this month',
      getMaxCount(contentCounts.values()),
      contentLimit,
      'Highest monthly page count for one member',
    ),
  ];

  return {
    targetPlan,
    targetTier,
    targetLabel,
    effectiveAt,
    ready: blockers === 0,
    blockers,
    advisories,
    metrics,
    issues,
    viewerIssues,
    sameEntitlements,
  };
}

export interface TrimResult {
  trimmed: boolean;
  details: {
    domains_hidden: string[];
    competitors_removed: Record<string, number>;
    platforms_adjusted: Record<string, { removed: string[] }>;
    regions_adjusted: Record<string, { removed: string[] }>;
    prompts_removed: Record<string, number>;
    invitations_revoked: number;
    members_suspended: string[];
  };
}

/**
 * Deterministically trim workspace resources to fit within a plan's limits.
 * Called by the Stripe webhook handler when a plan tier drops.
 * Idempotent: running twice produces the same result.
 */
export async function trimWorkspaceToFit(
  userId: string,
  newPlan: string,
  oldPlan: string,
): Promise<TrimResult> {
  const supabase = getSupabaseClient();
  const newTier = planStringToTier(newPlan);
  const limits = PLANS[newTier];
  const maxDomains = normalizeLimit(limits.domains);
  const maxCompetitors = normalizeLimit(limits.competitors);
  const maxPlatforms = normalizeLimit(limits.platforms);
  const maxRegions = normalizeLimit(limits.regions);
  const maxPrompts = normalizeLimit(limits.prompts);
  const maxSeats = normalizeLimit(limits.seats);

  const details: TrimResult['details'] = {
    domains_hidden: [],
    competitors_removed: {},
    platforms_adjusted: {},
    regions_adjusted: {},
    prompts_removed: {},
    invitations_revoked: 0,
    members_suspended: [],
  };

  // Resolve team context
  const { data: teamRow } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  const teamId = teamRow?.team_id ?? null;

  // Get all effective user IDs (owner + active team members)
  const effectiveUserIds = [userId];
  if (teamId) {
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, role, plan_access_rank, joined_at, id')
      .eq('team_id', teamId)
      .eq('status', 'active');
    if (members) {
      for (const m of members) {
        if (m.user_id !== userId) effectiveUserIds.push(m.user_id);
      }
    }
  }

  // ── 1. Trim domains ──────────────────────────────────────────
  if (maxDomains !== null) {
    const { data: domains } = await supabase
      .from('user_domains')
      .select('id, domain, updated_at')
      .in('user_id', effectiveUserIds)
      .eq('hidden', false)
      .order('updated_at', { ascending: false });

    if (domains && domains.length > maxDomains) {
      const toHide = domains.slice(maxDomains);
      const hideIds = toHide.map((d) => d.id);
      await supabase
        .from('user_domains')
        .update({ hidden: true, updated_at: new Date().toISOString() })
        .in('id', hideIds);
      details.domains_hidden = toHide.map((d) => d.domain);
    }
  }

  // Get active (non-hidden) domains for per-domain trimming
  const { data: activeDomains } = await supabase
    .from('user_domains')
    .select('id, domain, user_id, selected_platforms, selected_regions')
    .in('user_id', effectiveUserIds)
    .eq('hidden', false);

  const activeDomainList = activeDomains ?? [];

  // ── 2. Trim competitors ──────────────────────────────────────
  // Fetch all competitors in one query, then trim per-domain in memory
  if (maxCompetitors !== null) {
    const activeDomainNames = activeDomainList.map((d) => d.domain);
    const { data: allComps } = await supabase
      .from('user_competitors')
      .select('id, competitor_domain, domain, user_id, created_at')
      .in('user_id', effectiveUserIds)
      .in('domain', activeDomainNames)
      .order('created_at', { ascending: false });

    if (allComps) {
      // Group by domain
      const compsByDomain = new Map<string, typeof allComps>();
      for (const c of allComps) {
        const list = compsByDomain.get(c.domain) ?? [];
        list.push(c);
        compsByDomain.set(c.domain, list);
      }

      const allRemoveIds: string[] = [];
      for (const [domain, comps] of compsByDomain) {
        if (comps.length > maxCompetitors) {
          const toRemove = comps.slice(maxCompetitors);
          allRemoveIds.push(...toRemove.map((c) => c.id));
          details.competitors_removed[domain] = toRemove.length;
        }
      }

      if (allRemoveIds.length > 0) {
        await supabase.from('user_competitors').delete().in('id', allRemoveIds);
      }
    }
  }

  // ── 3. Trim platforms ────────────────────────────────────────
  if (maxPlatforms !== null) {
    for (const ud of activeDomainList) {
      const currentPlatforms: string[] = ud.selected_platforms ?? [...AI_PLATFORMS];
      if (currentPlatforms.length > maxPlatforms) {
        // Keep first N in AI_PLATFORMS priority order
        const kept = AI_PLATFORMS.filter((p) => currentPlatforms.includes(p)).slice(0, maxPlatforms);
        const removed = currentPlatforms.filter((p) => !kept.includes(p as typeof AI_PLATFORMS[number]));
        await supabase
          .from('user_domains')
          .update({ selected_platforms: [...kept], updated_at: new Date().toISOString() })
          .eq('id', ud.id);
        if (removed.length > 0) {
          details.platforms_adjusted[ud.domain] = { removed };
        }
      }
    }
  }

  // ── 4. Trim regions ──────────────────────────────────────────
  if (maxRegions !== null) {
    for (const ud of activeDomainList) {
      const currentRegions: string[] = ud.selected_regions ?? ['us-en'];
      if (currentRegions.length > maxRegions) {
        // Keep first N in REGIONS priority order
        const regionOrder = REGIONS.map((r) => r.id);
        const kept = regionOrder.filter((r) => currentRegions.includes(r)).slice(0, maxRegions);
        const removed = currentRegions.filter((r) => !kept.includes(r));
        await supabase
          .from('user_domains')
          .update({ selected_regions: kept, updated_at: new Date().toISOString() })
          .eq('id', ud.id);
        if (removed.length > 0) {
          details.regions_adjusted[ud.domain] = { removed };
        }
      }
    }
  }

  // ── 5. Trim prompts ──────────────────────────────────────────
  // Fetch all prompts in one query, then trim per-user in memory
  if (maxPrompts !== null) {
    const { data: allPrompts } = await supabase
      .from('monitored_prompts')
      .select('id, user_id, created_at')
      .in('user_id', effectiveUserIds)
      .order('created_at', { ascending: false });

    if (allPrompts) {
      const promptsByUser = new Map<string, typeof allPrompts>();
      for (const p of allPrompts) {
        const list = promptsByUser.get(p.user_id) ?? [];
        list.push(p);
        promptsByUser.set(p.user_id, list);
      }

      const allRemoveIds: string[] = [];
      for (const [uid, prompts] of promptsByUser) {
        if (prompts.length > maxPrompts) {
          const toRemove = prompts.slice(maxPrompts);
          allRemoveIds.push(...toRemove.map((p) => p.id));
          details.prompts_removed[uid] = toRemove.length;
        }
      }

      if (allRemoveIds.length > 0) {
        await supabase.from('monitored_prompts').delete().in('id', allRemoveIds);
      }
    }
  }

  // ── 6. Trim pending invitations ──────────────────────────────
  if (teamId && maxSeats !== null) {
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('id, created_at')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const { data: activeMembers } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    const memberCount = activeMembers?.length ?? 1;
    const inviteCount = invitations?.length ?? 0;
    const totalSeats = memberCount + inviteCount;

    if (totalSeats > maxSeats && invitations && invitations.length > 0) {
      const invitesToRevoke = Math.min(invitations.length, totalSeats - maxSeats);
      const revokeIds = invitations.slice(0, invitesToRevoke).map((i) => i.id);
      await supabase
        .from('team_invitations')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .in('id', revokeIds);
      details.invitations_revoked = invitesToRevoke;
    }
  }

  // ── 7. Suspend excess team members ───────────────────────────
  if (teamId && maxSeats !== null) {
    const { data: activeMembers } = await supabase
      .from('team_members')
      .select('id, user_id, role, plan_access_rank, joined_at')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('plan_access_rank', { ascending: true, nullsFirst: false })
      .order('joined_at', { ascending: true });

    if (activeMembers && activeMembers.length > maxSeats) {
      // Owner is always protected — separate them out
      const owner = activeMembers.find((m) => m.role === 'owner');
      const nonOwners = activeMembers.filter((m) => m.role !== 'owner');
      // Keep (maxSeats - 1) non-owners (1 slot reserved for owner)
      const keepCount = Math.max(0, maxSeats - 1);
      const toSuspend = nonOwners.slice(keepCount);
      if (toSuspend.length > 0) {
        const suspendIds = toSuspend.map((m) => m.id);
        await supabase
          .from('team_members')
          .update({ status: 'suspended' })
          .in('id', suspendIds);
        details.members_suspended = toSuspend.map((m) => m.user_id);
      }
    }
  }

  // ── Write trim log and update profile ────────────────────────
  const trimmed = details.domains_hidden.length > 0
    || Object.keys(details.competitors_removed).length > 0
    || Object.keys(details.platforms_adjusted).length > 0
    || Object.keys(details.regions_adjusted).length > 0
    || Object.keys(details.prompts_removed).length > 0
    || details.invitations_revoked > 0
    || details.members_suspended.length > 0;

  if (trimmed) {
    await supabase.from('workspace_trim_log').insert({
      user_id: userId,
      from_plan: oldPlan,
      to_plan: newPlan,
      details,
    });
  }

  await supabase
    .from('user_profiles')
    .update({
      last_workspace_trim_at: trimmed ? new Date().toISOString() : null,
      trim_banner_dismissed: false,
      trim_failed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { trimmed, details };
}

export async function getBillingStatus(userId: string, email: string): Promise<BillingStatus> {
  const context = await resolveBillingContext(userId, email);
  const pendingPlan = context.billingProfile.pending_plan;
  const scheduledPlan = pendingPlan && isPaymentPlanString(pendingPlan) ? pendingPlan : null;
  const pendingChange = scheduledPlan
    ? {
        targetPlan: scheduledPlan,
        targetTier: planStringToTier(scheduledPlan),
        targetLabel: getBillingPlanLabel(scheduledPlan),
        effectiveAt: context.billingProfile.pending_plan_effective_at ?? context.access.planExpiresAt,
        scheduleId: context.billingProfile.stripe_subscription_schedule_id ?? null,
        status: 'scheduled' as const,
      }
    : null;

  const [activeReadiness, readiness] = await Promise.all([
    buildPlanUsageSnapshot(context, context.access.plan, context.access.planExpiresAt, { forceChecks: true }),
    pendingChange
      ? buildPlanUsageSnapshot(context, pendingChange.targetPlan, pendingChange.effectiveAt)
      : buildPlanUsageSnapshot(context, context.access.plan, context.access.planExpiresAt),
  ]);

  const overageIssues = activeReadiness.viewerIssues.filter((issue) => issue.severity === 'blocker');

  return {
    currentPlan: context.access.plan,
    currentTier: context.access.tier,
    currentPeriodEnd: context.access.planExpiresAt,
    canManageBilling: context.canManageBilling,
    billingOwner: context.billingOwner,
    cancelAtPeriodEnd: context.access.planCancelAtPeriodEnd,
    pendingChange,
    overageMode: overageIssues.length > 0 ? 'cleanup_required' : 'none',
    overageIssues,
    readiness,
    activeReadiness,
  };
}

export async function getCurrentBillingReadiness(userId: string, email: string) {
  const context = await resolveBillingContext(userId, email);
  const snapshot = await buildPlanUsageSnapshot(context, context.access.plan, context.access.planExpiresAt, { forceChecks: true });
  return { context, snapshot };
}

export function getBillingChangeOptions(currentPlan: string): PaymentPlanString[] {
  if (currentPlan === 'free') {
    return ['starter_monthly', 'starter_annual'];
  }
  return [
    'starter_monthly',
    'starter_annual',
    'pro_monthly',
    'pro_annual',
    'growth_monthly',
    'growth_annual',
  ];
}

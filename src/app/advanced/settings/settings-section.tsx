'use client';

import { useState } from 'react';
import { Bell, Crown, Mail, Megaphone, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { DashboardPanel, SectionTitle } from '@/components/app/dashboard-primitives';
import { cn } from '@/lib/utils';
import { PromptVolumeTeaser } from '../panels/prompt-volume-teaser';

interface SettingsSectionProps {
  domain: string;
  monitoringConnected: boolean;
  monitoringLoading: boolean;
  onEnableMonitoring: () => void;
}

export function SettingsSection({
  domain,
  monitoringConnected,
  monitoringLoading,
  onEnableMonitoring,
}: SettingsSectionProps) {
  const [notificationAlertsOn, setNotificationAlertsOn] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);

  return (
    <div className="space-y-6">
      {/* Monitoring Configuration */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Monitoring"
          title="Monitoring Configuration"
          description={`Configure automated monitoring for ${domain}.`}
        />
        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
          <div>
            <p className="text-sm font-medium text-white">Automated Monitoring</p>
            <p className="mt-1 text-[12px] text-zinc-400">Daily scans with score change alerts.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-block h-2 w-2 rounded-full',
              monitoringConnected ? 'bg-[#25c972]' : 'bg-zinc-600'
            )} />
            <span className="text-[12px] text-zinc-400">
              {monitoringConnected ? 'Active' : 'Inactive'}
            </span>
            {!monitoringConnected && (
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
      </DashboardPanel>

      {/* Prompt Volume Intelligence */}
      <PromptVolumeTeaser />

      {/* Notification Preferences */}
      <DashboardPanel className="p-5">
        <SectionTitle
          eyebrow="Notifications"
          title="Notification Preferences"
          description="Control how and when you receive alerts."
        />
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Score change alerts</p>
              <p className="mt-1 text-[12px] text-zinc-400">
                Email me when my score goes up or down by 2+ points
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

          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <label htmlFor="notif-email" className="text-sm font-medium text-white">Notification email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="notif-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-lg border border-white/10 bg-[#1b1b1c] py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => { setSaveEmailLoading(true); setTimeout(() => setSaveEmailLoading(false), 800); }}
              disabled={saveEmailLoading}
              className="mt-3 inline-flex items-center rounded-lg bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
            >
              {saveEmailLoading ? 'Saving...' : 'Save email'}
            </button>
          </div>
        </div>
      </DashboardPanel>

      {/* Get Featured CTA */}
      <DashboardPanel className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25c972]/10">
            <Megaphone className="h-5 w-5 text-[#25c972]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Get Featured</h3>
            <p className="mt-1 text-[13px] text-zinc-400">
              Buy a featured spot to showcase your brand on the landing page and leaderboard.
            </p>
            <Link
              href="/featured"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25c972]/10 border border-[#25c972]/20 px-4 py-2 text-[12px] font-semibold text-[#25c972] transition-colors hover:bg-[#25c972]/15"
            >
              <Crown className="h-3.5 w-3.5" />
              Buy Featured Spot — $25/mo
            </Link>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</p>
            <p className="mt-1 text-sm font-medium text-[#25c972]">Active</p>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}

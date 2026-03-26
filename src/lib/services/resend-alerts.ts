import { Resend } from 'resend';
import type { AlertService, OpportunityAlertSummary } from '@/types/services';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured.');
  _resend = new Resend(key);
  return _resend;
}

export function canUseResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = () => process.env.RESEND_FROM_EMAIL || 'AISO Alerts <alerts@aiso.so>';

const PROVIDER_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  other: 'Other',
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://aiso.so').replace(/\/$/, '');
}

function scoreColor(score: number): string {
  if (score >= 70) return '#25c972';
  if (score >= 40) return '#ff8a1e';
  return '#ff5252';
}

function buildScoreAlertHtml({
  domain,
  previousScore,
  currentScore,
  threshold,
}: {
  domain: string;
  previousScore: number;
  currentScore: number;
  threshold: number;
}): string {
  const diff = currentScore - previousScore;
  const diffSign = diff > 0 ? '+' : '';
  const diffColor = diff > 0 ? '#25c972' : diff < 0 ? '#ff5252' : '#a1a1aa';
  const hasDiff = previousScore !== currentScore;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#6c63ff;">AISO Score Alert</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${domain}</h1>
        </td></tr>

        <!-- Score card -->
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${hasDiff ? `
              <td width="33%" style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Previous</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#a1a1aa;">${previousScore}</p>
              </td>
              <td width="6"></td>
              ` : ''}
              <td ${hasDiff ? 'width="33%"' : 'width="50%"'} style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Current Score</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:${scoreColor(currentScore)};">${currentScore}</p>
              </td>
              ${hasDiff ? `
              <td width="6"></td>
              <td width="33%" style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Change</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:${diffColor};">${diffSign}${diff}</p>
              </td>
              ` : `
              <td width="6"></td>
              <td width="50%" style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Alert Threshold</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#ff8a1e;">${threshold}</p>
              </td>
              `}
            </tr>
          </table>
        </td></tr>

        <!-- Message -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;">
            ${hasDiff
              ? `Your AI visibility score for <strong style="color:#fff;">${domain}</strong> changed from <strong style="color:#fff;">${previousScore}</strong> to <strong style="color:${scoreColor(currentScore)};">${currentScore}</strong>. ${diff < 0 ? 'Consider reviewing your AI optimization strategy.' : 'Great progress — keep it up!'}`
              : `Your AI visibility score for <strong style="color:#fff;">${domain}</strong> is <strong style="color:${scoreColor(currentScore)};">${currentScore}</strong>, which is below your alert threshold of <strong style="color:#fff;">${threshold}</strong>.`
            }
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aiso.so'}/dashboard" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;">
            View Dashboard
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#52525b;">
            You're receiving this because monitoring is enabled for ${domain} on AISO.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildOpportunityAlertHtml(summary: OpportunityAlertSummary): string {
  const appUrl = getAppUrl();
  const reportUrl = summary.latestScanId
    ? `${appUrl}/report?report=${encodeURIComponent(summary.latestScanId)}`
    : `${appUrl}/report`;
  const trafficUrl = `${appUrl}/dashboard?domain=${encodeURIComponent(summary.domain)}#tracking`;

  const providersHtml = summary.topProviders.length > 0
    ? summary.topProviders
      .map((provider) => `
        <span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border-radius:999px;background:#ffffff08;border:1px solid rgba(255,255,255,0.08);font-size:12px;color:#d4d4d8;">
          <strong style="color:#fff;">${PROVIDER_LABELS[provider.provider] ?? provider.provider}</strong> · ${provider.visits}
        </span>
      `)
      .join('')
    : '<p style="margin:0;font-size:13px;color:#a1a1aa;">No dominant providers yet.</p>';

  const pagesHtml = summary.topPages.length > 0
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        ${summary.topPages
          .map((page) => `
            <tr>
              <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#fff;">${page.path}</td>
              <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#a1a1aa;text-align:right;">${page.crawlerVisits} crawls · ${page.referralVisits} referrals</td>
            </tr>
          `)
          .join('')}
      </table>
    `
    : '<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#a1a1aa;">We detected strong crawler attention, but not enough page-level concentration yet to highlight specific URLs.</p>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#ffbb00;">AISO Opportunity Alert</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">AI engines are actively reading ${summary.domain}</h1>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Crawler Visits</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#ffffff;">${summary.crawlerVisits}</p>
              </td>
              <td width="8"></td>
              <td width="50%" style="background:#ffffff08;border-radius:12px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">AI Referrals</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#25c972;">${summary.referralVisits}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#a1a1aa;">
            <strong style="color:#fff;">Proof:</strong> AI engines are loading pages on your site.
            <br />
            <strong style="color:#fff;">Tension:</strong> attention is high, but AI-driven visits are still low.
            <br />
            <strong style="color:#fff;">Action:</strong> open your priority fixes and optimize the pages AI systems are already reading.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 12px;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Top Providers</p>
          <div style="margin-top:12px;">${providersHtml}</div>
        </td></tr>

        <tr><td style="padding:12px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Top Opportunity Pages</p>
          ${pagesHtml}
        </td></tr>

        <tr><td style="padding:24px 32px 32px;">
          <a href="${reportUrl}" style="display:inline-block;padding:12px 24px;background:#ff8a1e;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;">
            See what to optimize
          </a>
          <a href="${trafficUrl}" style="display:inline-block;margin-left:12px;color:#d4d4d8;font-size:13px;font-weight:600;text-decoration:none;">
            See traffic details
          </a>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#52525b;">
            You're receiving this because opportunity alerts are enabled for ${summary.domain} on AISO.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTeamInvitationHtml({
  inviterName,
  teamName,
  acceptUrl,
}: {
  inviterName: string;
  teamName: string;
  acceptUrl: string;
}): string {
  const safeInviter = escapeHtml(inviterName);
  const safeTeam = escapeHtml(teamName);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#6c63ff;">AISO Team Invitation</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">You've been invited to join a team</h1>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#a1a1aa;">
            <strong style="color:#fff;">${safeInviter}</strong> has invited you to join
            <strong style="color:#fff;">${safeTeam}</strong> on AISO.
            As a team member, you'll share access to tracked domains, AI visibility data, and monitoring alerts.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Accept Invitation
          </a>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
            This invitation expires in 7 days. If you don't have an AISO account, you'll be prompted to sign up first.
          </p>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#52525b;">
            You're receiving this because ${safeInviter} invited you on AISO.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendTeamInvitationEmail({
  recipientEmail,
  inviterName,
  teamName,
  acceptUrl,
}: {
  recipientEmail: string;
  inviterName: string;
  teamName: string;
  acceptUrl: string;
}) {
  if (!canUseResend()) {
    console.warn('[Resend] Skipping team invitation email: RESEND_API_KEY not configured');
    return;
  }

  const resend = getResend();
  // Subject line doesn't render HTML, but strip < > to prevent header injection
  const safeSubjectInviter = inviterName.replace(/[<>]/g, '');
  const safeSubjectTeam = teamName.replace(/[<>]/g, '');
  await resend.emails.send({
    from: FROM_EMAIL(),
    to: recipientEmail,
    subject: `${safeSubjectInviter} invited you to join ${safeSubjectTeam} on AISO`,
    html: buildTeamInvitationHtml({ inviterName, teamName, acceptUrl }),
  });
}

/* ── Fix My Site — Email Templates ───────────────────────────────── */

const FILE_LABELS: Record<string, string> = {
  robots_txt: 'robots.txt',
  llms_txt: 'llms.txt',
  structured_data: 'Structured Data (JSON-LD)',
  sitemap: 'Sitemap',
  meta_tags: 'Meta Tags',
  schema_markup: 'Schema Markup',
};

function buildFixMySiteOrderHtml({
  orderId,
  customerEmail,
  domain,
  notes,
  filesRequested,
}: {
  orderId: string;
  customerEmail: string;
  domain: string;
  notes: string;
  filesRequested: string[];
}): string {
  const appUrl = getAppUrl();
  const safeDomain = escapeHtml(domain);
  const safeNotes = notes ? escapeHtml(notes) : '<em style="color:#71717a;">None</em>';
  const filesHtml = filesRequested.length > 0
    ? filesRequested.map(f => `<li style="margin:4px 0;color:#d4d4d8;">${escapeHtml(FILE_LABELS[f] ?? f)}</li>`).join('')
    : '<li style="color:#71717a;">All files</li>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#25c972;">New Fix My Site Order</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${safeDomain}</h1>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">Order ID</td>
              <td style="padding:8px 0;font-size:13px;color:#ffffff;text-align:right;">${escapeHtml(orderId)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">Customer</td>
              <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#ffffff;text-align:right;">${escapeHtml(customerEmail)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">Amount</td>
              <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#25c972;font-weight:700;text-align:right;">$499.00</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 16px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">Requested Files</p>
          <ul style="margin:0;padding-left:20px;font-size:13px;">${filesHtml}</ul>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">Notes</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">${safeNotes}</p>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 24px;background:#25c972;color:#000000;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;">
            View Dashboard
          </a>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#52525b;">
            This is an internal notification for the AISO team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildFixMySiteConfirmationHtml({
  domain,
  orderId,
}: {
  domain: string;
  orderId: string;
}): string {
  const appUrl = getAppUrl();
  const safeDomain = escapeHtml(domain);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#25c972;">AISO Fix My Site</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Your order is confirmed</h1>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#a1a1aa;">
            Thanks for your order! Our team will optimize the AI visibility files for
            <strong style="color:#fff;">${safeDomain}</strong>.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#ffffff;">What to expect:</p>
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:2;color:#a1a1aa;">
            <li>We'll review your site within <strong style="color:#fff;">1 business day</strong></li>
            <li>Optimized files delivered in <strong style="color:#fff;">3-5 business days</strong></li>
            <li>You'll receive a notification when your files are ready</li>
            <li>Full deployment instructions included</li>
          </ul>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <a href="${appUrl}/dashboard?tab=services" style="display:inline-block;padding:12px 24px;background:#6c63ff;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;">
            View Your Order
          </a>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#52525b;">
            Order ID: ${escapeHtml(orderId)} &middot; Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function sendFixMySiteOrderNotification({
  orderId,
  customerEmail,
  domain,
  notes,
  filesRequested,
}: {
  orderId: string;
  customerEmail: string;
  domain: string;
  notes: string;
  filesRequested: string[];
}): Promise<void> {
  if (!canUseResend()) {
    console.warn('[Resend] Skipping Fix My Site order notification: RESEND_API_KEY not configured');
    return;
  }

  const resend = getResend();
  const teamEmail = process.env.AISO_TEAM_EMAIL || 'team@aiso.so';

  await resend.emails.send({
    from: FROM_EMAIL(),
    to: teamEmail,
    subject: `New Fix My Site order: ${domain}`,
    html: buildFixMySiteOrderHtml({ orderId, customerEmail, domain, notes, filesRequested }),
  });
}

export async function sendFixMySiteConfirmation({
  recipientEmail,
  domain,
  orderId,
}: {
  recipientEmail: string;
  domain: string;
  orderId: string;
}): Promise<void> {
  if (!canUseResend()) {
    console.warn('[Resend] Skipping Fix My Site confirmation: RESEND_API_KEY not configured');
    return;
  }

  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL(),
    to: recipientEmail,
    subject: `Your Fix My Site order is confirmed — ${domain}`,
    html: buildFixMySiteConfirmationHtml({ domain, orderId }),
  });
}

export const resendAlertService: AlertService = {
  async sendScoreAlert({ domain, previousScore, currentScore, threshold, recipientEmail }) {
    if (!recipientEmail || recipientEmail === 'unknown') {
      console.warn(`[Resend] Skipping alert for ${domain}: no valid recipient email`);
      return;
    }

    const resend = getResend();

    const diff = currentScore - previousScore;
    const hasDiff = previousScore !== currentScore;
    const subject = hasDiff
      ? `${domain}: score ${diff > 0 ? 'up' : 'down'} ${previousScore} → ${currentScore}`
      : `${domain}: score is ${currentScore} (below threshold ${threshold})`;

    await resend.emails.send({
      from: FROM_EMAIL(),
      to: recipientEmail,
      subject,
      html: buildScoreAlertHtml({ domain, previousScore, currentScore, threshold }),
    });
  },
  async sendOpportunityAlert({ recipientEmail, summary }) {
    if (!recipientEmail || recipientEmail === 'unknown') {
      console.warn(`[Resend] Skipping opportunity alert for ${summary.domain}: no valid recipient email`);
      return;
    }

    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL(),
      to: recipientEmail,
      subject: `AI engines are actively reading ${summary.domain}`,
      html: buildOpportunityAlertHtml(summary),
    });
  },
};

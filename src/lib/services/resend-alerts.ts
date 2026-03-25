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

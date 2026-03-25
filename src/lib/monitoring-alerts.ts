import type { AlertService } from '@/types/services';

export const mockAlertService: AlertService = {
  async sendScoreAlert({ domain, previousScore, currentScore, threshold, recipientEmail }) {
    console.log(
      `[Alert] Score change for ${domain}: ${previousScore} → ${currentScore} (threshold: ${threshold}). Would email ${recipientEmail}.`
    );
  },
  async sendOpportunityAlert({ recipientEmail, summary }) {
    console.log(
      `[Alert] Opportunity alert for ${summary.domain}: ${summary.crawlerVisits} crawler visits vs ${summary.referralVisits} AI referrals. Would email ${recipientEmail}.`
    );
  },
};

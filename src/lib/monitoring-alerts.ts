import type { AlertService } from '@/types/services';

export const mockAlertService: AlertService = {
  async sendScoreAlert({ domain, previousScore, currentScore, threshold, recipientEmail }) {
    console.log(
      `[Alert] Score change for ${domain}: ${previousScore} → ${currentScore} (threshold: ${threshold}). Would email ${recipientEmail}.`
    );
  },
};

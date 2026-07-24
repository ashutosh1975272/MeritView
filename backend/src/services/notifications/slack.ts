import { logger } from '../../utils/logger';
import { getEnv } from '../../config/env';

const env = getEnv();

export async function sendSlackAlert(message: string, channel = '#alerts'): Promise<void> {
  const webhookUrl = process.env.SLACK_ALERT_WEBHOOK;

  if (!webhookUrl) {
    logger.info('Slack alert stub:', { message, channel });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        channel,
        username: 'MeritView Monitor',
        icon_emoji: ':warning:',
      }),
    });

    if (!response.ok) {
      logger.warn('Slack webhook returned non-200', { status: response.status });
    }
  } catch (error: any) {
    logger.error('Failed to send Slack alert', error, { message });
  }
}

export async function sendCostAlert(disputeId: string, costUsd: number): Promise<void> {
  if (costUsd > 15) {
    await sendSlackAlert(
      `⚠️ *Cost Alert* — Dispute *${disputeId}* cost $${costUsd.toFixed(2)} exceeds $15 threshold`,
      '#cost-alerts'
    );
  }
}

import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { isOverCostThreshold } from '../../providers/cost';

export async function runDailyCostAggregation(): Promise<{
  totalCostToday: number;
  disputeCount: number;
  alertsTriggered: number;
}> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOutputs = await prisma.evaluatorOutput.findMany({
    where: {
      createdAt: { gte: startOfDay },
    },
  });

  const totalCostToday = todayOutputs.reduce((sum, o) => sum + Number(o.costUsd), 0);
  const disputeIds = [...new Set(todayOutputs.map(o => o.disputeId))];
  const disputeCount = disputeIds.length;

  let alertsTriggered = 0;
  for (const disputeId of disputeIds) {
    const disputeOutputs = todayOutputs.filter(o => o.disputeId === disputeId);
    const disputeCost = disputeOutputs.reduce((sum, o) => sum + Number(o.costUsd), 0);
    if (isOverCostThreshold(disputeCost)) {
      alertsTriggered++;
      logger.warn('Daily cost threshold exceeded for dispute', {
        disputeId,
        costUsd: disputeCost,
        threshold: 15,
      });
    }
  }

  logger.info('Daily cost aggregation complete', {
    totalCostToday,
    disputeCount,
    evaluatorOutputs: todayOutputs.length,
    alertsTriggered,
  });

  return { totalCostToday, disputeCount, alertsTriggered };
}

export async function triggerSlackAlertIfOverThreshold(
  disputeId: string,
  costUsd: number
): Promise<void> {
  if (!isOverCostThreshold(costUsd)) return;

  const slackWebhook = process.env.SLACK_ALERT_WEBHOOK;
  if (!slackWebhook) {
    logger.info('Slack alert stub: would send alert', {
      disputeId,
      costUsd,
      message: `⚠️ Cost alert: dispute ${disputeId} cost $${costUsd.toFixed(2)} exceeds $15 threshold`,
    });
    return;
  }

  try {
    const payload = {
      text: `⚠️ *MeritView Cost Alert*\nDispute: ${disputeId}\nCost: $${costUsd.toFixed(2)}\nThreshold: $15.00`,
      channel: '#cost-alerts',
      username: 'MeritView Cost Monitor',
    };

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    logger.info('Slack alert sent for cost threshold breach', { disputeId, costUsd });
  } catch (error: any) {
    logger.error('Failed to send Slack alert', error, { disputeId, costUsd });
  }
}

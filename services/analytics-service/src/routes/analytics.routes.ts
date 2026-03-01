import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const analyticsRouter = Router();

/**
 * GET /analytics/usage/:appId
 *
 * Retrieve usage records for an application.
 * Optional query parameters:
 *   - metric: filter by metric type (api_calls, video_minutes, storage_bytes, mau)
 *   - period: filter by time period (today, week, month, all – default: all)
 */
analyticsRouter.get('/analytics/usage/:appId', async (req: Request, res: Response) => {
  const { appId } = req.params;
  const metricFilter = req.query.metric as string | undefined;
  const period = (req.query.period as string) ?? 'all';

  const now = new Date();
  let createdAfter: Date | undefined;

  switch (period) {
    case 'today': {
      createdAfter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case 'week':
      createdAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      createdAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const records = await prisma.usageRecord.findMany({
    where: {
      appId,
      ...(metricFilter ? { metric: metricFilter } : {}),
      ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ appId, period, count: records.length, records });
});

/**
 * GET /analytics/usage/:appId/summary
 */
analyticsRouter.get('/analytics/usage/:appId/summary', async (req: Request, res: Response) => {
  const { appId } = req.params;

  const [apiCallsResult, videoMinsResult, storageResult, mauResult] = await Promise.all([
    prisma.usageRecord.aggregate({ where: { appId, metric: 'api_calls' }, _sum: { value: true } }),
    prisma.usageRecord.aggregate({ where: { appId, metric: 'video_minutes' }, _sum: { value: true } }),
    prisma.usageRecord.aggregate({ where: { appId, metric: 'storage_bytes' }, _sum: { value: true } }),
    prisma.usageRecord.findFirst({ where: { appId, metric: 'mau' }, orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({
    appId,
    totalApiCalls: apiCallsResult._sum.value ?? 0,
    totalVideoMinutes: videoMinsResult._sum.value ?? 0,
    totalStorage: storageResult._sum.value ?? 0,
    mau: mauResult?.value ?? 0,
    generatedAt: new Date().toISOString(),
  });
});

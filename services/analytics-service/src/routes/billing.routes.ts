import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { usageStore } from '../consumers/usage.consumer.js';

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                  */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceCurrency: string;
  limits: {
    mau: number;
    apiCallsPerMonth: number;
    videoMinutesPerMonth: number;
    storageGb: number;
    maxChannelMembers: number;
    maxConcurrentConnections: number;
  };
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For small projects and experimentation',
    priceMonthly: 0,
    priceCurrency: 'USD',
    limits: {
      mau: 100,
      apiCallsPerMonth: 10_000,
      videoMinutesPerMonth: 100,
      storageGb: 1,
      maxChannelMembers: 50,
      maxConcurrentConnections: 25,
    },
    features: ['Chat messaging', 'Basic presence', 'Community support'],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For growing applications with moderate usage',
    priceMonthly: 49,
    priceCurrency: 'USD',
    limits: {
      mau: 5_000,
      apiCallsPerMonth: 500_000,
      videoMinutesPerMonth: 5_000,
      storageGb: 25,
      maxChannelMembers: 200,
      maxConcurrentConnections: 500,
    },
    features: ['Everything in Free', 'Voice & video calls', 'Push notifications', 'Webhooks', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For scaling applications with high usage',
    priceMonthly: 249,
    priceCurrency: 'USD',
    limits: {
      mau: 50_000,
      apiCallsPerMonth: 5_000_000,
      videoMinutesPerMonth: 50_000,
      storageGb: 250,
      maxChannelMembers: 1_000,
      maxConcurrentConnections: 5_000,
    },
    features: ['Everything in Starter', 'Live streaming', 'Moderation tools', 'Analytics dashboard', 'Priority support', 'Custom roles'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For mission-critical deployments with custom requirements',
    priceMonthly: -1, // Custom pricing
    priceCurrency: 'USD',
    limits: {
      mau: -1, // Unlimited
      apiCallsPerMonth: -1,
      videoMinutesPerMonth: -1,
      storageGb: -1,
      maxChannelMembers: -1,
      maxConcurrentConnections: -1,
    },
    features: ['Everything in Growth', 'Unlimited usage', 'SLA guarantee', 'Dedicated infrastructure', 'On-premise deployment', '24/7 support', 'Custom integrations'],
  },
];

/* ------------------------------------------------------------------ */
/*  In-memory stores                                                  */
/* ------------------------------------------------------------------ */

/** appId -> planId */
const appPlans = new Map<string, string>();

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const updatePlanSchema = z.object({
  planId: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/*  Rate table (per unit overage costs)                               */
/* ------------------------------------------------------------------ */

const overageRates: Record<string, number> = {
  api_calls: 0.001,       // $0.001 per API call over limit
  video_minutes: 0.01,    // $0.01 per video minute over limit
  storage_bytes: 0.00000000005, // ~$0.05 per GB over limit
};

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

export const billingRouter = Router();

/**
 * GET /billing/plans
 *
 * List all available billing plans.
 */
billingRouter.get('/billing/plans', (_req: Request, res: Response) => {
  res.json(plans);
});

/**
 * GET /billing/plans/:id
 *
 * Get a single billing plan by ID.
 */
billingRouter.get('/billing/plans/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const plan = plans.find((p) => p.id === id);

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  res.json(plan);
});

/**
 * GET /billing/:appId/invoice
 *
 * Generate a current-period invoice showing usage and estimated costs.
 */
billingRouter.get('/billing/:appId/invoice', (req: Request, res: Response) => {
  const { appId } = req.params;
  const planId = appPlans.get(appId) ?? 'free';
  const plan = plans.find((p) => p.id === planId);

  if (!plan) {
    res.status(404).json({ error: 'Plan not found for this application' });
    return;
  }

  const records = usageStore.get(appId) ?? [];

  // Aggregate usage
  const apiCalls = records.filter((r) => r.metric === 'api_calls').reduce((s, r) => s + r.value, 0);
  const videoMinutes = records.filter((r) => r.metric === 'video_minutes').reduce((s, r) => s + r.value, 0);
  const storageBytes = records.filter((r) => r.metric === 'storage_bytes').reduce((s, r) => s + r.value, 0);
  const mauRecords = records.filter((r) => r.metric === 'mau');
  const mau = mauRecords.length > 0 ? mauRecords[mauRecords.length - 1].value : 0;

  // Calculate overage costs
  const apiOverage = plan.limits.apiCallsPerMonth >= 0 ? Math.max(0, apiCalls - plan.limits.apiCallsPerMonth) : 0;
  const videoOverage = plan.limits.videoMinutesPerMonth >= 0 ? Math.max(0, videoMinutes - plan.limits.videoMinutesPerMonth) : 0;
  const storageOverage = plan.limits.storageGb >= 0 ? Math.max(0, storageBytes - plan.limits.storageGb * 1024 * 1024 * 1024) : 0;

  const overageCost =
    apiOverage * overageRates.api_calls +
    videoOverage * overageRates.video_minutes +
    storageOverage * overageRates.storage_bytes;

  const baseCost = plan.priceMonthly >= 0 ? plan.priceMonthly : 0;
  const totalCost = baseCost + overageCost;

  res.json({
    appId,
    planId,
    planName: plan.name,
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    },
    usage: {
      apiCalls,
      videoMinutes,
      storageBytes,
      mau,
    },
    limits: plan.limits,
    costs: {
      base: baseCost,
      overage: Math.round(overageCost * 100) / 100,
      total: Math.round(totalCost * 100) / 100,
      currency: plan.priceCurrency,
    },
    generatedAt: new Date().toISOString(),
  });
});

/**
 * POST /billing/:appId/plan
 *
 * Update the billing plan for an application.
 */
billingRouter.post('/billing/:appId/plan', validate(updatePlanSchema), (req: Request, res: Response) => {
  const { appId } = req.params;
  const { planId } = req.body as z.infer<typeof updatePlanSchema>;

  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const previousPlanId = appPlans.get(appId) ?? 'free';
  appPlans.set(appId, planId);

  console.log(`[BillingRoutes] Updated plan for appId=${appId}: ${previousPlanId} -> ${planId}`);

  res.json({
    appId,
    previousPlanId,
    currentPlanId: planId,
    plan,
    updatedAt: new Date().toISOString(),
  });
});

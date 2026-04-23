/**
 * Thin PayPal REST wrapper. Wraps subscription create + status check so we can
 * swap providers (e.g. Stripe) later without changing callers.
 */
import type { Plan } from './types';

const PAYPAL_API =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const PLAN_TO_PAYPAL_PLAN_ID: Partial<Record<Plan, string | undefined>> = {
  basic: process.env.PAYPAL_PLAN_BASIC_ID,
  pro: process.env.PAYPAL_PLAN_PRO_ID,
  premium: process.env.PAYPAL_PLAN_PREMIUM_ID,
};

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials not configured');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal token failed');
  const data = await res.json();
  return data.access_token as string;
}

export async function getSubscription(subscriptionId: string): Promise<{
  status: string;
  plan_id?: string;
  subscriber?: { email_address?: string };
  custom_id?: string;
} | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function planFromPaypalPlanId(planId: string | undefined): Plan | null {
  if (!planId) return null;
  for (const [plan, id] of Object.entries(PLAN_TO_PAYPAL_PLAN_ID)) {
    if (id && id === planId) return plan as Plan;
  }
  return null;
}

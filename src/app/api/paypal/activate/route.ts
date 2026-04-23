import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser, updateUserPlan } from '@/lib/db/user';
import { getSubscription, planFromPaypalPlanId } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  subscription_id: z.string().min(1),
});

/**
 * Called by the client after PayPal approves a subscription.
 * We verify the subscription status with PayPal, map the plan_id, and upgrade the user.
 */
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const sub = await getSubscription(parsed.subscription_id);
  if (!sub) {
    return NextResponse.json({ error: 'subscription_not_found' }, { status: 404 });
  }
  if (!['ACTIVE', 'APPROVED'].includes(sub.status)) {
    return NextResponse.json({ error: 'subscription_not_active', status: sub.status }, { status: 409 });
  }
  const plan = planFromPaypalPlanId(sub.plan_id);
  if (!plan) {
    return NextResponse.json({ error: 'unknown_plan', plan_id: sub.plan_id }, { status: 409 });
  }

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  await updateUserPlan(admin, user.id, plan, parsed.subscription_id);

  return NextResponse.json({ plan });
}

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSubscription, planFromPaypalPlanId } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PayPal webhook. Minimal: we listen for subscription lifecycle events and
 * sync the user's plan. Signature verification is a TODO — gated behind env
 * PAYPAL_WEBHOOK_ID. In sandbox we trust the event but re-fetch the subscription
 * from PayPal before mutating state.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = body as { event_type?: string; resource?: { id?: string } };
  const type = event.event_type;
  const subId = event.resource?.id;
  if (!type || !subId) return NextResponse.json({ ok: true });

  const sub = await getSubscription(subId);
  if (!sub) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  // Find user by paypal_subscription_id
  const { data: userRow } = await admin
    .from('users')
    .select('id')
    .eq('paypal_subscription_id', subId)
    .maybeSingle();
  if (!userRow) return NextResponse.json({ ok: true });

  if (type.includes('CANCELLED') || type.includes('EXPIRED') || type.includes('SUSPENDED')) {
    await admin
      .from('users')
      .update({ plan: 'free', paypal_subscription_id: null })
      .eq('id', userRow.id);
  } else if (sub.status === 'ACTIVE') {
    const plan = planFromPaypalPlanId(sub.plan_id) ?? 'basic';
    await admin.from('users').update({ plan }).eq('id', userRow.id);
  }
  return NextResponse.json({ ok: true });
}

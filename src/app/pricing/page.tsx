import Link from 'next/link';
import { Moon, Check } from 'lucide-react';
import { PLAN_PRICING, FEATURES } from '@/lib/features';
import { PaypalCheckout } from '@/components/PaypalCheckout';
import type { Plan } from '@/lib/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  let userPlan: Plan = 'free';
  if (auth.user) {
    const admin = createSupabaseAdminClient();
    const u = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
    userPlan = u.plan;
  }

  const paypalPlanIds: Partial<Record<Plan, string | undefined>> = {
    basic: process.env.PAYPAL_PLAN_BASIC_ID,
    pro: process.env.PAYPAL_PLAN_PRO_ID,
    premium: process.env.PAYPAL_PLAN_PREMIUM_ID,
  };
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '';

  const order: Plan[] = ['free', 'basic', 'pro', 'premium'];

  return (
    <main className="container-app pt-10 pb-24">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Moon className="w-5 h-5 text-night-300" />
        <span className="font-serif">Moonlit</span>
      </Link>

      <header className="text-center mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl">Gentle plans for every family</h1>
        <p className="text-night-200/80 mt-2">Start free. Upgrade when the magic calls.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {order.map((plan) => {
          const p = PLAN_PRICING[plan];
          const f = FEATURES[plan];
          const isCurrent = auth.user && userPlan === plan;
          return (
            <div key={plan} className={'card flex flex-col ' + (isCurrent ? 'ring-2 ring-night-400' : '')}>
              <div className="mb-2">
                <div className="text-night-300 text-xs uppercase tracking-widest">{p.label}</div>
                <div className="font-serif text-3xl mt-1">
                  {p.monthlyUsd === 0 ? 'Free' : `$${p.monthlyUsd}`}
                  {p.monthlyUsd > 0 && <span className="text-sm text-night-300/70">/mo</span>}
                </div>
                <div className="text-night-200/80 text-sm mt-1">{p.tagline}</div>
              </div>
              <ul className="space-y-1.5 text-sm mb-4">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-night-400 mt-0.5 flex-shrink-0" /> {h}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {isCurrent ? (
                  <div className="text-center text-sm text-night-300">Your current plan</div>
                ) : plan === 'free' ? (
                  <Link href={auth.user ? '/app' : '/login'} className="btn-ghost block text-center">
                    {auth.user ? 'Downgrade' : 'Start free'}
                  </Link>
                ) : !auth.user ? (
                  <Link href="/login" className="btn-primary block text-center">Sign in to choose</Link>
                ) : !paypalClientId || !paypalPlanIds[plan] ? (
                  <div className="text-xs text-night-300/70 text-center">
                    PayPal plan ID not configured for {p.label}.{' '}
                    <span className="block mt-1">Set <code>PAYPAL_PLAN_{plan.toUpperCase()}_ID</code>.</span>
                  </div>
                ) : (
                  <PaypalCheckout
                    plan={plan}
                    paypalPlanId={paypalPlanIds[plan]!}
                    clientId={paypalClientId}
                  />
                )}
              </div>
              <p className="text-[11px] text-night-300/60 mt-3">
                Up to {f.dailyStoryLimit === -1 ? '∞' : f.dailyStoryLimit} stories/day ·{' '}
                {f.maxChildren === -1 ? 'unlimited' : f.maxChildren}{' '}
                {f.maxChildren === 1 ? 'child' : 'children'}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-night-300/60 mt-10">
        Prices in USD. Cancel anytime. PayPal handles billing securely.
      </p>
    </main>
  );
}

'use client';

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Plan } from '@/lib/types';

export function PaypalCheckout({
  plan,
  paypalPlanId,
  clientId,
}: {
  plan: Plan;
  paypalPlanId: string;
  clientId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <div>
      <PayPalScriptProvider
        options={{
          clientId,
          vault: true,
          intent: 'subscription',
          components: 'buttons',
        }}
      >
        <PayPalButtons
          style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'subscribe' }}
          createSubscription={(_data, actions) =>
            actions.subscription.create({ plan_id: paypalPlanId })
          }
          onApprove={async (data) => {
            setError(null);
            const resp = await fetch('/api/paypal/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription_id: data.subscriptionID }),
            });
            const body = await resp.json();
            if (!resp.ok) {
              setError(body.error || 'Activation failed');
              return;
            }
            setSuccess(true);
            setTimeout(() => router.push('/app'), 800);
          }}
          onError={(err: unknown) =>
            setError(err instanceof Error ? err.message : 'PayPal error')
          }
        />
      </PayPalScriptProvider>
      {success && <p className="text-xs text-night-300 mt-2">Welcome to {plan}! Redirecting…</p>}
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  );
}

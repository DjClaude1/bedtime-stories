import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppUser, Plan } from '../types';

export async function ensureAppUser(
  admin: SupabaseClient,
  id: string,
  email: string,
): Promise<AppUser> {
  const { data: existing } = await admin.from('users').select('*').eq('id', id).maybeSingle();
  if (existing) return existing as AppUser;
  const { data, error } = await admin
    .from('users')
    .insert({ id, email, plan: 'free' })
    .select('*')
    .single();
  if (error) throw error;
  return data as AppUser;
}

export async function getAppUser(admin: SupabaseClient, id: string): Promise<AppUser | null> {
  const { data } = await admin.from('users').select('*').eq('id', id).maybeSingle();
  return (data as AppUser) ?? null;
}

export async function updateUserPlan(
  admin: SupabaseClient,
  id: string,
  plan: Plan,
  paypalSubscriptionId?: string | null,
): Promise<void> {
  await admin
    .from('users')
    .update({ plan, paypal_subscription_id: paypalSubscriptionId ?? null })
    .eq('id', id);
}

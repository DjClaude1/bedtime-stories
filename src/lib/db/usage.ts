import type { SupabaseClient } from '@supabase/supabase-js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns today's story count for the user. */
export async function getTodayStoriesCount(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin
    .from('usage')
    .select('stories_generated')
    .eq('user_id', userId)
    .eq('date', today())
    .maybeSingle();
  return data?.stories_generated ?? 0;
}

export async function incrementUsage(
  admin: SupabaseClient,
  userId: string,
  patch: {
    stories?: number;
    audio?: number;
    images?: number;
    costCents?: number;
  },
): Promise<void> {
  const d = today();
  const { data: existing } = await admin
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .maybeSingle();

  if (existing) {
    await admin
      .from('usage')
      .update({
        stories_generated: (existing.stories_generated ?? 0) + (patch.stories ?? 0),
        audio_generated: (existing.audio_generated ?? 0) + (patch.audio ?? 0),
        images_generated: (existing.images_generated ?? 0) + (patch.images ?? 0),
        estimated_cost_cents:
          Number(existing.estimated_cost_cents ?? 0) + (patch.costCents ?? 0),
      })
      .eq('user_id', userId)
      .eq('date', d);
  } else {
    await admin.from('usage').insert({
      user_id: userId,
      date: d,
      stories_generated: patch.stories ?? 0,
      audio_generated: patch.audio ?? 0,
      images_generated: patch.images ?? 0,
      estimated_cost_cents: patch.costCents ?? 0,
    });
  }
}

/** Simple per-user cooldown check. Returns ms remaining if still cooling down, else 0. */
export async function enforceCooldown(
  admin: SupabaseClient,
  userId: string,
  cooldownSec: number,
): Promise<number> {
  const { data } = await admin
    .from('rate_limits')
    .select('last_request_at')
    .eq('user_id', userId)
    .maybeSingle();
  const now = Date.now();
  if (data?.last_request_at) {
    const last = new Date(data.last_request_at).getTime();
    const waitMs = cooldownSec * 1000 - (now - last);
    if (waitMs > 0) return waitMs;
  }
  const iso = new Date(now).toISOString();
  if (data) {
    await admin.from('rate_limits').update({ last_request_at: iso }).eq('user_id', userId);
  } else {
    await admin.from('rate_limits').insert({ user_id: userId, last_request_at: iso });
  }
  return 0;
}

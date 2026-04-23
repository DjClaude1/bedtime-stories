import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { enforceCooldown, getTodayStoriesCount, incrementUsage } from '@/lib/db/usage';
import { generateStory } from '@/lib/ai/story';
import { updateChildMemoryAfterStory } from '@/lib/db/memory';
import { randomSlug } from '@/lib/utils';
import type { Child, StoryMode } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  child_id: z.string().uuid(),
  mode: z.enum(['sleep', 'adventure', 'educational', 'moral']).default('sleep'),
  theme: z.string().trim().max(200).optional(),
  series_id: z.string().uuid().nullish(),
});

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

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);

  // Rate limit
  const cooldownMs = await enforceCooldown(admin, user.id, features.rateLimitCooldownSec);
  if (cooldownMs > 0) {
    return NextResponse.json(
      { error: 'rate_limited', retry_ms: cooldownMs },
      { status: 429 },
    );
  }

  // Daily limit
  if (features.dailyStoryLimit !== -1) {
    const count = await getTodayStoriesCount(admin, user.id);
    if (count >= features.dailyStoryLimit) {
      return NextResponse.json(
        { error: 'daily_limit_reached', limit: features.dailyStoryLimit, plan: user.plan },
        { status: 402 },
      );
    }
  }

  // Load child (enforcing ownership via admin + user_id filter)
  const { data: childRow, error: childErr } = await admin
    .from('children')
    .select('*')
    .eq('id', parsed.child_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (childErr || !childRow) {
    return NextResponse.json({ error: 'child_not_found' }, { status: 404 });
  }
  const child = childRow as Child;

  // Continuation
  let continuation: { previousTitle: string; previousSummary: string } | undefined;
  const seriesId: string | null = parsed.series_id ?? null;
  if (seriesId) {
    if (!features.continueStory) {
      return NextResponse.json({ error: 'feature_locked', feature: 'continueStory' }, { status: 402 });
    }
    const { data: last } = await admin
      .from('stories')
      .select('title, id')
      .eq('series_id', seriesId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      continuation = {
        previousTitle: last.title,
        previousSummary: child.memory?.lastStorySummary ?? '',
      };
    }
  }

  // Generate
  let result;
  try {
    result = await generateStory({
      child,
      mode: parsed.mode as StoryMode,
      theme: parsed.theme,
      targetWords: features.maxStoryWords,
      continuation,
    });
  } catch (err) {
    console.error('generateStory failed', err);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }

  // Create series on first continuation request with no series yet, optional
  // (not auto-created here; UI may later promote to a series)

  const shareSlug = features.shareLinks ? randomSlug(12) : null;

  const { data: inserted, error: insertErr } = await admin
    .from('stories')
    .insert({
      user_id: user.id,
      child_id: child.id,
      series_id: seriesId,
      title: result.title,
      text: result.text,
      mode: parsed.mode,
      share_slug: shareSlug,
      model: result.model,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      estimated_cost_cents: result.estimatedCostCents,
    })
    .select('*')
    .single();

  if (insertErr || !inserted) {
    console.error('insert story failed', insertErr);
    return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  }

  // Usage + memory (best-effort)
  await Promise.all([
    incrementUsage(admin, user.id, { stories: 1, costCents: result.estimatedCostCents }),
    updateChildMemoryAfterStory(admin, child.id, {
      lastStoryTitle: result.title,
      lastStorySummary: result.summary,
    }),
  ]);

  return NextResponse.json({ story: inserted });
}

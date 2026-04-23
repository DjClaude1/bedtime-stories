import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { generateSceneImage, pickScenes } from '@/lib/ai/images';
import { incrementUsage } from '@/lib/db/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  story_id: z.string().uuid(),
  count: z.number().int().min(1).max(3).default(2),
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
  if (!features.aiIllustrations) {
    return NextResponse.json({ error: 'feature_locked', feature: 'aiIllustrations' }, { status: 402 });
  }

  const { data: story } = await admin
    .from('stories')
    .select('id, title, text, image_urls, user_id')
    .eq('id', parsed.story_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((story.image_urls ?? []).length > 0) {
    return NextResponse.json({ image_urls: story.image_urls });
  }

  let scenes: string[];
  try {
    scenes = await pickScenes(story.text, parsed.count);
  } catch {
    scenes = [];
  }
  if (scenes.length === 0) scenes = ['a cozy bedroom at night with moonlight through the window'];

  const urls: string[] = [];
  let totalCost = 0;
  for (let i = 0; i < scenes.length; i++) {
    try {
      const img = await generateSceneImage({ storyTitle: story.title, sceneDescription: scenes[i] });
      totalCost += img.estimatedCostCents;
      const path = `${user.id}/${story.id}/${i}.png`;
      const { error: upErr } = await admin.storage
        .from('images')
        .upload(path, img.buffer, { contentType: 'image/png', upsert: true });
      if (upErr) continue;
      const { data: pub } = admin.storage.from('images').getPublicUrl(path);
      urls.push(pub.publicUrl);
    } catch (err) {
      console.error('image gen failed', err);
    }
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: 'image_failed' }, { status: 502 });
  }

  await admin.from('stories').update({ image_urls: urls }).eq('id', story.id);
  await incrementUsage(admin, user.id, { images: urls.length, costCents: totalCost });

  return NextResponse.json({ image_urls: urls });
}

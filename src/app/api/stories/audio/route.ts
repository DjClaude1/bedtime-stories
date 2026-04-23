import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { synthesizeSpeech } from '@/lib/ai/tts';
import { incrementUsage } from '@/lib/db/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ story_id: z.string().uuid(), voice: z.string().optional() });

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

  if (!features.audioNarration) {
    return NextResponse.json({ error: 'feature_locked', feature: 'audioNarration' }, { status: 402 });
  }
  if (parsed.voice && !features.premiumVoices && parsed.voice !== 'nova') {
    return NextResponse.json({ error: 'feature_locked', feature: 'premiumVoices' }, { status: 402 });
  }

  const { data: story } = await admin
    .from('stories')
    .select('id, text, audio_url, user_id')
    .eq('id', parsed.story_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (story.audio_url) {
    return NextResponse.json({ audio_url: story.audio_url });
  }

  let tts;
  try {
    tts = await synthesizeSpeech(story.text, parsed.voice);
  } catch (err) {
    console.error('tts failed', err);
    return NextResponse.json({ error: 'tts_failed' }, { status: 502 });
  }

  const path = `${user.id}/${story.id}.mp3`;
  const { error: upErr } = await admin.storage
    .from('audio')
    .upload(path, tts.buffer, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) {
    console.error('upload failed', upErr);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }
  const { data: pub } = admin.storage.from('audio').getPublicUrl(path);
  const audioUrl = pub.publicUrl;

  await admin.from('stories').update({ audio_url: audioUrl }).eq('id', story.id);
  await incrementUsage(admin, user.id, { audio: 1, costCents: tts.estimatedCostCents });

  return NextResponse.json({ audio_url: audioUrl });
}

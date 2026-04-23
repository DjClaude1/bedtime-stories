import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  story_id: z.string().uuid(),
  title: z.string().trim().min(1).max(80),
  child_id: z.string().uuid(),
});

/**
 * Lazily promote a story to a series (creates the series row + links the story).
 * Called by the "Continue the story" button on the reader.
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

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');

  const { data: story } = await admin
    .from('stories')
    .select('id, series_id, child_id')
    .eq('id', parsed.story_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (story.series_id) {
    const { data: existing } = await admin.from('series').select('*').eq('id', story.series_id).single();
    return NextResponse.json({ series: existing });
  }

  const { data: series, error } = await admin
    .from('series')
    .insert({ title: parsed.title, child_id: parsed.child_id, user_id: user.id })
    .select('*')
    .single();
  if (error || !series) return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  await admin.from('stories').update({ series_id: series.id }).eq('id', story.id);
  return NextResponse.json({ series });
}

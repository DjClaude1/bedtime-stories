import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);
  const today = new Date().toISOString().slice(0, 10);

  const [todayRow, recent, countResp] = await Promise.all([
    admin.from('usage').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    admin
      .from('usage')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(14),
    admin.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return NextResponse.json({
    plan: user.plan,
    features,
    today: todayRow.data ?? { stories_generated: 0, audio_generated: 0, images_generated: 0, estimated_cost_cents: 0 },
    recent: recent.data ?? [],
    total_stories: countResp.count ?? 0,
  });
}

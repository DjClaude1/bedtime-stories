import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(1).max(14).optional(),
  preferences: z
    .object({
      interests: z.array(z.string().trim().max(40)).max(10).optional(),
      favoriteCharacters: z.array(z.string().trim().max(40)).max(8).optional(),
      notes: z.string().trim().max(300).optional(),
    })
    .optional(),
});

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const { data } = await admin
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  return NextResponse.json({ children: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);

  if (features.maxChildren !== -1) {
    const { count } = await admin
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if ((count ?? 0) >= features.maxChildren) {
      return NextResponse.json(
        { error: 'plan_limit_reached', limit: features.maxChildren, plan: user.plan },
        { status: 402 },
      );
    }
  }

  const { data, error } = await admin
    .from('children')
    .insert({
      user_id: user.id,
      name: parsed.name,
      age: parsed.age ?? null,
      preferences: parsed.preferences ?? {},
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  return NextResponse.json({ child: data });
}

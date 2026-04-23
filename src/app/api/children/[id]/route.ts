import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  age: z.number().int().min(1).max(14).nullable().optional(),
  preferences: z
    .object({
      interests: z.array(z.string().trim().max(40)).max(10).optional(),
      favoriteCharacters: z.array(z.string().trim().max(40)).max(8).optional(),
      notes: z.string().trim().max(300).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const { data, error } = await admin
    .from('children')
    .update(parsed)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'db_failed' }, { status: 500 });
  return NextResponse.json({ child: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  await admin.from('children').delete().eq('id', params.id).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/app';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Make sure a public.users row exists (trigger usually handles this, this is a safety net).
      try {
        const admin = createSupabaseAdminClient();
        await ensureAppUser(admin, data.user.id, data.user.email ?? '');
      } catch {
        // non-fatal
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

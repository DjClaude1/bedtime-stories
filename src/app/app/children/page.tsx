import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { ChildrenManager } from '@/components/ChildrenManager';
import type { Child } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ChildrenPage() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);

  const { data: children } = await admin
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <main className="container-app pt-4 pb-24">
      <h1 className="font-serif text-2xl mb-4">Children</h1>
      <ChildrenManager
        initial={(children ?? []) as Child[]}
        maxChildren={features.maxChildren}
        plan={user.plan}
      />
    </main>
  );
}

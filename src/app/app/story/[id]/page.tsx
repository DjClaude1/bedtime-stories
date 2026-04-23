import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { StoryReader } from '@/components/StoryReader';
import type { Child, Story } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);

  const { data: story } = await admin
    .from('stories')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!story) notFound();

  const { data: child } = await admin
    .from('children')
    .select('*')
    .eq('id', story.child_id)
    .maybeSingle();

  return (
    <main className="container-app pt-4 pb-24">
      <StoryReader
        story={story as Story}
        child={child as Child | null}
        features={features}
      />
    </main>
  );
}

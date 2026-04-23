import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { StoryGenerator } from '@/components/StoryGenerator';
import type { Child } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewStoryPage() {
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
    .order('created_at');

  if (!children || children.length === 0) {
    return (
      <main className="container-app pt-4 pb-24">
        <div className="card">
          <h1 className="font-serif text-2xl mb-2">Add your first little one</h1>
          <p className="text-night-200/80 text-sm mb-4">We&apos;ll weave them into every story.</p>
          <Link href="/app/children" className="btn-primary">Add child</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-app pt-4 pb-24">
      <h1 className="font-serif text-2xl mb-4">Tonight&apos;s story</h1>
      <StoryGenerator childList={children as Child[]} features={features} plan={user.plan} />
    </main>
  );
}

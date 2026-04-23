import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles, Plus } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);

  const [{ data: children }, { data: stories }, { data: today }] = await Promise.all([
    admin.from('children').select('*').eq('user_id', user.id).order('created_at'),
    admin
      .from('stories')
      .select('id, title, created_at, child_id, mode')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('usage')
      .select('stories_generated')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle(),
  ]);

  const hasChildren = (children?.length ?? 0) > 0;
  const storiesToday = today?.stories_generated ?? 0;
  const dailyLimit = features.dailyStoryLimit;

  return (
    <main className="container-app pt-4 pb-24">
      <div className="card mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-night-300 text-xs uppercase tracking-widest">Tonight</p>
            <h1 className="font-serif text-2xl">
              {hasChildren
                ? `A calm story for ${children![0].name}?`
                : 'Add your little one to begin.'}
            </h1>
            <p className="text-night-200/70 text-sm mt-1">
              {dailyLimit === -1
                ? 'Unlimited stories on your plan.'
                : `${storiesToday} / ${dailyLimit} stories today · ${user.plan} plan`}
            </p>
          </div>
          {hasChildren ? (
            <Link href="/app/new" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Begin a story
            </Link>
          ) : (
            <Link href="/app/children" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add child
            </Link>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-serif text-lg mb-3">Recent stories</h2>
        {(!stories || stories.length === 0) ? (
          <div className="card text-night-200/70 text-sm">
            No stories yet. When you create one, it will land here softly.
          </div>
        ) : features.storyHistory ? (
          <ul className="space-y-2">
            {stories.map((s) => {
              const child = children?.find((c) => c.id === s.child_id);
              return (
                <li key={s.id}>
                  <Link
                    href={`/app/story/${s.id}`}
                    className="card block hover:border-night-400 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-serif text-base">{s.title}</div>
                        <div className="text-xs text-night-300/80 mt-1">
                          {child?.name ?? 'Moonlit'} · {s.mode} · {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-night-300 text-sm">→</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card">
            <p className="text-night-200/80 text-sm mb-3">
              Story history is part of the Basic plan and up. Your most recent story is always available below.
            </p>
            {stories[0] && (
              <Link
                href={`/app/story/${stories[0].id}`}
                className="btn-ghost inline-flex items-center gap-2"
              >
                Read &quot;{stories[0].title}&quot;
              </Link>
            )}
            <div className="mt-3">
              <Link href="/pricing" className="underline text-sm">Upgrade for full history</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

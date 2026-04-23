import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todayRow }, { data: recent }, { count: total }] = await Promise.all([
    admin.from('usage').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    admin
      .from('usage')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(14),
    admin.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const t = todayRow ?? { stories_generated: 0, audio_generated: 0, images_generated: 0, estimated_cost_cents: 0 };

  return (
    <main className="container-app pt-4 pb-24 space-y-6">
      <h1 className="font-serif text-2xl">Your bedtime history</h1>
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Today's stories" value={`${t.stories_generated}${features.dailyStoryLimit === -1 ? '' : ` / ${features.dailyStoryLimit}`}`} />
        <Stat label="Today's audio" value={String(t.audio_generated)} />
        <Stat label="Today's images" value={String(t.images_generated)} />
        <Stat label="All-time stories" value={String(total ?? 0)} />
      </div>

      <section className="card">
        <h2 className="font-serif text-lg mb-3">Last 14 days</h2>
        {(!recent || recent.length === 0) ? (
          <p className="text-night-200/70 text-sm">No activity yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recent.map((r) => (
              <li key={r.date} className="flex justify-between border-b border-night-800/60 py-1.5">
                <span className="text-night-300">{r.date}</span>
                <span className="text-night-100">
                  {r.stories_generated} stories
                  {r.audio_generated ? ` · ${r.audio_generated} audio` : ''}
                  {r.images_generated ? ` · ${r.images_generated} images` : ''}
                  {r.estimated_cost_cents > 0 ? ` · ~$${(Number(r.estimated_cost_cents) / 100).toFixed(3)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="card">
        <p className="text-sm text-night-200/80">
          You&apos;re on the <span className="text-night-300">{user.plan}</span> plan.
        </p>
        <Link href="/pricing" className="underline text-sm">Compare plans</Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-night-300 uppercase tracking-widest">{label}</div>
      <div className="font-serif text-2xl mt-1">{value}</div>
    </div>
  );
}

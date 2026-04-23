'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { Child, Plan, StoryMode } from '@/lib/types';
import type { PlanFeatures } from '@/lib/features';

export function StoryGenerator({
  childList,
  features,
  plan,
}: {
  childList: Child[];
  features: PlanFeatures;
  plan: Plan;
}) {
  const router = useRouter();
  const [childId, setChildId] = useState(childList[0]?.id ?? '');
  const [mode, setMode] = useState<StoryMode>('sleep');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUpgradeMsg(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, mode, theme: theme.trim() || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.error === 'daily_limit_reached') {
          setUpgradeMsg(`You've used your ${data.limit} story today on the ${data.plan} plan. Your next one lands tomorrow — or upgrade for more.`);
          return;
        }
        if (data.error === 'rate_limited') {
          setError(`Please wait ${Math.ceil(data.retry_ms / 1000)}s between stories.`);
          return;
        }
        throw new Error(data.error || 'Failed');
      }
      router.push(`/app/story/${data.story.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label>Tonight is for…</label>
        <select value={childId} onChange={(e) => setChildId(e.target.value)}>
          {childList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.age ? ` (${c.age})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Story mode</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['sleep','adventure','educational','moral'] as StoryMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'rounded-xl border px-3 py-2 text-sm transition ' +
                (mode === m
                  ? 'bg-night-700/70 border-night-400 text-white'
                  : 'bg-night-900/40 border-night-800 text-night-200 hover:border-night-400')
              }
            >
              {labelFor(m)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label>Tonight&apos;s gentle theme (optional)</label>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. a tiny firefly who learns patience"
          maxLength={200}
        />
      </div>

      <div className="text-xs text-night-300/70">
        Plan: <span className="text-night-300">{plan}</span> ·{' '}
        Daily limit: {features.dailyStoryLimit === -1 ? 'unlimited' : features.dailyStoryLimit} ·{' '}
        Length: ~{features.maxStoryWords} words
      </div>

      {error && <p className="text-red-300 text-sm">{error}</p>}
      {upgradeMsg && (
        <div className="text-sm text-night-100 bg-night-800/60 border border-night-700 rounded-xl p-3">
          {upgradeMsg}
          <div className="mt-2">
            <Link href="/pricing" className="underline">See plans</Link>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2 w-full justify-center">
        <Sparkles className="w-4 h-4" /> {loading ? 'Gathering moonbeams…' : 'Begin the story'}
      </button>
    </form>
  );
}

function labelFor(m: StoryMode): string {
  switch (m) {
    case 'sleep': return 'Sleep';
    case 'adventure': return 'Adventure';
    case 'educational': return 'Learn';
    case 'moral': return 'Lesson';
  }
}

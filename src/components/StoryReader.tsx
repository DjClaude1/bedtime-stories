'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, Image as ImageIcon, Share2, Download, Sparkles, Loader2, Check, Copy } from 'lucide-react';
import type { Child, Story } from '@/lib/types';
import type { PlanFeatures } from '@/lib/features';

export function StoryReader({
  story,
  child,
  features,
}: {
  story: Story;
  child: Child | null;
  features: PlanFeatures;
}) {
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState<string | null>(story.audio_url);
  const [images, setImages] = useState<string[]>(story.image_urls ?? []);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function genAudio() {
    if (!features.audioNarration) {
      router.push('/pricing');
      return;
    }
    setError(null);
    setLoadingAudio(true);
    try {
      const resp = await fetch('/api/stories/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: story.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Audio failed');
      setAudioUrl(data.audio_url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Audio failed');
    } finally {
      setLoadingAudio(false);
    }
  }

  async function genImages() {
    if (!features.aiIllustrations) {
      router.push('/pricing');
      return;
    }
    setError(null);
    setLoadingImages(true);
    try {
      const resp = await fetch('/api/stories/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: story.id, count: 2 }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Images failed');
      setImages(data.image_urls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Images failed');
    } finally {
      setLoadingImages(false);
    }
  }

  async function doContinue() {
    if (!features.continueStory) {
      router.push('/pricing');
      return;
    }
    setContinuing(true);
    try {
      // Ensure we have a series_id; if not, create one lazily by using story id as seed
      const seriesId = story.series_id ?? (await ensureSeries(story.id, story.title, story.child_id));
      const resp = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: story.child_id,
          mode: story.mode,
          series_id: seriesId,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Continue failed');
      router.push(`/app/story/${data.story.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Continue failed');
    } finally {
      setContinuing(false);
    }
  }

  async function copyShare() {
    if (!story.share_slug) return;
    const url = `${window.location.origin}/share/${story.share_slug}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  return (
    <article className="space-y-4">
      <header>
        <p className="text-night-300 text-xs tracking-widest uppercase">
          {child?.name ? `For ${child.name}` : 'Tonight'} · {story.mode}
        </p>
        <h1 className="font-serif text-3xl mt-1">{story.title}</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {audioUrl ? null : (
          <button onClick={genAudio} disabled={loadingAudio} className="btn-ghost inline-flex items-center gap-2">
            {loadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
            {features.audioNarration ? 'Narrate' : 'Narrate (Pro)'}
          </button>
        )}
        {images.length === 0 && (
          <button onClick={genImages} disabled={loadingImages} className="btn-ghost inline-flex items-center gap-2">
            {loadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {features.aiIllustrations ? 'Illustrate' : 'Illustrate (Premium)'}
          </button>
        )}
        {story.share_slug && (
          <button onClick={copyShare} className="btn-ghost inline-flex items-center gap-2">
            {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? 'Copied' : 'Share'}
          </button>
        )}
        {features.pdfExport ? (
          <a
            href={`/api/stories/pdf?story_id=${story.id}`}
            className="btn-ghost inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> PDF
          </a>
        ) : (
          <Link href="/pricing" className="btn-ghost inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> PDF (Pro)
          </Link>
        )}
      </div>

      {audioUrl && (
        <div className="card">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="w-full" preload="none" />
        </div>
      )}

      {images[0] && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={images[0]} alt="" className="rounded-2xl w-full" />
      )}

      <div className="card">
        <p className="story-body">{story.text}</p>
      </div>

      {images.slice(1).map((u) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={u} src={u} alt="" className="rounded-2xl w-full" />
      ))}

      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <button
          onClick={doContinue}
          disabled={continuing}
          className="btn-primary inline-flex items-center gap-2"
        >
          {continuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {features.continueStory ? 'Continue the story' : 'Continue (Basic+)'}
        </button>
        <Link href="/app/new" className="btn-ghost inline-flex items-center gap-2">
          <Copy className="w-4 h-4" /> New story
        </Link>
      </div>

      {error && <p className="text-red-300 text-sm">{error}</p>}
    </article>
  );
}

async function ensureSeries(storyId: string, title: string, childId: string): Promise<string | null> {
  const resp = await fetch('/api/series', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ story_id: storyId, title, child_id: childId }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.series?.id ?? null;
}

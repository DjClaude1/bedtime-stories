import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Moon } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SharedStoryPage({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdminClient();
  const { data: story } = await admin
    .from('stories')
    .select('title, text, image_urls, audio_url')
    .eq('share_slug', params.slug)
    .maybeSingle();
  if (!story) notFound();

  return (
    <main className="container-app pt-8 pb-24">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Moon className="w-5 h-5 text-night-300" />
        <span className="font-serif">Moonlit</span>
      </Link>
      <article className="card">
        <h1 className="font-serif text-3xl mb-4">{story.title}</h1>
        {story.audio_url && (
          <audio controls src={story.audio_url} className="w-full mb-4" />
        )}
        {(story.image_urls ?? []).slice(0, 1).map((u: string) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={u} src={u} alt="" className="rounded-2xl w-full mb-4" />
        ))}
        <p className="story-body">{story.text}</p>
        {(story.image_urls ?? []).slice(1).map((u: string) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={u} src={u} alt="" className="rounded-2xl w-full mt-6" />
        ))}
      </article>
      <p className="text-center text-sm text-night-300/70 mt-8">
        Want a story like this for your little one?{' '}
        <Link href="/" className="underline">Try Moonlit</Link>
      </p>
    </main>
  );
}

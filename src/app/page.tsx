import Link from 'next/link';
import { Moon, Sparkles, Heart, Headphones, BookOpen, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="container-app pt-10 pb-24">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <Moon className="w-6 h-6 text-night-300 animate-floaty" />
          <span className="font-serif text-xl">Moonlit</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
        </nav>
      </header>

      <section className="text-center mb-16">
        <p className="text-night-300 text-sm tracking-widest uppercase mb-4">Bedtime, re-imagined</p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-4">
          A new magical story,<br/>
          <span className="text-night-300">every night.</span>
        </h1>
        <p className="text-night-200/80 text-base sm:text-lg max-w-xl mx-auto mb-8">
          Soft, personalized bedtime stories starring your child — crafted to calm little minds and
          gently carry them into dreams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tuck in with a story
          </Link>
          <Link href="/pricing" className="btn-ghost">See plans</Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 mb-16">
        <FeatureCard
          icon={<Heart className="w-5 h-5" />}
          title="Personal & tender"
          body="Your child is the hero. We weave their name, interests, and favorite characters into every story."
        />
        <FeatureCard
          icon={<Headphones className="w-5 h-5" />}
          title="Soft narrated audio"
          body="Calming voice narration to help eyes grow heavy, without parents losing their voice."
        />
        <FeatureCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Continue the adventure"
          body="Pick up tomorrow where tonight ended — characters, settings, and gentle memories carry on."
        />
        <FeatureCard
          icon={<Users className="w-5 h-5" />}
          title="Every little one"
          body="Add multiple children — each with their own bedtime world, vocabulary, and dreams."
        />
      </section>

      <section className="card text-center">
        <p className="text-night-300 text-sm uppercase tracking-widest mb-2">How it feels</p>
        <p className="font-serif text-lg italic text-night-100 leading-relaxed">
          “Tonight, a little moonbeam tiptoed across Maya&apos;s pillow, whispering that it was time to
          float, just softly, into a dream about her brave little bunny friend…”
        </p>
      </section>

      <footer className="text-center text-xs text-night-300/60 mt-16">
        Made with moonlight. Sweet dreams.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2 text-night-300">{icon}<span className="font-medium">{title}</span></div>
      <p className="text-night-100/80 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

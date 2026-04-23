'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Moon } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-app pt-10 pb-24">
      <Link href="/" className="flex items-center gap-2 mb-12">
        <Moon className="w-6 h-6 text-night-300" />
        <span className="font-serif text-xl">Moonlit</span>
      </Link>

      <div className="card max-w-md mx-auto">
        <h1 className="font-serif text-2xl mb-2">Welcome back</h1>
        <p className="text-night-200/80 text-sm mb-6">
          Enter your email — we&apos;ll send a magic link. No passwords, no fuss.
        </p>

        {sent ? (
          <div className="text-night-100">
            <p className="mb-2">Check your inbox 💌</p>
            <p className="text-sm text-night-200/80">
              We sent a magic link to <span className="text-night-300">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

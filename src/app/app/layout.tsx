import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Moon, Plus, BookOpen, Users, BarChart3, LogOut } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return (
    <div className="min-h-screen">
      <header className="container-app pt-6 pb-3 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-night-300" />
          <span className="font-serif">Moonlit</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/app/new" className="btn-ghost !py-2 !px-3 inline-flex items-center gap-1">
            <Plus className="w-4 h-4" /> New
          </Link>
          <Link href="/app" className="btn-ghost !py-2 !px-3 inline-flex items-center gap-1">
            <BookOpen className="w-4 h-4" /> Stories
          </Link>
          <Link href="/app/children" className="btn-ghost !py-2 !px-3 inline-flex items-center gap-1">
            <Users className="w-4 h-4" /> Kids
          </Link>
          <Link href="/app/usage" className="btn-ghost !py-2 !px-3 inline-flex items-center gap-1">
            <BarChart3 className="w-4 h-4" /> Usage
          </Link>
          <SignOutButton>
            <span className="inline-flex items-center gap-1"><LogOut className="w-4 h-4" /></span>
          </SignOutButton>
        </nav>
      </header>
      {children}
    </div>
  );
}

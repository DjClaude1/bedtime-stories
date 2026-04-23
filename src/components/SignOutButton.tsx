'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function SignOutButton({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost !py-2 !px-3"
      onClick={async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      {children ?? 'Sign out'}
    </button>
  );
}

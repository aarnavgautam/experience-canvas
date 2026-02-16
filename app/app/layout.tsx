import { ReactNode } from 'react';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col gap-4">
      <header className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
        <Link href="/app" className="text-sm font-semibold">
          Experience Canvas
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {user?.email && <span>{user.email}</span>}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}


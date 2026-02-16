'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'exchanging' | 'done' | 'error'>('exchanging');

  useEffect(() => {
    const code = searchParams.get('code');
    const redirectTo = searchParams.get('redirectTo') ?? '/app';

    if (!code) {
      router.replace('/login');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          return;
        }
        setStatus('done');
        router.replace(redirectTo);
      })
      .catch(() => setStatus('error'));
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-sm text-red-400">Sign-in failed. The link may have expired.</p>
        <a href="/login" className="mt-4 text-sm text-sky-400 hover:underline">
          Try again
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="text-sm text-slate-300">Signing you in…</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <p className="text-sm text-slate-300">Loading…</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

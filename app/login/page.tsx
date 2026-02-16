'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const schema = z.object({
  email: z.string().email('Enter a valid email')
});

type FormValues = z.infer<typeof schema>;

function LoginContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    setStatus(null);
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        (typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback') +
        (searchParams?.get('redirectTo')
          ? `?redirectTo=${encodeURIComponent(
              searchParams.get('redirectTo') as string
            )}`
          : '');

      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) {
        const msg = error.message.toLowerCase().includes('rate')
          ? 'Too many emails sent. Wait about an hour or try another address.'
          : error.message;
        setStatus(msg);
      } else {
        setStatus('Magic link sent! Check your email (and spam).');
      }
    } catch (err: any) {
      setStatus(err.message ?? 'Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/70 p-6 shadow-lg shadow-slate-950/60">
        <h1 className="mb-2 text-center text-2xl font-semibold">
          Experience Canvas
        </h1>
        <p className="mb-6 text-center text-sm text-slate-300">
          Private-by-default canvas for your photos, videos, and memories.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-sky-500 focus:ring-2"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending link…' : 'Send magic link'}
          </button>
        </form>
        {status && (
          <p className="mt-4 text-center text-xs text-slate-300">{status}</p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
          <p className="text-center text-sm text-slate-400">Loading…</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}


'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required')
});

const signUpSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Use at least 6 characters')
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function LoginContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('in');

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema)
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema)
  });

  const redirectTo = searchParams?.get('redirectTo') ?? '/app';

  const onSignIn = async (values: SignInValues) => {
    setStatus(null);
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });
      if (error) {
        setStatus(error.message);
        return;
      }
      window.location.href = redirectTo;
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignUp = async (values: SignUpValues) => {
    setStatus(null);
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { emailRedirectTo: undefined }
      });
      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus('Account created. You can sign in now.');
      setMode('in');
      signInForm.setValue('email', values.email);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Unexpected error');
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

        {mode === 'in' ? (
          <>
            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
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
                  {...signInForm.register('email')}
                />
                {signInForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-400">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-sky-500 focus:ring-2"
                  placeholder="••••••••"
                  {...signInForm.register('password')}
                />
                {signInForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-400">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-400">
              No account?{' '}
              <button
                type="button"
                onClick={() => setMode('up')}
                className="text-sky-400 hover:underline"
              >
                Create one
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="signup-email">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-sky-500 focus:ring-2"
                  placeholder="you@example.com"
                  {...signUpForm.register('email')}
                />
                {signUpForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-400">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-sky-500 focus:ring-2"
                  placeholder="At least 6 characters"
                  {...signUpForm.register('password')}
                />
                {signUpForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-400">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('in')}
                className="text-sky-400 hover:underline"
              >
                Sign in
              </button>
            </p>
          </>
        )}

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

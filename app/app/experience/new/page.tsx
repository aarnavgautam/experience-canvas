'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  start_at: z.string().min(1, 'Start date is required'),
  end_at: z.string().optional(),
  location_name: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function NewExperiencePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setStatus(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('experiences')
        .insert({
          title: values.title,
          start_at: new Date(values.start_at).toISOString(),
          end_at: values.end_at
            ? new Date(values.end_at).toISOString()
            : null,
          location_name: values.location_name || null
        } as any)
        .select('id')
        .single();

      if (error) {
        setStatus(error.message);
        return;
      }

      const id = (data as { id: string })?.id;
      if (id) router.push(`/app/experience/${id}`);
    } catch (err: any) {
      setStatus(err.message ?? 'Unexpected error');
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h1 className="mb-3 text-lg font-semibold">New Experience</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs font-medium" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-400">
              {errors.title.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              className="mb-1 block text-xs font-medium"
              htmlFor="start_at"
            >
              Start
            </label>
            <input
              id="start_at"
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              {...register('start_at')}
            />
            {errors.start_at && (
              <p className="mt-1 text-xs text-red-400">
                {errors.start_at.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="end_at">
              End (optional)
            </label>
            <input
              id="end_at"
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              {...register('end_at')}
            />
          </div>
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-medium"
            htmlFor="location_name"
          >
            Location (optional)
          </label>
          <input
            id="location_name"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            {...register('location_name')}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Creating…' : 'Create Experience'}
        </button>
        {status && (
          <p className="mt-2 text-xs text-slate-300" role="status">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}


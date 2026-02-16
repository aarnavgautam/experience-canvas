'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const schema = z.object({
  content: z.string().min(1, 'Write something first')
});

type FormValues = z.infer<typeof schema>;

type Props = {
  experienceId: string;
};

export function JournalForm({ experienceId }: Props) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setStatus(null);
    try {
      const { error } = await supabase.from('journal_entries').insert({
        experience_id: experienceId,
        content: values.content
      });
      if (error) {
        setStatus(error.message);
        return;
      }
      reset();
      setStatus('Saved.');
      router.refresh();
    } catch (err: any) {
      setStatus(err.message ?? 'Could not save entry');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 text-xs">
      <label className="block font-medium" htmlFor="journal">
        Journal entry
      </label>
      <textarea
        id="journal"
        rows={3}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        placeholder="Thoughts, context, story…"
        {...register('content')}
      />
      {errors.content && (
        <p className="text-[11px] text-red-400">{errors.content.message}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Saving…' : 'Add entry'}
      </button>
      {status && (
        <p className="text-[11px] text-slate-200" role="status">
          {status}
        </p>
      )}
    </form>
  );
}


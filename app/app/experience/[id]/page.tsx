import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { AssetUpload } from '@/components/experience/AssetUpload';
import { VoiceRecorder } from '@/components/experience/VoiceRecorder';
import { JournalForm } from '@/components/experience/JournalForm';

type Props = {
  params: { id: string };
};

export default async function ExperiencePage({ params }: Props) {
  const supabase = await getSupabaseServerClient();

  const { data: experienceData } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', params.id)
    .single();

  type ExperienceRow = {
    id: string;
    title: string;
    start_at: string;
    end_at: string | null;
    location_name: string | null;
  };
  const experience = experienceData as ExperienceRow | null;
  if (!experience) {
    notFound();
  }

  const { data: assetsData } = await supabase
    .from('assets')
    .select('*')
    .eq('experience_id', experience.id)
    .order('captured_at', { ascending: true });

  type AssetRow = {
    id: string;
    kind: string;
    storage_path: string;
    original_filename: string | null;
    captured_at: string | null;
  };
  const assets = (assetsData ?? []) as AssetRow[];

  const { data: journalsData } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('experience_id', experience.id)
    .order('created_at', { ascending: true });

  type JournalRow = { id: string; content: string; created_at: string };
  const journals = (journalsData ?? []) as JournalRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{experience.title}</h1>
          <p className="text-xs text-slate-300">
            {new Date(experience.start_at).toLocaleString()}
            {experience.end_at
              ? ` – ${new Date(experience.end_at).toLocaleString()}`
              : ''}
            {experience.location_name && (
              <span className="ml-2 text-slate-400">
                • {experience.location_name}
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/app/experience/${experience.id}/collage`}
          className="rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400"
        >
          Open photo editor
        </Link>
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <AssetUpload experienceId={experience.id} />
          <VoiceRecorder experienceId={experience.id} />
          <JournalForm experienceId={experience.id} />
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Media timeline
            </h2>
            {assets.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 text-[11px]">
                {assets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex flex-col rounded-md border border-slate-800 bg-slate-950/60 p-2"
                  >
                    <span className="mb-1 text-[10px] uppercase text-slate-400">
                      {asset.kind}
                    </span>
                    <span className="truncate text-[11px]">
                      {asset.original_filename ?? asset.storage_path}
                    </span>
                    {asset.captured_at && (
                      <span className="mt-1 text-[10px] text-slate-400">
                        {new Date(asset.captured_at).toLocaleString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No media yet. Upload photos, videos, or voice notes.
              </p>
            )}
          </div>
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Journal
            </h2>
            {journals.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {journals.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-slate-800 bg-slate-950/60 p-2"
                  >
                    <p className="whitespace-pre-wrap text-slate-100">
                      {entry.content}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No journal entries yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


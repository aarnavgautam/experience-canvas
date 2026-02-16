import Link from 'next/link';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database, CollageElement } from '@/lib/types/database';

const CollageEditor = dynamic(
  () => import('@/components/collage/CollageEditor').then((m) => m.CollageEditor),
  { ssr: false }
);

type Props = {
  params: { id: string };
};

export default async function CollagePage({ params }: Props) {
  const supabase = await getSupabaseServerClient();

  const { data: experienceData } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', params.id)
    .single();

  const experience = experienceData as { id: string; title: string } | null;
  if (!experience) {
    notFound();
  }

  const { data: pageData } = await supabase
    .from('collage_pages')
    .select('*')
    .eq('experience_id', experience.id)
    .eq('name', 'Main')
    .maybeSingle();

  type CollagePageRow = {
    id?: string;
    width?: number;
    height?: number;
    background?: string;
    elements?: unknown;
  };
  const page = pageData as CollagePageRow | null;

  const { data: assetsData } = await supabase
    .from('assets')
    .select('id, kind, storage_path, original_filename')
    .eq('experience_id', experience.id)
    .in('kind', ['photo', 'video']);

  type AssetRow = { id: string; kind: string; storage_path: string; original_filename: string | null };
  const assets = (assetsData ?? []) as AssetRow[];

  const initialPreviewUrls: Record<string, string> = {};
  const initialThumbnailUrls: Record<string, string> = {};
  const THUMB_SIZE = 200;
  const CANVAS_MAX_SIZE = 1200; // decent quality, faster load than full res
  if (assets.length > 0) {
    const admin = getSupabaseAdmin();
    await Promise.all(
      assets.map(async (asset) => {
        const isPhoto = asset.kind === 'photo';
        const fullRes = await admin.storage
          .from('user_uploads')
          .createSignedUrl(asset.storage_path, 60 * 60);
        const fullUrl = fullRes.data?.signedUrl;
        if (isPhoto) {
          const { data: mediumData } = await admin.storage
            .from('user_uploads')
            .createSignedUrl(asset.storage_path, 60 * 60, {
              transform: { width: CANVAS_MAX_SIZE, height: CANVAS_MAX_SIZE, resize: 'contain' }
            });
          initialPreviewUrls[asset.id] = mediumData?.signedUrl ?? fullUrl ?? '';
          const { data: thumbData } = await admin.storage
            .from('user_uploads')
            .createSignedUrl(asset.storage_path, 60 * 60, {
              transform: { width: THUMB_SIZE, height: THUMB_SIZE, resize: 'cover' }
            });
          initialThumbnailUrls[asset.id] = thumbData?.signedUrl ?? fullUrl ?? '';
        } else {
          if (fullUrl) initialPreviewUrls[asset.id] = fullUrl;
          initialThumbnailUrls[asset.id] = fullUrl ?? '';
        }
      })
    );
  }

  const width = page?.width ?? 1080;
  const height = page?.height ?? 1920;
  const background = page?.background ?? '#ffffff';
  const elements = (page?.elements as CollageElement[] | null) ?? [];

  const { data: journalsData } = await supabase
    .from('journal_entries')
    .select('id, content, created_at')
    .eq('experience_id', experience.id)
    .order('created_at', { ascending: true });
  type JournalRow = { id: string; content: string; created_at: string };
  const journals = (journalsData ?? []) as JournalRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            Photo editor — {experience.title}
          </h1>
          <p className="text-xs text-slate-300">
            Pick photos from the left, add them to the canvas, then drag and arrange. Add text, save, or export as PNG.
          </p>
        </div>
        <Link
          href={`/app/experience/${experience.id}`}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          ← Back to experience
        </Link>
      </div>
      <CollageEditor
        experienceId={experience.id}
        initialElements={elements}
        initialPreviewUrls={initialPreviewUrls}
        initialThumbnailUrls={initialThumbnailUrls}
        initialJournals={journals}
        pageId={page?.id ?? null}
        width={width}
        height={height}
        background={background}
      />
    </div>
  );
}


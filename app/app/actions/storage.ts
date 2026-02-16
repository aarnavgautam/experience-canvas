'use server';

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/lib/types/database';

export type UploadResult = { ok: boolean; message: string; count?: number };

/** Upload one or more files to user_uploads and insert asset rows. Uses service role so storage RLS is not required. */
export async function uploadAssets(
  experienceId: string,
  formData: FormData
): Promise<UploadResult> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { data: experience } = await supabase
    .from('experiences')
    .select('id')
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .single();

  if (!experience) {
    return { ok: false, message: 'Experience not found or access denied' };
  }

  const files = formData.getAll('files') as File[];
  if (!files.length) {
    return { ok: false, message: 'No files provided' };
  }

  const admin = getSupabaseAdmin();
  let successCount = 0;

  for (const file of files) {
    const path = `${user.id}/${experienceId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await admin.storage
      .from('user_uploads')
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    const kind: 'photo' | 'video' | 'audio' = file.type.startsWith('video')
      ? 'video'
      : 'photo';
    const capturedAt = new Date(file.lastModified || Date.now()).toISOString();

    const { error: insertError } = await admin.from('assets').insert({
      user_id: user.id,
      experience_id: experienceId,
      kind,
      storage_path: path,
      original_filename: file.name,
      captured_at: capturedAt
    } as any);

    if (!insertError) {
      successCount += 1;
    }
  }

  return {
    ok: true,
    message: `Uploaded ${successCount} file(s).`,
    count: successCount
  };
}

/** Upload a voice note blob (base64) and insert asset row. Uses service role. */
export async function uploadVoiceNote(
  experienceId: string,
  audioBase64: string,
  mimeType: string,
  filename: string
): Promise<UploadResult> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const { data: experience } = await supabase
    .from('experiences')
    .select('id')
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .single();

  if (!experience) {
    return { ok: false, message: 'Experience not found or access denied' };
  }

  const buf = Buffer.from(audioBase64, 'base64');
  const path = `${user.id}/${experienceId}/${filename}`;

  const admin = getSupabaseAdmin();
  const { error: uploadError } = await admin.storage
    .from('user_uploads')
    .upload(path, buf, { contentType: mimeType });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: insertError } = await admin.from('assets').insert({
    user_id: user.id,
    experience_id: experienceId,
    kind: 'audio',
    storage_path: path,
    original_filename: filename,
    captured_at: new Date().toISOString()
  } as any);

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  return { ok: true, message: 'Voice note saved.' };
}

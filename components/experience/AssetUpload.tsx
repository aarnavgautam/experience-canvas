'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAssets } from '@/app/app/actions/storage';

type Props = {
  experienceId: string;
};

export function AssetUpload({ experienceId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setStatus(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append('files', file);
      }
      const result = await uploadAssets(experienceId, formData);
      setStatus(result.message);
      if (result.ok) {
        router.refresh();
      }
    } catch (err: any) {
      setStatus(err.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <label className="block font-medium">Upload photos / videos</label>
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleChange}
        className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-700"
      />
      <p className="text-[11px] text-slate-400">
        Files are stored privately in Supabase Storage under your user
        folder.
      </p>
      {isUploading && (
        <p className="text-[11px] text-sky-300">Uploading… please wait.</p>
      )}
      {status && (
        <p className="text-[11px] text-slate-200" role="status">
          {status}
        </p>
      )}
    </div>
  );
}


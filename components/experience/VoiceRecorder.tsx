'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadVoiceNote } from '@/app/app/actions/storage';

type Props = {
  experienceId: string;
};

export function VoiceRecorder({ experienceId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const fileName = `voice-${Date.now()}.${mimeType === 'audio/webm' ? 'webm' : 'ogg'}`;
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          if (!base64) {
            setStatus('Could not read recording');
            return;
          }
          const result = await uploadVoiceNote(experienceId, base64, mimeType, fileName);
          setStatus(result.message);
          if (result.ok) {
            router.refresh();
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setStatus(err.message ?? 'Could not start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-400'
              : 'bg-slate-800 text-slate-50 hover:bg-slate-700'
          }`}
        >
          {isRecording ? 'Stop recording' : 'Record voice note'}
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        Voice notes are saved as private audio files in Supabase Storage.
      </p>
      {status && (
        <p className="text-[11px] text-slate-200" role="status">
          {status}
        </p>
      )}
    </div>
  );
}


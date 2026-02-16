'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Text as KonvaText, Transformer, Group, Circle, Line } from 'react-konva';
import useImage from 'use-image';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { CollageElement } from '@/lib/types/database';
import { JournalForm } from '@/components/experience/JournalForm';

type Asset = {
  id: string;
  kind: 'photo' | 'video' | 'audio';
  storage_path: string;
  original_filename: string | null;
};

type JournalEntry = { id: string; content: string; created_at: string };

type Props = {
  experienceId: string;
  initialElements: CollageElement[];
  initialPreviewUrls?: Record<string, string>;
  initialThumbnailUrls?: Record<string, string>;
  initialJournals?: JournalEntry[];
  pageId: string | null;
  width: number;
  height: number;
  background: string;
};

const GRID = 10;
const CANVAS_DISPLAY_MAX = 600;
const ADD_IMAGE_MAX_SIZE = 320;

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > ADD_IMAGE_MAX_SIZE || h > ADD_IMAGE_MAX_SIZE) {
        const r = Math.min(ADD_IMAGE_MAX_SIZE / w, ADD_IMAGE_MAX_SIZE / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      resolve({ width: w, height: h });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}
const FONT_FAMILIES = [
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' }
];

function ThumbnailButton({
  thumbUrl,
  label,
  onAdd
}: {
  thumbUrl: string | undefined;
  label: string;
  onAdd: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      onClick={onAdd}
      className="relative aspect-square overflow-hidden rounded-lg border border-slate-700 bg-slate-800/80 transition hover:border-sky-500 hover:ring-1 hover:ring-sky-500"
    >
      {!thumbUrl ? (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
          …
        </span>
      ) : (
        <>
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <span className="text-[10px] text-slate-500">Loading…</span>
            </div>
          )}
          <img
            src={thumbUrl}
            alt={label}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      )}
    </button>
  );
}

function ImageNode({
  element,
  selected,
  selectedRef,
  onChange,
  onSelect
}: {
  element: CollageElement;
  selected: boolean;
  selectedRef?: React.MutableRefObject<unknown>;
  onChange: (next: Partial<CollageElement>) => void;
  onSelect: () => void;
}) {
  const [image, status] = useImage(element.publicPreviewUrl ?? '', 'anonymous');

  return (
    <>
      {status === 'loading' && (
        <Rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="#334155"
          listening={false}
        />
      )}
      <KonvaImage
        ref={(node) => {
          if (selected && selectedRef) selectedRef.current = node;
        }}
        image={image ?? undefined}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        draggable
        stroke={selected ? '#38bdf8' : undefined}
        strokeWidth={selected ? 2 : 0}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          const x = Math.round(e.target.x() / GRID) * GRID;
          const y = Math.round(e.target.y() / GRID) * GRID;
          onChange({ x, y });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation()
          });
        }}
      />
    </>
  );
}

export function CollageEditor({
  experienceId,
  initialElements,
  initialPreviewUrls = {},
  initialThumbnailUrls = {},
  initialJournals = [],
  pageId,
  width,
  height,
  background: initialBackground
}: Props) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const stageRef = useRef<any>(null);
  const selectedNodeRef = useRef<unknown>(null);
  const transformerRef = useRef<any>(null);
  const [elements, setElements] = useState<CollageElement[]>(initialElements);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>(initialPreviewUrls);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(initialThumbnailUrls);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [background, setBackground] = useState(initialBackground);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      selectedNodeRef.current = null;
      transformerRef.current?.nodes([]);
      return;
    }
    const id = requestAnimationFrame(() => {
      const node = selectedNodeRef.current;
      if (node && transformerRef.current) {
        transformerRef.current.nodes([node]);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [selectedId]);

  useEffect(() => {
    setBackground(initialBackground);
  }, [initialBackground]);

  useEffect(() => {
    const loadAssets = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, kind, storage_path, original_filename')
        .eq('experience_id', experienceId)
        .in('kind', ['photo', 'video']);
      if (!error && data) {
        setAssets(data);
        if (Object.keys(initialPreviewUrls).length > 0) {
          setPreviewUrls(initialPreviewUrls);
        } else {
          const urlMap: Record<string, string> = {};
          await Promise.all(
            data.map(async (asset) => {
              const { data: urlData } = await supabase.storage
                .from('user_uploads')
                .createSignedUrl(asset.storage_path, 60 * 60);
              if (urlData?.signedUrl) urlMap[asset.id] = urlData.signedUrl;
            })
          );
          setPreviewUrls(urlMap);
        }
        if (Object.keys(initialThumbnailUrls).length > 0) {
          setThumbnailUrls(initialThumbnailUrls);
        } else {
          const thumbMap: Record<string, string> = {};
          await Promise.all(
            data.map(async (asset) => {
              const opts =
                asset.kind === 'photo'
                  ? { transform: { width: 200, height: 200, resize: 'cover' as const } }
                  : {};
              const { data: urlData } = await supabase.storage
                .from('user_uploads')
                .createSignedUrl(asset.storage_path, 60 * 60, opts);
              if (urlData?.signedUrl) thumbMap[asset.id] = urlData.signedUrl;
            })
          );
          setThumbnailUrls(thumbMap);
        }
      }
    };
    loadAssets();
  }, [experienceId, supabase, initialPreviewUrls, initialThumbnailUrls]);

  useEffect(() => {
    setElements((prev) =>
      prev.map((el) =>
        el.assetId && previewUrls[el.assetId]
          ? { ...el, publicPreviewUrl: previewUrls[el.assetId] }
          : el
      )
    );
  }, [previewUrls]);

  const preloadStartRef = useRef<number | null>(null);
  const [preloadLoaded, setPreloadLoaded] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);
  const [preloadEtaSeconds, setPreloadEtaSeconds] = useState<number | null>(null);

  // Preload medium-res images in the background; track progress and ETA
  useEffect(() => {
    if (typeof window === 'undefined' || Object.keys(previewUrls).length === 0) return;
    const toPreload = assets.filter((a) => previewUrls[a.id] && a.kind !== 'audio');
    if (toPreload.length === 0) return;

    preloadStartRef.current = Date.now();
    setPreloadTotal(toPreload.length);
    setPreloadLoaded(0);
    setPreloadEtaSeconds(null);

    toPreload.forEach((asset) => {
      const url = previewUrls[asset.id];
      if (!url) return;
      const img = new window.Image();
      img.onload = () => {
        setPreloadLoaded((n) => n + 1);
      };
      img.onerror = () => {
        setPreloadLoaded((n) => n + 1);
      };
      img.src = url;
    });
  }, [assets, previewUrls]);

  // Update ETA every second while preloading
  useEffect(() => {
    if (preloadLoaded >= preloadTotal || preloadTotal === 0) {
      setPreloadEtaSeconds(null);
      return;
    }
    const start = preloadStartRef.current;
    if (start == null || preloadLoaded === 0) return;

    const update = () => {
      const elapsed = (Date.now() - start) / 1000;
      const avg = elapsed / preloadLoaded;
      const remaining = preloadTotal - preloadLoaded;
      setPreloadEtaSeconds(Math.round(avg * remaining));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [preloadLoaded, preloadTotal]);

  const addMediaElement = useCallback(
    async (asset: Asset) => {
      const previewUrl = previewUrls[asset.id];
      let width = 280;
      let height = 210;
      if (asset.kind === 'photo' && previewUrl) {
        try {
          const dims = await getImageDimensions(previewUrl);
          width = dims.width;
          height = dims.height;
        } catch {
          // keep defaults if load fails
        }
      }
      const base: CollageElement = {
        id: crypto.randomUUID(),
        type: asset.kind === 'video' ? 'video' : 'image',
        x: 40 + elements.length * 20,
        y: 40 + elements.length * 20,
        width,
        height,
        rotation: 0,
        assetId: asset.id,
        publicPreviewUrl: previewUrl
      };
      setElements((els) => [...els, base]);
    },
    [previewUrls, elements.length]
  );

  const addTextElement = () => {
    const el: CollageElement = {
      id: crypto.randomUUID(),
      type: 'text',
      x: 60,
      y: 60,
      width: 260,
      height: 80,
      rotation: 0,
      text: 'Your story here',
      fontSize: 20,
      fontFamily: 'sans-serif',
      color: '#1e293b',
      align: 'left'
    };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  };

  const addTextElementWithContent = useCallback((content: string) => {
    const el: CollageElement = {
      id: crypto.randomUUID(),
      type: 'text',
      x: 60 + elements.length * 15,
      y: 60 + elements.length * 15,
      width: 280,
      height: Math.min(400, Math.max(60, content.split('\n').length * 28)),
      rotation: 0,
      text: content,
      fontSize: 18,
      fontFamily: 'sans-serif',
      color: '#1e293b',
      align: 'left'
    };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  }, [elements.length]);

  const handleElementChange = useCallback(
    (id: string, patch: Partial<CollageElement>) => {
      setElements((els) => els.map((el) => (el.id === id ? { ...el, ...patch } : el)));
    },
    []
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((els) => els.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, handleDeleteSelected]);

  const handleExport = () => {
    if (!stageRef.current) return;
    const pixelRatio = 1 / scale;
    const uri = stageRef.current.toDataURL({
      mimeType: 'image/png',
      pixelRatio
    });
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'experience-canvas.png';
    a.click();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const payload = {
        experience_id: experienceId,
        name: 'Main',
        width,
        height,
        background,
        elements
      };
      const { error } = await supabase.from('collage_pages').upsert(
        pageId ? [{ id: pageId, ...payload }] : [payload],
        { onConflict: 'id' }
      );
      if (error) {
        setStatus(error.message);
      } else {
        setStatus('Saved.');
        router.refresh();
      }
    } catch (err: any) {
      setStatus(err.message ?? 'Could not save collage');
    } finally {
      setIsSaving(false);
    }
  };

  const scale = Math.min(1, CANVAS_DISPLAY_MAX / width, CANVAS_DISPLAY_MAX / height);
  const stageW = width * scale;
  const stageH = height * scale;

  const selectedElement = selectedId ? elements.find((el) => el.id === selectedId) : null;
  const isTextSelected = selectedElement?.type === 'text';
  const isImageSelected = selectedElement && (selectedElement.type === 'image' || selectedElement.type === 'video');

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      {/* Left: Media panel */}
      <aside className="w-full shrink-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3 lg:w-52">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your photos
        </h2>
        <p className="mb-2 text-[11px] text-slate-500">
          Click a photo to add it to the canvas.
        </p>
        {assets.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
              {assets.map((asset) => {
                const thumbUrl = thumbnailUrls[asset.id] || previewUrls[asset.id];
                return (
                  <ThumbnailButton
                    key={asset.id}
                    thumbUrl={thumbUrl}
                    label={asset.original_filename ?? 'Photo'}
                    onAdd={() => addMediaElement(asset)}
                  />
                );
              })}
            </div>
            {preloadTotal > 0 && (
              <div className="mt-2 rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-[11px] text-slate-300">
                {preloadLoaded < preloadTotal ? (
                  <>
                    Preloading {preloadLoaded}/{preloadTotal}…
                    {preloadEtaSeconds != null && preloadLoaded > 0 && (
                      <span className="ml-1 text-slate-400">
                        ~{preloadEtaSeconds}s left
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sky-400">Ready to add to canvas</span>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-[11px] text-slate-500">
            No photos yet. Upload some on the experience page.
          </p>
        )}
        <div className="mt-4 border-t border-slate-800 pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Journal
          </h3>
          <JournalForm experienceId={experienceId} />
          {initialJournals.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {initialJournals.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded border border-slate-700 bg-slate-800/60 p-1.5"
                >
                  <p className="line-clamp-2 text-[11px] text-slate-300">
                    {entry.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => addTextElementWithContent(entry.content)}
                    className="mt-1 w-full rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-600"
                  >
                    Add to canvas
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Center: Canvas + top toolbar */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={addTextElement}
            className="rounded-md bg-slate-700 px-2 py-1.5 font-medium hover:bg-slate-600"
          >
            Add text
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-sky-500 px-3 py-1.5 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-slate-600 px-3 py-1.5 font-medium hover:bg-slate-800"
          >
            Export PNG
          </button>
          {status && (
            <span className="text-[11px] text-slate-300" role="status">
              {status}
            </span>
          )}
        </div>

        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-900">
          <Stage
            width={stageW}
            height={stageH}
            scaleX={scale}
            scaleY={scale}
            ref={stageRef}
            style={{ maxWidth: '100%', cursor: 'default' }}
            onClick={(e) => {
              if (e.target === e.target.getStage() || e.target.name() === 'bg') {
                setSelectedId(null);
              }
            }}
          >
            <Layer>
              <Rect
                name="bg"
                x={0}
                y={0}
                width={width}
                height={height}
                fill={background}
                onClick={() => setSelectedId(null)}
              />
              {elements.map((el) => {
                if (el.type === 'text') {
                  return (
                    <KonvaText
                      key={el.id}
                      ref={(node) => {
                        if (selectedId === el.id) selectedNodeRef.current = node;
                      }}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      rotation={el.rotation}
                      text={el.text ?? ''}
                      fontSize={el.fontSize ?? 20}
                      fontFamily={el.fontFamily ?? 'sans-serif'}
                      fill={el.color ?? '#1e293b'}
                      align={el.align}
                      draggable
                      stroke={selectedId === el.id ? '#38bdf8' : undefined}
                      strokeWidth={selectedId === el.id ? 1 : 0}
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => {
                        const x = Math.round(e.target.x() / GRID) * GRID;
                        const y = Math.round(e.target.y() / GRID) * GRID;
                        handleElementChange(el.id, { x, y });
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();
                        node.scaleX(1);
                        node.scaleY(1);
                        handleElementChange(el.id, {
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(20, node.width() * scaleX),
                          height: Math.max(20, node.height() * scaleY),
                          rotation: node.rotation()
                        });
                      }}
                      onDblClick={() => {
                        const next = prompt('Edit text', el.text ?? '');
                        if (next !== null) {
                          handleElementChange(el.id, { text: next });
                        }
                      }}
                    />
                  );
                }
                return (
                  <ImageNode
                    key={el.id}
                    element={el}
                    selected={selectedId === el.id}
                    selectedRef={selectedId === el.id ? selectedNodeRef : undefined}
                    onChange={(patch) => handleElementChange(el.id, patch)}
                    onSelect={() => setSelectedId(el.id)}
                  />
                );
              })}
              {selectedId && (
                <Transformer
                  ref={transformerRef}
                  borderStroke="#38bdf8"
                  borderStrokeWidth={2}
                  anchorStroke="#38bdf8"
                  anchorFill="#0f172a"
                  anchorSize={8}
                />
              )}
              {selectedElement && (
                <Group
                  name="deleteButton"
                  x={selectedElement.x + selectedElement.width - 22}
                  y={selectedElement.y - 22}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleDeleteSelected();
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    handleDeleteSelected();
                  }}
                  listening={true}
                >
                  <Circle x={11} y={11} radius={11} fill="#b91c1c" stroke="#fecaca" strokeWidth={1} />
                  <Line points={[6, 6, 16, 16]} stroke="#fff" strokeWidth={2} lineCap="round" />
                  <Line points={[16, 6, 6, 16]} stroke="#fff" strokeWidth={2} lineCap="round" />
                </Group>
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Right: Properties panel (Canva-style) */}
      <aside className="w-full shrink-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3 lg:w-56">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Properties
        </h2>

        {!selectedElement && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">Page</p>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Background color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Click the canvas or an element to edit it.</p>
          </div>
        )}

        {isTextSelected && selectedElement && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">Text</p>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Content</label>
              <textarea
                value={selectedElement.text ?? ''}
                onChange={(e) => handleElementChange(selectedElement.id, { text: e.target.value })}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Font size</label>
              <input
                type="number"
                min={8}
                max={120}
                value={selectedElement.fontSize ?? 20}
                onChange={(e) =>
                  handleElementChange(selectedElement.id, {
                    fontSize: Math.max(8, Math.min(120, Number(e.target.value)))
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Font</label>
              <select
                value={selectedElement.fontFamily ?? 'sans-serif'}
                onChange={(e) =>
                  handleElementChange(selectedElement.id, {
                    fontFamily: e.target.value as 'sans-serif' | 'serif' | 'monospace'
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedElement.color ?? '#1e293b'}
                  onChange={(e) => handleElementChange(selectedElement.id, { color: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <input
                  type="text"
                  value={selectedElement.color ?? '#1e293b'}
                  onChange={(e) => handleElementChange(selectedElement.id, { color: e.target.value })}
                  className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">Align</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => handleElementChange(selectedElement.id, { align })}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      (selectedElement.align ?? 'left') === align
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="mt-2 rounded border border-red-800 bg-red-900/80 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-800"
            >
              Delete
            </button>
          </div>
        )}

        {isImageSelected && selectedElement && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">Image</p>
            <p className="text-[11px] text-slate-400">
              Drag to move. Drag corners or edges to resize. Click the red X on the canvas to delete.
            </p>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="rounded border border-red-800 bg-red-900/80 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

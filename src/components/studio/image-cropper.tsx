'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cx, IconButton, PillButton } from '@/components/app/primitives';

/** How an image is framed: the shape people adjust it into and the size it's saved at. */
export type CropPreset = {
  title: string;
  /** Width ÷ height of the frame. */
  aspect: number;
  round?: boolean;
  output: { width: number; height: number };
  /** A dashed band in the middle showing the part every screen shows. */
  guide?: { width: number; label: string };
};

export const CROP_PRESETS = {
  avatar: { title: 'Adjust picture', aspect: 1, round: true, output: { width: 800, height: 800 } },
  // The channel header is about 3:1 on computers; phones show only its middle.
  banner: {
    title: 'Adjust banner',
    aspect: 3,
    output: { width: 2400, height: 800 },
    guide: { width: 0.4, label: 'Visible on phones' },
  },
  poster: { title: 'Adjust poster', aspect: 2 / 3, output: { width: 1000, height: 1500 } },
} satisfies Record<string, CropPreset>;

const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 - 64 * 1024; // the API's limit, with room for the form
const MIN_OUTPUT_SIDE = 200;
const MAX_ZOOM = 5;

/** Zoom level and the point of the image (in its own pixels) at the frame's center. */
type View = { zoom: number; x: number; y: number };
type Source = { url: string; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The part of the image the frame covers at zoom 1 (the largest fit), in image pixels. */
function baseRegion(source: Source, aspect: number) {
  const width = Math.min(source.width, source.height * aspect);
  return { width, height: width / aspect };
}

function maxZoomFor(source: Source, aspect: number) {
  const base = baseRegion(source, aspect);
  // Stop before the frame shows fewer than ~100 image pixels across, where it turns to blur.
  return clamp(Math.min(base.width, base.height) / 100, 1, MAX_ZOOM);
}

/** Keeps the zoom in range and the image covering the whole frame. */
function fitView(view: View, source: Source, aspect: number): View {
  const zoom = clamp(view.zoom, 1, maxZoomFor(source, aspect));
  const base = baseRegion(source, aspect);
  const halfWidth = base.width / zoom / 2;
  const halfHeight = base.height / zoom / 2;
  return {
    zoom,
    x: clamp(view.x, halfWidth, source.width - halfWidth),
    y: clamp(view.y, halfHeight, source.height - halfHeight),
  };
}

/**
 * The adjust dialog: drag to move the image, zoom with the slider, mouse wheel, pinch or + / −.
 * A rule-of-thirds grid shows while the image moves. Saving crops it in the browser and returns
 * the result as a new file, so the server stores exactly what was framed.
 */
export function ImageCropDialog({
  file,
  preset,
  saving,
  onCancel,
  onSave,
  onError,
}: {
  file: File;
  preset: CropPreset;
  saving: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [frameWidth, setFrameWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const image = useRef<HTMLImageElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const hideGrid = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errorRef = useRef(onError);
  useEffect(() => {
    errorRef.current = onError;
  });

  const { aspect } = preset;
  const busy = saving || preparing;

  // Open the picked file.
  useEffect(() => {
    if (file.size > MAX_SOURCE_BYTES) {
      errorRef.current('That image is too big. Pick one under 30 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const element = document.createElement('img');
    let current = true; // a cleaned-up run's image fails once its URL is revoked; ignore it
    element.onload = () => {
      if (!current) return;
      image.current = element;
      const loaded = { url, width: element.naturalWidth, height: element.naturalHeight };
      setSource(loaded);
      setView(fitView({ zoom: 1, x: loaded.width / 2, y: loaded.height / 2 }, loaded, aspect));
    };
    element.onerror = () => current && errorRef.current("Couldn't open that image. Try a JPEG, PNG or WebP.");
    element.src = url;
    return () => {
      current = false;
      URL.revokeObjectURL(url);
    };
  }, [file, aspect]);

  // Track the frame's on-screen width to convert pointer movement into image pixels.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);

  useEffect(() => stage.current?.focus(), [source]);

  /** Keeps the grid up for a moment after a zoom, key press or drag. */
  const flashGrid = useCallback(() => {
    setFlash(true);
    clearTimeout(hideGrid.current);
    hideGrid.current = setTimeout(() => setFlash(false), 700);
  }, []);
  useEffect(() => () => clearTimeout(hideGrid.current), []);

  const update = useCallback(
    (change: (view: View) => View) => {
      if (!source) return;
      setView((current) => fitView(change(current), source, aspect));
    },
    [source, aspect],
  );

  /** Image pixels per screen pixel at a zoom level. */
  const pixelsPerPoint = useCallback(
    (zoom: number) => (source && frameWidth ? baseRegion(source, aspect).width / zoom / frameWidth : 0),
    [source, aspect, frameWidth],
  );

  const pan = useCallback(
    (dx: number, dy: number) => update((current) => {
      const ratio = pixelsPerPoint(current.zoom);
      return { ...current, x: current.x - dx * ratio, y: current.y - dy * ratio };
    }),
    [update, pixelsPerPoint],
  );

  /**
   * Sets the zoom from the current one, keeping the image point under (`clientX`, `clientY`) still.
   * Without a point it zooms around the frame's center.
   */
  const zoom = useCallback(
    (next: (zoom: number) => number, clientX?: number, clientY?: number) =>
      update((current) => {
        if (!source) return current;
        const level = clamp(next(current.zoom), 1, maxZoomFor(source, aspect));
        const box = frame.current?.getBoundingClientRect();
        if (!box || clientX === undefined || clientY === undefined) return { ...current, zoom: level };
        const offsetX = clientX - (box.left + box.width / 2);
        const offsetY = clientY - (box.top + box.height / 2);
        const shift = pixelsPerPoint(current.zoom) - pixelsPerPoint(level);
        return { zoom: level, x: current.x + offsetX * shift, y: current.y + offsetY * shift };
      }),
    [update, pixelsPerPoint, source, aspect],
  );

  // Mouse-wheel and trackpad zoom. Added by hand because React's wheel listener can't stop the page scrolling.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom((current) => current * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
      flashGrid();
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoom, flashGrid]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (busy || !source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 1) {
      pointers.current.set(event.pointerId, next);
      pan(next.x - previous.x, next.y - previous.y);
      return;
    }
    // Two fingers: pinch to zoom around their midpoint, and move with it.
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1];
    pointers.current.set(event.pointerId, next);
    if (!other) return;
    const before = Math.hypot(previous.x - other.x, previous.y - other.y);
    const after = Math.hypot(next.x - other.x, next.y - other.y);
    const middle = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
    if (before > 0) zoom((current) => current * (after / before), middle.x, middle.y);
    pan((next.x - previous.x) / 2, (next.y - previous.y) / 2);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      setDragging(false);
      flashGrid();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 40 : 8;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[event.key]) pan(...moves[event.key]);
    else if (event.key === '+' || event.key === '=') zoom((current) => current + 0.1);
    else if (event.key === '-') zoom((current) => current - 0.1);
    else return;
    event.preventDefault();
    flashGrid();
  };

  const save = async () => {
    if (!source || !image.current) return;
    setPreparing(true);
    try {
      onSave(await cropToFile(image.current, view, source, preset, file.name));
    } catch {
      onError("Couldn't prepare the image. Try another one.");
    } finally {
      setPreparing(false);
    }
  };

  const maxZoom = source ? maxZoomFor(source, aspect) : 1;
  const portrait = aspect < 1;

  // Where the image sits inside the frame, in screen pixels.
  let imageStyle: React.CSSProperties | undefined;
  if (source && frameWidth) {
    const scale = 1 / pixelsPerPoint(view.zoom);
    const frameHeight = frameWidth / aspect;
    imageStyle = {
      width: source.width * scale,
      height: source.height * scale,
      transform: `translate3d(${frameWidth / 2 - view.x * scale}px, ${frameHeight / 2 - view.y * scale}px, 0)`,
    };
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
      onKeyDown={(event) => event.key === 'Escape' && !busy && onCancel()}
    >
      <div
        className={cx(
          'max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-lg bg-pal-elevated shadow-2xl duration-150 animate-in fade-in zoom-in-95',
          aspect > 1.5 ? 'max-w-3xl' : 'max-w-md',
        )}
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-4 md:px-6 md:pt-5">
          <h2 id="crop-title" className="text-xl font-bold tracking-tight md:text-2xl">
            {preset.title}
          </h2>
          <IconButton label="Close" onClick={onCancel} disabled={busy} className="-mr-2">
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="px-5 pt-4 md:px-6">
          <div
            ref={stage}
            tabIndex={0}
            aria-label="Image position. Drag, or use the arrow keys, to move it. Use plus and minus to zoom."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className={cx(
              'relative touch-none select-none overflow-hidden rounded-md bg-pal-base p-4 outline-none focus-visible:ring-2 focus-visible:ring-pal-text md:p-8',
              source && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
            )}
          >
            {source ? (
              <div
                ref={frame}
                className={cx('relative mx-auto', portrait ? '' : 'w-full', aspect === 1 && 'max-w-[320px]')}
                style={{ aspectRatio: aspect, height: portrait ? 'min(50vh, 420px)' : undefined }}
              >
                {/* A blob URL from the picked file, so next/image doesn't apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                  style={imageStyle ?? { visibility: 'hidden' }}
                />
                <FrameOverlay round={preset.round} showGrid={dragging || flash} guide={preset.guide} />
              </div>
            ) : (
              <div className="grid place-items-center text-pal-subdued" style={{ aspectRatio: Math.max(aspect, 1) }}>
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-sm text-pal-subdued">Drag to reposition. Scroll or pinch to zoom.</p>

          <div className="mt-4 flex items-center gap-2">
            <IconButton
              label="Zoom out"
              size="sm"
              disabled={!source || view.zoom <= 1}
              onClick={() => {
                zoom((current) => current - 0.25);
                flashGrid();
              }}
            >
              <ZoomOut className="h-5 w-5" />
            </IconButton>
            <input
              type="range"
              aria-label="Zoom"
              min={1}
              max={maxZoom}
              step={0.01}
              value={view.zoom}
              disabled={!source || maxZoom <= 1}
              onChange={(event) => {
                const value = Number(event.target.value);
                zoom(() => value);
                flashGrid();
              }}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-pal-primary disabled:cursor-default disabled:opacity-40"
            />
            <IconButton
              label="Zoom in"
              size="sm"
              disabled={!source || view.zoom >= maxZoom}
              onClick={() => {
                zoom((current) => current + 0.25);
                flashGrid();
              }}
            >
              <ZoomIn className="h-5 w-5" />
            </IconButton>
            <IconButton
              label="Reset"
              size="sm"
              disabled={!source}
              onClick={() => source && setView(fitView({ zoom: 1, x: source.width / 2, y: source.height / 2 }, source, aspect))}
              className="ml-2"
            >
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-6 md:px-6 md:pb-6">
          <PillButton variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton onClick={save} loading={busy} disabled={!source}>
            Save
          </PillButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Dims everything outside the frame, and draws the grid and the phone guide inside it. */
function FrameOverlay({ round, showGrid, guide }: { round?: boolean; showGrid: boolean; guide?: CropPreset['guide'] }) {
  return (
    <div
      className={cx(
        'pointer-events-none absolute inset-0 overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,.65)] ring-1 ring-white/80',
        round && 'rounded-full',
      )}
    >
      <div className={cx('absolute inset-0 transition-opacity duration-200', showGrid ? 'opacity-100' : 'opacity-0')}>
        {[1, 2].map((line) => (
          <span key={`v${line}`} className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${(line * 100) / 3}%` }} />
        ))}
        {[1, 2].map((line) => (
          <span key={`h${line}`} className="absolute inset-x-0 h-px bg-white/60" style={{ top: `${(line * 100) / 3}%` }} />
        ))}
      </div>
      {guide && (
        <div
          className="absolute inset-y-0 border-x border-dashed border-white/50"
          style={{ left: `${(50 - guide.width * 50).toFixed(2)}%`, right: `${(50 - guide.width * 50).toFixed(2)}%` }}
        >
          <span className="absolute inset-x-0 bottom-1 truncate text-center text-[10px] font-semibold text-white/80 drop-shadow md:text-xs">
            {guide.label}
          </span>
        </div>
      )}
    </div>
  );
}

/** Draws the framed part of the image onto a canvas and encodes it small enough for the API. */
async function cropToFile(image: HTMLImageElement, view: View, source: Source, preset: CropPreset, name: string) {
  const base = baseRegion(source, preset.aspect);
  const region = { width: base.width / view.zoom, height: base.height / view.zoom };
  // Never upscale past the region's own pixels, except to reach a usable minimum size.
  let scale = Math.min(1, preset.output.width / region.width);
  const shortSide = Math.min(region.width, region.height) * scale;
  if (shortSide < MIN_OUTPUT_SIDE) scale = MIN_OUTPUT_SIDE / Math.min(region.width, region.height);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(region.width * scale);
  canvas.height = Math.round(region.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.imageSmoothingQuality = 'high';

  const draw = (background?: string) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(
      image,
      view.x - region.width / 2,
      view.y - region.height / 2,
      region.width,
      region.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  };

  // WebP keeps transparency and stays small. Browsers that can't encode it (Safari) get a JPEG instead.
  draw();
  let type = 'image/webp';
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    let blob = await toBlob(canvas, type, quality);
    if (blob && blob.type !== type) {
      type = 'image/jpeg';
      draw('#000000');
      blob = await toBlob(canvas, type, quality);
    }
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const extension = type === 'image/webp' ? 'webp' : 'jpg';
      return new File([blob], `${name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`, { type });
    }
  }
  throw new Error('Image is too large');
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

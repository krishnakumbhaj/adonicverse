'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { PillButton } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { errorMessage, uploadImage } from '@/lib/client/api';
import type { Image } from '@/lib/client/types';
import { ImageCropDialog, type CropPreset } from './image-cropper';

/**
 * A pill button that picks an image and uploads it to `path` (PUT, multipart `file`).
 * With `crop`, the picked image opens in the adjust dialog first and the framed part is uploaded.
 */
export function ImageUploadButton({
  path,
  field,
  label,
  onUploaded,
  variant = 'white',
  crop,
}: {
  path: string;
  field: string;
  label: string;
  onUploaded: (image: Image) => void;
  variant?: 'white' | 'outline';
  crop?: CropPreset;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const { toast } = useToast();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadImage<Record<string, Image>>(path, file);
      onUploaded(result[field]);
      toast('Image updated');
      setPicked(null);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setUploading(false);
    }
  };

  const choose = (file: File | undefined) => {
    if (input.current) input.current.value = ''; // so picking the same file again still works
    if (!file) return;
    if (crop) setPicked(file);
    else void upload(file);
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <PillButton variant={variant} size="sm" icon={<Upload />} loading={uploading && !picked} onClick={() => input.current?.click()}>
        {label}
      </PillButton>
      {picked && crop && (
        <ImageCropDialog
          file={picked}
          preset={crop}
          saving={uploading}
          onCancel={() => setPicked(null)}
          onSave={upload}
          onError={(message) => {
            toast(message, 'error');
            setPicked(null);
          }}
        />
      )}
    </>
  );
}

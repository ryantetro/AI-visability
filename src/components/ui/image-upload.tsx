'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImageUpload } from '@/hooks/use-image-upload';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.ico';
const MAX_SIZE_MB = 2;

interface ImageUploadProps {
  onUpload?: (url: string) => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
  /** Compact mode for inline use (e.g. featured spot logo) */
  compact?: boolean;
  /** Optional: use external hook state (for sharing preview with parent) */
  hook?: ReturnType<typeof useImageUpload>;
}

export function ImageUpload({
  onUpload,
  accept = ACCEPT,
  maxSizeMb = MAX_SIZE_MB,
  className,
  compact = false,
  hook: externalHook,
}: ImageUploadProps) {
  const internalHook = useImageUpload({ onUpload });
  const {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = externalHook ?? internalHook;

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndSetFile = useCallback(
    (file: File) => {
      setError(null);
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File must be under ${maxSizeMb} MB`);
        return;
      }
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    },
    [handleFileChange, maxSizeMb],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        validateAndSetFile(file);
      } else {
        setError('Please drop an image file (PNG, JPG, WEBP, SVG, ICO)');
      }
    },
    [validateAndSetFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File must be under ${maxSizeMb} MB`);
        return;
      }
    }
    handleFileChange(e);
  };

  const dropzoneHeight = compact ? 'h-32' : 'h-64';

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        type="file"
        accept={accept}
        className="hidden"
        ref={fileInputRef}
        onChange={handleInputChange}
      />

      {!previewUrl ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors',
            'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
            dropzoneHeight,
            isDragging && 'border-[#25c972]/50 bg-[#25c972]/5',
          )}
        >
          <div className="rounded-full bg-white/5 p-3">
            <ImagePlus className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">Click to select</p>
            <p className="text-xs text-[var(--text-muted)]">or drag and drop file here</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="group relative overflow-hidden rounded-lg border border-white/10">
            <img
              src={previewUrl}
              alt="Preview"
              className={cn(
                'object-contain transition-transform duration-300 group-hover:scale-105',
                compact ? 'h-32 w-full' : 'h-64 w-full',
              )}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleThumbnailClick}
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/10 p-0 hover:bg-white/20"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="h-9 w-9 rounded-lg p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {fileName && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="truncate">{fileName}</span>
              <button
                type="button"
                onClick={handleRemove}
                className="ml-auto rounded-full p-1 hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <p className="text-[12px] text-[var(--text-muted)]">
        PNG, JPG, WEBP, SVG or ICO - Max {maxSizeMb} MB
      </p>
    </div>
  );
}

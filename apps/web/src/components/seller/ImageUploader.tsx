'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface ProductImageItem {
  id?: string;
  url: string;
  alt?: string;
  sortOrder?: number;
  publicId?: string;
  file?: File;
}

interface ImageUploaderProps {
  images: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
  token: string;
  productId?: string;
  disabled?: boolean;
}

export function ImageUploader({ images, onChange, token, productId, disabled }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file size and type
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files (PNG, JPG, GIF, WebP) are allowed');
        return;
      }

      if (!productId) {
        // New Product Mode: Store the actual File object and generate a temporary browser object URL for preview
        const objectUrl = URL.createObjectURL(file);
        onChange([
          ...images,
          {
            url: objectUrl,
            alt: '',
            sortOrder: images.length,
            file,
          },
        ]);
        toast.success('Image added to product preview');
        return;
      }

      // Edit Mode (productId exists): Upload directly via existing API endpoint
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/products/${productId}/images`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (!res.ok) {
          const error = await res.json().catch(() => null);
          throw new Error(error?.message || 'Upload failed');
        }

        const uploaded = await res.json();
        onChange([
          ...images,
          {
            id: uploaded.id,
            url: uploaded.url,
            publicId: uploaded.publicId,
            alt: '',
            sortOrder: images.length,
          },
        ]);
        toast.success('Image uploaded');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [images, onChange, productId, token],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = (index: number) => {
    const target = images[index];
    if (target?.url && target.url.startsWith('blob:')) {
      URL.revokeObjectURL(target.url);
    }
    const newImages = images.filter((_, i) => i !== index);
    newImages.forEach((img, i) => {
      img.sortOrder = i;
    });
    onChange(newImages);
  };

  const handleAltChange = (index: number, alt: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], alt };
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading || disabled}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Click or drag image here to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, GIF up to 5MB
          </p>
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="aspect-square relative bg-muted">
                <img
                  src={img.url}
                  alt={img.alt || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  placeholder="Alt text"
                  value={img.alt || ''}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  className="w-full text-xs p-1 border rounded bg-background"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

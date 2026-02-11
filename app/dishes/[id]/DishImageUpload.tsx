"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DishImageUpload({
  dishId,
  imageUrl: initialImageUrl
}: {
  dishId: string;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/dishes/${dishId}/image`, {
      method: "POST",
      body: formData
    });
    setUploading(false);
    e.target.value = "";
    if (res.ok) {
      const data = (await res.json()) as { image_url: string };
      setImageUrl(data.image_url);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string })?.error ?? "Upload failed");
    }
  };

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Dish"
            className="h-48 w-full rounded-lg object-cover shadow-sm"
          />
          <label className="absolute bottom-2 right-2 cursor-pointer rounded bg-black/60 px-2 py-1 text-[11px] text-white hover:bg-black/80">
            Change photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={handleFile}
            />
          </label>
        </div>
      ) : (
        <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-orange-200 bg-orange-50/50 p-4 text-center text-sm text-amber-700 hover:border-orange-300 hover:bg-orange-50">
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              Add a photo (JPEG, PNG, WebP or GIF, max 2MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={handleFile}
              />
            </>
          )}
        </label>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

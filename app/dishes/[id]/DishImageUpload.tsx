"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DishImageUpload({
  dishId,
  imageUrl: initialImageUrl,
  variant = "default"
}: {
  dishId: string;
  imageUrl: string | null;
  variant?: "default" | "hero";
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

  const isHero = variant === "hero";
  const imageClass = isHero
    ? "h-full w-full object-cover"
    : "h-48 w-full rounded-xl object-cover shadow-sm";
  const wrapperClass = isHero ? "relative h-full w-full" : "relative";

  return (
    <div className={isHero ? "h-full" : "space-y-2"}>
      {imageUrl ? (
        <div className={wrapperClass}>
          <img
            src={imageUrl}
            alt="Dish"
            className={imageClass}
          />
          <label className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/80">
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
        <label
          className={
            isHero
              ? "flex h-full min-h-[200px] w-full cursor-pointer flex-col items-center justify-center bg-stone-100 p-6 text-center text-sm text-stone-500 dark:bg-stone-700 dark:text-stone-400"
              : "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/80 p-4 text-center text-sm text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500"
          }
        >
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
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

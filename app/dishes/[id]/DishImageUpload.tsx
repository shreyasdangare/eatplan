"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Camera } from "lucide-react";

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
    ? "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
    : "h-48 w-full rounded-[2rem] object-cover shadow-sm transition-transform duration-500 hover:scale-[1.02]";
  const wrapperClass = isHero ? "relative h-full w-full group overflow-hidden" : "relative group";

  return (
    <div className={isHero ? "h-full" : "space-y-3"}>
      {imageUrl ? (
        <div className={wrapperClass}>
          <img
            src={imageUrl}
            alt="Dish"
            className={imageClass}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
          <label className="absolute bottom-4 right-4 cursor-pointer flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black hover:scale-105 active:scale-95 shadow-lg border border-white/20 z-20">
            <Camera className="h-4 w-4" />
            <span>Change photo</span>
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
              ? "group flex h-full min-h-[300px] w-full cursor-pointer flex-col items-center justify-center bg-stone-100/50 p-6 text-center text-stone-500 transition-all hover:bg-stone-200/50 dark:bg-stone-800/50 dark:text-stone-400 dark:hover:bg-stone-700/50"
              : "group flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-stone-300 bg-stone-50/50 p-6 text-center transition-all hover:border-orange-400 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-900/30 dark:hover:border-orange-500 dark:hover:bg-stone-800/50"
          }
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-orange-500 dark:border-stone-600 dark:border-t-orange-500" />
              <span className="text-sm font-medium text-stone-600 dark:text-stone-300">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 transition-transform group-hover:scale-105">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-stone-800">
                <ImagePlus className="h-8 w-8 text-stone-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <div>
                <span className="block text-base font-semibold text-stone-700 dark:text-stone-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  Add a cover photo
                </span>
                <span className="mt-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                  JPEG, PNG, WebP up to 2MB
                </span>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={handleFile}
              />
            </div>
          )}
        </label>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

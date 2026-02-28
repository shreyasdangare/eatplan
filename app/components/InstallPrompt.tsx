"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(wasDismissed);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || dismissed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<{ outcome: string }> };
      setDeferredPrompt({ prompt: () => ev.prompt() });
      setShowAndroidInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [mounted, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setShowAndroidInstall(false);
      setDeferredPrompt(null);
    }
  };

  if (!mounted || dismissed || isStandalone()) return null;

  const ios = isIOS();
  if (!ios && !showAndroidInstall) return null;

  return (
    <div
      role="status"
      aria-label="Install app hint"
      className="mx-auto mb-4 flex max-w-3xl items-start gap-3 rounded-xl border border-orange-200/80 bg-orange-50/90 px-4 py-3 shadow-sm sm:px-4 lg:max-w-5xl"
    >
      <div className="flex-1 min-w-0">
        {ios ? (
          <p className="text-sm text-orange-900">
            Install this app: tap the Share button{" "}
            <span aria-hidden className="inline-block font-bold">
              ⎋
            </span>{" "}
            then &quot;Add to Home Screen&quot;{" "}
            <span aria-hidden className="inline-block font-bold">
              ➕
            </span>
            .
          </p>
        ) : showAndroidInstall ? (
          <p className="text-sm text-orange-900">
            Add this app to your home screen for quick access.
          </p>
        ) : null}
        {showAndroidInstall && (
          <div className="mt-2">
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 active:opacity-90"
            >
              Install app
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install hint"
        className="shrink-0 rounded-full p-1.5 text-orange-600 hover:bg-orange-100 active:opacity-80"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}

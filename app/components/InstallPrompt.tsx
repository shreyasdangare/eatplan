"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const VISITS_KEY = "pwa-install-visits";

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
  const [dismissed, setDismissed] = useState(true); // default true to prevent hydration mismatch flash
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    
    // Track visits to "ease off" if they just ignore it
    const visitsString = localStorage.getItem(VISITS_KEY) || "0";
    const visits = parseInt(visitsString, 10);
    localStorage.setItem(VISITS_KEY, (visits + 1).toString());

    setDismissed(wasDismissed);

    // If it's not dismissed, maybe they've seen it 3+ times? We can ease off by not showing it.
    // For now, if they haven't explicitly dismissed it, we'll show it but with a delay.
    if (!wasDismissed) {
      // Delay prompt to not be too aggressive immediately on load
      const delay = visits === 0 ? 2500 : 5000; // 2.5s on first visit, 5s on subsequent visits
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
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
    setIsVisible(false);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, "1");
    }, 300); // Wait for transition
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setShowAndroidInstall(false);
      setDeferredPrompt(null);
      handleDismiss();
    }
  };

  if (!mounted || dismissed || isStandalone()) return null;

  const ios = isIOS();
  if (!ios && !showAndroidInstall) return null;

  return (
    <div
      role="status"
      aria-label="Install app hint"
      className={`fixed top-4 left-4 right-4 z-[60] mx-auto max-w-sm transition-all duration-500 ease-out sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-10 sm:translate-y-10 opacity-0 pointer-events-none"
      }`}
    >
      <div className="glass-panel relative flex flex-row items-center sm:flex-col sm:items-start gap-3 rounded-2xl border-stone-200 py-3 pl-3 pr-11 sm:p-5 shadow-xl sm:shadow-2xl ring-1 ring-stone-900/5 dark:ring-white/10">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install hint"
          className="absolute right-2 top-1/2 -translate-y-1/2 sm:top-3 sm:right-3 sm:-translate-y-0 rounded-full p-1.5 text-stone-400 opacity-70 transition-all hover:bg-stone-100 hover:text-stone-700 hover:opacity-100 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center sm:items-start gap-4 sm:pr-4">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
            <Download className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Get the App
            </h3>
            {ios ? (
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Install EatPlan for quick access. Tap the Share button{" "}
                <span aria-hidden className="inline-block font-bold">⎋</span>{" "}
                then &quot;Add to Home Screen&quot;.
              </p>
            ) : showAndroidInstall ? (
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Install EatPlan on your device for the best meal planning experience.
              </p>
            ) : null}
          </div>
        </div>

        {showAndroidInstall && (
          <div className="mt-0 sm:mt-1 flex gap-2 shrink-0 flex-col sm:flex-row">
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="flex-1 rounded-xl bg-orange-500 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98] dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="hidden sm:block px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 dark:hover:text-stone-200"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

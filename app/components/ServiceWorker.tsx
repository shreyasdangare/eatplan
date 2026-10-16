"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Registers the service worker (production only) and shows an offline banner. */
export function ServiceWorker() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Lets server-rendered "Today" use the user's own date (see lib/userTimeZone).
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.includes(`tz=${encodeURIComponent(tz)}`)) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {}
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-250 flex items-center justify-center gap-2 bg-stone-900 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm font-semibold text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden /> You&apos;re offline — showing the last saved list and plan.
    </div>
  );
}

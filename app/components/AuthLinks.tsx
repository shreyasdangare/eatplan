"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

export function AuthLinks() {
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: { preferred_name?: string };
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    getSupabaseClient()
      .then((supabase) => {
        if (cancelled) return;
        supabase.auth.getUser().then(({ data: { user: u }, error }) => {
          if (cancelled) return;
          if (error) {
            supabase.auth.signOut();
            setUser(null);
            return;
          }
          setUser(u ?? null);
        });
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
      })
      .catch(() => {
        // Config missing; show Log in link only
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    }
  };

  if (!mounted) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 active:opacity-80 dark:text-stone-400 dark:hover:bg-stone-800 transition-colors"
          title="Account Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-settings"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2 2.01 2.01 0 0 1-2.12 2 2 2 0 0 0-2 2 2.01 2.01 0 0 1-2 2.12 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2.01 2.01 0 0 1 2.12 2 2 2 0 0 0 2 2 2.01 2.01 0 0 1 2 2.12 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2.01 2.01 0 0 1 2.12-2 2 2 0 0 0 2-2 2.01 2.01 0 0 1 2-2.12 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2.01 2.01 0 0 1-2.12-2 2 2 0 0 0-2-2 2.01 2.01 0 0 1-2-2.12 2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-sm text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
    >
      Log in
    </Link>
  );
}

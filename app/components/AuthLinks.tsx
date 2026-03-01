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
        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-sm text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
        >
          Log out
        </button>
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

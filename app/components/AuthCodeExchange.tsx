"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

/**
 * When Supabase redirects after email confirmation (or other PKCE flow), the URL
 * contains ?code=... . We exchange that code for a session and then redirect to
 * clean the URL. If the user opened the link in a different browser/tab, the
 * exchange may fail (missing code_verifier); we show a short message then.
 */
export function AuthCodeExchange() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "exchanging" | "done" | "error">("idle");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || status !== "idle") return;

    setStatus("exchanging");
    getSupabaseClient()
      .then(async (supabase) => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return true;
        // The browser client may already have exchanged the code itself (detectSessionInUrl),
        // which makes our second exchange fail even though the user is now signed in.
        const { data } = await supabase.auth.getUser();
        return !!data.user;
      })
      .then((signedIn) => {
        if (!signedIn) {
          setStatus("error");
          return;
        }
        setStatus("done");
        router.replace("/", { scroll: false });
        router.refresh();
      })
      .catch(() => setStatus("error"));
  }, [searchParams, router, status]);

  if (status === "exchanging") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 dark:bg-stone-950/90">
        <p className="rounded-xl bg-white px-6 py-4 text-stone-800 shadow-lg dark:bg-stone-800 dark:text-stone-100">
          Signing you in…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 dark:bg-stone-950/90 p-4">
        <div className="max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-stone-800 dark:text-stone-100">
          <p className="font-medium text-stone-900 dark:text-stone-100">
            Your email is confirmed
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            We couldn’t sign you in automatically (this happens when the link is opened in a different browser or app). Log in with your email and password to continue. If login says your email isn’t confirmed, the link expired: use “Resend confirmation email” there.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              router.replace("/login", { scroll: false });
            }}
            className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-stone-700"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return null;
}

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
      .then((supabase) => supabase.auth.exchangeCodeForSession(code))
      .then(({ error }) => {
        if (error) {
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
            Couldn’t complete sign-in
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Open this link in the same browser where you signed up, or the link may have expired. You can try logging in and use “Resend confirmation email” to get a new link.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              router.replace("/", { scroll: false });
            }}
            className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-stone-700"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return null;
}

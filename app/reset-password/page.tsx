"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

const inputClass =
  "w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient()
      .then((s) => s.auth.getUser())
      .then(({ data }) => setHasSession(!!data.user))
      .catch(() => setHasSession(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) return setError(err.message);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Set a new password</h1>
      {hasSession === false ? (
        <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>This reset link is invalid or has expired, or was opened in a different browser.</p>
          <Link href="/forgot-password" className="font-medium text-orange-600 dark:text-orange-400">
            Send a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              New password
            </label>
            <input id="password" type="password" autoComplete="new-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Confirm new password
            </label>
            <input id="confirm_password" type="password" autoComplete="new-password" required value={confirm}
              onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading || hasSession === null}
            className="w-full min-h-[44px] rounded-lg bg-orange-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </div>
  );
}

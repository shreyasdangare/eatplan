"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

const inputClass =
  "w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Reset your password</h1>
      {sent ? (
        <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>
            If an account exists for <strong>{email.trim()}</strong>, we’ve emailed a link to set a new password.
            Open it in this browser.
          </p>
          <Link href="/login" className="font-medium text-orange-600 dark:text-orange-400">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Enter the email you signed up with and we’ll send you a reset link.
          </p>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] rounded-lg bg-orange-600 px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-stone-600 underline dark:text-stone-400">
              Back to log in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

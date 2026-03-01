"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const hintNoAccount = searchParams.get("hint") === "no_account";
  const emailFromUrl = searchParams.get("email") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (emailFromUrl) setEmail(decodeURIComponent(emailFromUrl));
  }, [emailFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { preferred_name: preferredName.trim() || undefined },
        },
      });
      if (err) {
        setError(err.message ?? "Sign up failed");
        return;
      }
      setSignupSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <section className="mx-auto max-w-sm space-y-6 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Check your email
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          We&apos;ve sent you a confirmation link. Click it to verify your account, then log in.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 active:opacity-90 dark:bg-stone-700 dark:hover:bg-stone-600"
        >
          Go to Log in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-sm space-y-6 pt-8">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Sign up
      </h1>
      {hintNoAccount && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          We couldn&apos;t find an account with that email. Create one below to get started.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:ring-orange-500"
          />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">At least 6 characters</p>
        </div>
        <div>
          <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Confirm password
          </label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="preferred_name" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            What should we call you?
          </label>
          <input
            id="preferred_name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Shreyas"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:ring-orange-500"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 active:opacity-90 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="text-center text-sm text-stone-600 dark:text-stone-400">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-orange-700 hover:underline dark:text-orange-400">
          Log in
        </Link>
      </p>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm pt-8 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700 h-64" />}>
      <SignupForm />
    </Suspense>
  );
}

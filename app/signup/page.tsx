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
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (err) {
        setError(err.message ?? "Google sign up failed");
        setGoogleLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGoogleLoading(false);
    }
  };
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
    const name = preferredName.trim();
    if (!name) {
      setError("Please enter what we should call you.");
      return;
    }
    const lang = nativeLanguage.trim();
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { preferred_name: name, native_language: lang || undefined },
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
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full min-h-[44px] items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">or</span>
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
      </div>

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
            What should we call you? <span className="text-amber-600 dark:text-amber-400">Required</span>
          </label>
          <input
            id="preferred_name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Shreyas"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            required
            minLength={1}
            className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:ring-orange-500"
          />
        </div>
        <div>
          <label htmlFor="native_language" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Mother Tongue (for translations) <span className="text-stone-400 dark:text-stone-500 font-normal">Optional</span>
          </label>
          <input
            id="native_language"
            type="text"
            placeholder="e.g. Marathi, Hindi, Spanish"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
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

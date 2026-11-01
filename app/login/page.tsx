"use client";
import { safeNextPath } from "@/lib/safeNext";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResendHint, setShowResendHint] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

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
        setError(err.message ?? "Google sign in failed");
        setGoogleLoading(false);
      }
      // If no error, browser will redirect to Google
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResendHint(false);
    setResendSuccess(false);
    setLoading(true);

    const isBypass = email.trim() === "test@eatplan.com" && password === "tester";

    try {
      if (isBypass) {
        // Auto-provision test user in dev
        await fetch("/api/dev-setup-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password })
        });
      }

      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        const msg = err.message ?? "Sign in failed";
        if (msg === "Invalid login credentials") {
          router.push(
            `/signup?next=${encodeURIComponent(next)}&hint=no_account&email=${encodeURIComponent(email.trim())}`
          );
          return;
        }
        setError(msg);
        if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("email_not_confirmed")) {
          setShowResendHint(true);
        }
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setResendSuccess(false);
    setResendLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: trimmed,
      });
      if (err) {
        setError(err.message ?? "Failed to resend email");
        return;
      }
      setResendSuccess(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend confirmation email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-sm space-y-6 pt-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-indigo p-6 text-white shadow-hard dark:border-stone-950">
        <span aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-saffron" />
        <span aria-hidden className="absolute -bottom-6 right-14 h-12 w-12 rounded-full bg-chili" />
        <h1 className="relative text-4xl font-extrabold tracking-tight">Log in</h1>
        <p className="relative mt-1 max-w-[22ch] font-semibold text-white/90">Welcome back. Your thali is waiting.</p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="btn-outline press w-full min-h-12 gap-3 disabled:opacity-50"
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
        <div className="h-0.5 flex-1 rounded bg-stone-300 dark:bg-stone-700" />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">or</span>
        <div className="h-0.5 flex-1 rounded bg-stone-300 dark:bg-stone-700" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-ink dark:text-stone-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-12 rounded-2xl border-2 border-ink bg-white px-4 py-2.5 text-base font-semibold text-ink focus:outline-hidden focus:ring-4 focus:ring-saffron/50 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-bold text-ink dark:text-stone-200">
              Password
            </label>
            <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-bold text-ink underline decoration-saffron decoration-2 underline-offset-4 dark:text-saffron">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full min-h-12 rounded-2xl border-2 border-ink bg-white px-4 py-2.5 text-base font-semibold text-ink focus:outline-hidden focus:ring-4 focus:ring-saffron/50 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
          />
        </div>
        {(error || searchParams.get("error") === "auth_callback_failed") && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "That link is invalid or has expired, or was opened in a different browser. Please log in or request a new link."}
          </p>
        )}
        {showResendHint && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Your email isn&apos;t confirmed yet. Check your inbox for the confirmation link, or we can send a new one.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              className="btn-outline press w-full min-h-11 text-sm disabled:opacity-50"
            >
              {resendLoading ? "Sending…" : "Resend confirmation email"}
            </button>
            {resendSuccess && (
              <p className="text-sm text-green-700 dark:text-green-400">
                Check your inbox — we sent a new confirmation link.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="press w-full min-h-12 rounded-2xl border-2 border-ink bg-saffron px-4 py-3 text-base font-extrabold text-ink shadow-hard disabled:opacity-50 dark:border-stone-950"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>

        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            onClick={() => {
              setEmail("test@eatplan.com");
              setPassword("tester");
            }}
            className="btn-outline press w-full min-h-12 disabled:opacity-50 mt-2"
          >
            Bypass Login (Test User)
          </button>
        )}
      </form>
      <p className="text-center text-sm text-stone-600 dark:text-stone-400">
        Don&apos;t have an account?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline decoration-saffron decoration-2 underline-offset-4 dark:text-saffron">
          Sign up
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm pt-8 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700 h-64" />}>
      <LoginForm />
    </Suspense>
  );
}

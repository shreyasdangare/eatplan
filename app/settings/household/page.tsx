"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Link as LinkIcon, AlertCircle, ChevronLeft, RefreshCw, Ban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HouseholdSettings() {
  const router = useRouter();
  const [household, setHousehold] = useState<{ id: string; name: string; invite_code: string | null; my_role: string; members: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState("");

  const updateCode = async (action: "regenerate" | "revoke") => {
    const msg = action === "revoke" ? "Turn off invites? The current code will stop working." : "Make a new code? The current code will stop working.";
    if ((action === "revoke" || household?.invite_code) && !window.confirm(msg)) return;
    setCodeBusy(true);
    setCodeError("");
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update code");
      setHousehold((h) => (h ? { ...h, invite_code: data.invite_code } : h));
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeBusy(false);
    }
  };

  useEffect(() => {
    fetch("/api/household")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setHousehold(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopy = async () => {
    if (!household?.invite_code) return;
    try {
      await navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setJoining(true);
    setJoinError("");
    
    try {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to join");
      
      // Reload on success to get new household context
      window.location.reload();
    } catch (err: any) {
      setJoinError(err.message);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-saffron dark:border-stone-700 dark:border-t-saffron" />
      </div>
    );
  }

  const isAdmin = household?.my_role === "admin";
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28 sm:px-6">
      <Link href="/settings" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-ink dark:text-stone-200">
        <ChevronLeft className="h-5 w-5" /> Settings
      </Link>

      {/* Invite hero */}
      <section className="sticker-card overflow-hidden rounded-3xl">
        <div className="relative overflow-hidden bg-saffron p-5 text-ink">
          <span aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-chili" />
          <span aria-hidden className="absolute -bottom-10 right-16 h-16 w-16 rounded-full bg-pink" />
          <h1 className="relative text-3xl font-extrabold tracking-tight">Household</h1>
          <p className="relative mt-1 max-w-[28ch] font-semibold">Share one plan, one recipe box and one grocery list.</p>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">Invite code</p>
          {household?.invite_code ? (
            <div className="flex items-stretch gap-2">
              <code className="flex min-h-14 flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-ink bg-cream font-mono text-2xl font-bold tracking-[0.25em] text-ink dark:border-stone-500 dark:bg-stone-950 dark:text-saffron">
                {household.invite_code}
              </code>
              <button
                onClick={handleCopy}
                className="press flex w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-saffron text-ink shadow-hard dark:border-stone-950"
                aria-label="Copy invite code"
              >
                {copied ? <Check className="h-6 w-6" strokeWidth={3} /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-stone-400 p-4 text-sm font-semibold text-stone-600 dark:text-stone-400">
              Invites are off. Nobody can join with an old code.
            </p>
          )}
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Anyone with the code can join, so make a new one if it gets out.
          </p>
          {isAdmin && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={codeBusy} onClick={() => updateCode("regenerate")} className="btn-outline press text-sm disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> {household?.invite_code ? "New code" : "Turn on invites"}
              </button>
              {household?.invite_code && (
                <button type="button" disabled={codeBusy} onClick={() => updateCode("revoke")} className="btn-outline press text-sm disabled:opacity-50">
                  <Ban className="h-4 w-4" /> Turn off invites
                </button>
              )}
            </div>
          )}
          {codeError && <p className="mt-2 text-sm font-semibold text-chili dark:text-red-400">{codeError}</p>}
        </div>
      </section>

      {/* Members */}
      <section aria-labelledby="members" className="space-y-2">
        <h2 id="members" className="px-1 text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">
          Members · {household?.members?.length || 0}
        </h2>
        <ul className="sticker-card divide-y-2 divide-stone-200 overflow-hidden rounded-3xl dark:divide-stone-800">
          {household?.members?.map((member, idx) => (
            <li key={idx} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-extrabold uppercase text-ink dark:border-stone-950 ${["bg-pink", "bg-saffron", "bg-leaf text-white", "bg-indigo text-white"][idx % 4]}`}>
                {member.email?.charAt(0)}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold text-ink dark:text-stone-100">{member.email}</span>
              <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider dark:border-stone-500 ${member.role === "admin" ? "bg-ink text-saffron dark:bg-saffron dark:text-ink" : "bg-white text-ink dark:bg-stone-900 dark:text-stone-200"}`}>
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Join */}
      <section aria-labelledby="join" className="sticker-card rounded-3xl p-5">
        <h2 id="join" className="flex items-center gap-2 text-xl font-extrabold text-ink dark:text-stone-50">
          <LinkIcon className="h-5 w-5" /> Join another household
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Got a code from family? Enter it to move in with them.</p>
        <p className="mt-3 flex gap-2 rounded-2xl border-2 border-chili bg-chili/10 p-3 text-sm font-semibold text-chili dark:border-red-400/60 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          You will lose access to your current recipes, plan and list. If nobody else is in your current household, it is deleted.
        </p>
        <form onSubmit={handleJoin} className="mt-4 flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. K7QM4RTX"
            aria-label="Invite code"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-ink bg-cream px-4 font-mono text-base font-bold uppercase tracking-widest text-ink placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-500 focus:outline-hidden focus:ring-4 focus:ring-saffron/50 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
            required
          />
          <button type="submit" disabled={joining} className="press min-h-12 rounded-2xl border-2 border-ink bg-ink px-6 font-extrabold text-white shadow-hard disabled:opacity-50 dark:border-stone-950 dark:bg-saffron dark:text-ink">
            {joining ? "Joining…" : "Join"}
          </button>
        </form>
        {joinError && <p className="mt-3 text-sm font-semibold text-chili dark:text-red-400">{joinError}</p>}
      </section>
    </div>
  );
}

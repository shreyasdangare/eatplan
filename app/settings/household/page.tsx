"use client";

import { useEffect, useState } from "react";
import { Users, Copy, Check, Link as LinkIcon, AlertCircle } from "lucide-react";
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/settings" className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors">
          ← Back to Settings
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          <Users className="h-8 w-8 text-orange-500" /> Household Sharing
        </h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
          Invite your partner or family members to sync your meal plans, recipes, and pantry automatically in real-time.
        </p>
      </div>

      <div className="space-y-8">
        {/* Current Household Info */}
        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-xs ring-1 ring-stone-200/50 dark:ring-stone-700/50">
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white mb-6">
            Your Household
          </h2>
          
          <div className="mb-6">
             <label className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2 block">
                Invite Code
             </label>
             {household?.invite_code ? (
               <div className="flex items-center gap-2">
                 <code className="flex-1 rounded-xl bg-stone-100 dark:bg-stone-800 p-3.5 text-lg tracking-[0.2em] font-mono text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                   {household.invite_code}
                 </code>
                 <button
                   onClick={handleCopy}
                   className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30 transition-colors"
                   title="Copy code"
                   aria-label="Copy invite code"
                 >
                   {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                 </button>
               </div>
             ) : (
               <p className="rounded-xl bg-stone-100 p-3.5 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                 Invites are off. Nobody can join with an old code.
               </p>
             )}
             <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
               Share this code with family so they can join. Anyone with the code can join, so make a new one if it gets out.
             </p>
             {household?.my_role === "admin" && (
               <div className="mt-3 flex flex-wrap gap-2">
                 <button type="button" disabled={codeBusy} onClick={() => updateCode("regenerate")} className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:ring-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                   {household.invite_code ? "New code" : "Turn on invites"}
                 </button>
                 {household.invite_code && (
                   <button type="button" disabled={codeBusy} onClick={() => updateCode("revoke")} className="rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:ring-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                     Turn off invites
                   </button>
                 )}
               </div>
             )}
             {codeError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{codeError}</p>}
          </div>

          <div>
             <label className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2 block">
                Members ({household?.members?.length || 0})
             </label>
             <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {household?.members?.map((member, idx) => (
                  <li key={idx} className="flex items-center justify-between py-3">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {member.email}
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {member.role}
                    </span>
                  </li>
                ))}
             </ul>
          </div>
        </section>

        {/* Join Household */}
        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-xs ring-1 ring-stone-200/50 dark:ring-stone-700/50">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
            <LinkIcon className="h-5 w-5 text-stone-500 dark:text-stone-400" /> Join Existing Household
          </h2>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-6 max-w-md">
            Got an invite code from your partner? Enter it below to move into their household.
            <br/><span className="text-orange-600 dark:text-orange-400 font-bold">Warning:</span> You will lose access to your current recipes, plan and list. If nobody else is in your current household, it is deleted.
          </p>

          <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row">
             <input
               type="text"
               value={joinCode}
               onChange={(e) => setJoinCode(e.target.value)}
               placeholder="Invite code, e.g. K7QM4RTX"
               autoCapitalize="characters"
               autoComplete="off"
               className="flex-1 rounded-2xl border-0 bg-white px-4 py-3.5 text-sm ring-1 ring-inset ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-orange-500 dark:bg-stone-900 dark:text-white dark:ring-stone-700 dark:focus:ring-orange-500 shadow-xs"
               required
             />
             <button
               type="submit"
               disabled={joining}
               className="rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-stone-800 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
             >
               {joining ? "Joining..." : "Join"}
             </button>
          </form>
          {joinError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4" /> {joinError}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

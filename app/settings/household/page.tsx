"use client";

import { useEffect, useState } from "react";
import { Users, Copy, Check, Link as LinkIcon, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HouseholdSettings() {
  const router = useRouter();
  const [household, setHousehold] = useState<{ id: string; name: string; members: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

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
    if (!household?.id) return;
    try {
      await navigator.clipboard.writeText(household.id);
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
        body: JSON.stringify({ householdId: joinCode.trim() })
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
        <Link href="/settings" className="mb-6 inline-block text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors">
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
        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-sm ring-1 ring-stone-200/50 dark:ring-stone-700/50">
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white mb-6">
            Your Household
          </h2>
          
          <div className="mb-6">
             <label className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2 block">
                Your Join Code
             </label>
             <div className="flex items-center gap-2">
               <code className="flex-1 rounded-xl bg-stone-100 dark:bg-stone-800 p-3.5 text-sm font-mono text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 break-all">
                 {household?.id}
               </code>
               <button
                 onClick={handleCopy}
                 className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30 transition-colors"
                 title="Copy Code"
               >
                 {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
               </button>
             </div>
             <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
               Share this secure code with your family members so they can join your household.
             </p>
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
        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-sm ring-1 ring-stone-200/50 dark:ring-stone-700/50">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
            <LinkIcon className="h-5 w-5 text-stone-400" /> Join Existing Household
          </h2>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-6 max-w-md">
            Got an invite code from your partner? Paste it below to merge your account into their household. 
            <br/><span className="text-orange-600 dark:text-orange-400 font-bold">Warning:</span> You will lose access to your current isolated recipes and meal plans.
          </p>

          <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row">
             <input
               type="text"
               value={joinCode}
               onChange={(e) => setJoinCode(e.target.value)}
               placeholder="Paste household code here..."
               className="flex-1 rounded-2xl border-0 bg-white px-4 py-3.5 text-sm ring-1 ring-inset ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-orange-500 dark:bg-stone-900 dark:text-white dark:ring-stone-700 dark:focus:ring-orange-500 shadow-sm"
               required
             />
             <button
               type="submit"
               disabled={joining}
               className="rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
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

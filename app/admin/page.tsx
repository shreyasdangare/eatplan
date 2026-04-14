"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, CalendarDays, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

type UserStat = {
  id: string;
  email: string;
  name: string;
  language: string;
  created_at: string;
  last_sign_in: string | null;
  recipes: number;
  plans: number;
  llm: {
    calls: number;
    input_tokens: number;
    output_tokens: number;
    last_used: string | null;
  };
};

type AdminData = {
  users: UserStat[];
  dailyLlm: Record<string, number>;
  totals: {
    users: number;
    recipes: number;
    plans: number;
    llmCalls: number;
  };
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md dark:border-stone-700/60 dark:bg-stone-900/60">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">{value}</p>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">{label}</p>
      </div>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setError("Access denied. Admin only.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch stats");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Loading dashboard…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold text-red-600 dark:text-red-400">{error}</p>
        <Link href="/" className="text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400">← Back to home</Link>
      </section>
    );
  }

  if (!data) return null;

  // Build bar chart data for last 30 days
  const today = new Date();
  const chartDays: { label: string; date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    chartDays.push({
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      date: dateStr,
      count: data.dailyLlm[dateStr] ?? 0,
    });
  }
  const maxCount = Math.max(...chartDays.map((d) => d.count), 1);

  return (
    <section className="space-y-6 pb-12 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">Admin Dashboard</h1>
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Usage statistics & LLM monitoring</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-stone-700 shadow-sm transition-all hover:bg-stone-50 active:scale-95 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={data.totals.users} color="bg-blue-500" />
        <StatCard icon={BookOpen} label="Recipes Created" value={data.totals.recipes} color="bg-emerald-500" />
        <StatCard icon={CalendarDays} label="Meal Plans Set" value={data.totals.plans} color="bg-amber-500" />
        <StatCard icon={Sparkles} label="LLM Calls" value={data.totals.llmCalls} color="bg-violet-500" />
      </div>

      {/* LLM Usage Chart */}
      <div className="rounded-2xl border border-stone-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-stone-700/60 dark:bg-stone-900/60">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">LLM Calls — Last 30 Days</h2>
        <div className="flex items-end gap-[3px] h-32 overflow-hidden">
          {chartDays.map((day) => (
            <div key={day.date} className="group relative flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full rounded-t-sm bg-violet-500/80 dark:bg-violet-400/60 transition-all group-hover:bg-violet-600 dark:group-hover:bg-violet-400"
                style={{ height: `${Math.max((day.count / maxCount) * 100, day.count > 0 ? 4 : 0)}%` }}
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center min-w-max z-50">
                <div className="rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg dark:bg-stone-200 dark:text-stone-900">
                  {day.count} call{day.count !== 1 ? "s" : ""} · {day.label}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-semibold text-stone-400 dark:text-stone-500">
          <span>{chartDays[0]?.label}</span>
          <span>{chartDays[chartDays.length - 1]?.label}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-stone-200/60 bg-white/70 shadow-sm backdrop-blur-md dark:border-stone-700/60 dark:bg-stone-900/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200/50 dark:border-stone-700/50">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/50 bg-stone-50/50 dark:border-stone-700/50 dark:bg-stone-800/50">
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300">Name</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300">Email</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300 text-center">Recipes</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300 text-center">Plans</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300 text-center">LLM Calls</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300 text-center">Tokens (In/Out)</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300">Joined</th>
                <th className="px-4 py-3 font-bold text-stone-600 dark:text-stone-300">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/50 dark:divide-stone-700/50">
              {data.users.map((u) => (
                <tr key={u.id} className="group hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-stone-800 dark:text-stone-200">{u.name}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">{u.recipes}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{u.plans}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">{u.llm.calls}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-stone-600 dark:text-stone-400">
                    <span className="text-xs font-semibold">{formatTokens(u.llm.input_tokens)} / {formatTokens(u.llm.output_tokens)}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs font-semibold">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs font-semibold">{formatDate(u.last_sign_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

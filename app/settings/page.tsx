"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";
import { User, Users, LogOut, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (!u) {
          router.push("/login");
          return;
        }
        setUser(u);
        setLoading(false);
      });
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          <Settings className="h-8 w-8 text-stone-400" /> Settings
        </h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400 font-medium">
          Manage your account and household preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Info Card */}
        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-sm ring-1 ring-stone-200/50 dark:ring-stone-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white leading-tight">
                {user?.user_metadata?.preferred_name || "Chef"}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/settings/household"
              className="flex items-center justify-between rounded-2xl bg-stone-50/50 px-5 py-4 transition-all hover:bg-orange-50 hover:scale-[1.01] active:scale-[0.99] dark:bg-stone-900/50 dark:hover:bg-orange-500/10 group border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4">
                <Users className="h-5 w-5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                <span className="font-semibold text-stone-700 dark:text-stone-300">Manage Household</span>
              </div>
              <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-orange-400 transition-colors" />
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between rounded-2xl bg-stone-50/50 px-5 py-4 transition-all hover:bg-red-50 hover:scale-[1.01] active:scale-[0.99] dark:bg-stone-900/50 dark:hover:bg-red-900/20 group border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-4">
                <LogOut className="h-5 w-5 text-stone-400 group-hover:text-red-500 transition-colors" />
                <span className="font-semibold text-stone-700 dark:text-stone-300">Log out</span>
              </div>
            </button>
          </div>
        </section>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 py-4">
          EatPlan v0.1.0 • A Meal Planner by PP 🇮🇳
        </p>
      </div>
    </div>
  );
}

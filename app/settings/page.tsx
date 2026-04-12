"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";
import { User, LogOut, ChevronRight, Settings, Moon, Globe, Leaf, MessageSquare, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [isVegetarianOnly, setIsVegetarianOnly] = useState(false);
  const router = useRouter();
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (!u) {
          router.push("/login");
          return;
        }
        setUser(u);
        setNativeLanguage(u.user_metadata?.native_language || "");
        setIsVegetarianOnly(u.user_metadata?.isVegetarianOnly || false);
        setLoading(false);
      });
    });
  }, [router]);

  const handleUpdatePreferences = async (newLang: string, newVeg: boolean) => {
    setUpdating(true);
    const supabase = await getSupabaseClient();
    await supabase.auth.updateUser({
      data: {
        native_language: newLang,
        isVegetarianOnly: newVeg
      }
    });
    setUpdating(false);
  };

  const handleLogout = async () => {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading || !mounted) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 lg:px-8 space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-8 w-8 text-stone-400" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Settings
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">
            Manage your app preferences and account details.
          </p>
        </div>
      </div>

      {/* Option 1: Veg Only Mode */}
      <section className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Leaf className="h-5 w-5" />
             </div>
             <div>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">Dietary Preference</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Enable Vegetarian Only mode</p>
             </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const newVeg = !isVegetarianOnly;
              setIsVegetarianOnly(newVeg);
              handleUpdatePreferences(nativeLanguage, newVeg);
            }}
            disabled={updating}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${isVegetarianOnly ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${isVegetarianOnly ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* Option 2: Appearance (Dark Mode) */}
      <section className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Moon className="h-5 w-5" />
             </div>
             <div>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">Appearance</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Switch to {isDark ? "Light" : "Dark"} mode</p>
             </div>
        </div>
        <button
           type="button"
           onClick={() => setTheme(isDark ? "light" : "dark")}
           className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-stone-300 dark:bg-stone-700'}`}
        >
           <span className={`inline-block flex items-center justify-center h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-1'}`}>
              {isDark ? <Moon className="h-3 w-3 text-indigo-600" /> : <Sun className="h-3 w-3 text-amber-500" />}
           </span>
        </button>
      </section>

      {/* Option 3: Household */}
      <Link href="/settings/household" className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-sm flex items-center justify-between group transition-all hover:bg-stone-50 dark:hover:bg-stone-800/80 hover:scale-[1.01] active:scale-[0.99]">
        <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
             </div>
             <div>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">Manage Household</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Invite family members to collaborate</p>
             </div>
        </div>
        <ChevronRight className="h-5 w-5 text-stone-400 group-hover:text-blue-500 transition-colors" />
      </Link>

      {/* Mother Tongue Option */}
      <section className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-sm space-y-4">
        <label htmlFor="native_language" className="flex items-center gap-3 font-bold text-stone-900 dark:text-white leading-tight">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400">
             <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3>Mother Tongue</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Preferred language for generation</p>
          </div>
        </label>
        <div className="relative">
          <select
            id="native_language"
            value={nativeLanguage}
            onChange={(e) => {
              setNativeLanguage(e.target.value);
              handleUpdatePreferences(e.target.value, isVegetarianOnly);
            }}
            disabled={updating}
            className="w-full appearance-none rounded-2xl border border-stone-200/80 bg-white px-4 py-3 text-sm font-medium text-stone-800 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50 dark:border-stone-700/80 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-pink-500 dark:focus:ring-pink-500 shadow-sm transition-all"
          >
            <option value="">Select a language...</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Marathi">Marathi</option>
            <option value="Gujarati">Gujarati</option>
            <option value="Tamil">Tamil</option>
            <option value="Telugu">Telugu</option>
            <option value="Kannada">Kannada</option>
            <option value="Bengali">Bengali</option>
            <option value="Malayalam">Malayalam</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-400">
            <ChevronRight className="h-4 w-4 rotate-90" />
          </div>
        </div>
      </section>

      {/* Option 4: Send Feedback */}
      <Link href="/settings/feedback" className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-sm flex items-center justify-between group transition-all hover:bg-stone-50 dark:hover:bg-stone-800/80 hover:scale-[1.01] active:scale-[0.99]">
        <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
             </div>
             <div>
                <h3 className="font-bold text-stone-900 dark:text-white leading-tight">Send Feedback</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Report an issue or suggest a feature</p>
             </div>
        </div>
        <ChevronRight className="h-5 w-5 text-stone-400 group-hover:text-amber-500 transition-colors" />
      </Link>

      {/* Option 5: Account Section (Email & Logout) */}
      <section className="glass-panel overflow-hidden rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-red-100 dark:border-red-900/30">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white leading-tight">
              {user?.user_metadata?.preferred_name || "Account Profile"}
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-bold">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-100/80 dark:bg-red-900/30 px-5 py-3 text-sm font-bold text-red-700 dark:text-red-400 transition-colors hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </section>

      <p className="text-center text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 py-4">
        EatPlan v0.1.2 • A Meal Planner by PP 🇮🇳
      </p>
    </div>
  );
}

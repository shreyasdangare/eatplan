"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseBrowser";
import { LogOut, ChevronRight, Moon, Globe, Leaf, MessageSquare, ShoppingBasket, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { mutate as mutateCache } from "swr";
import { GROCERY_STORES, GROCERY_STORE_IDS, inferGroceryStore, isGroceryStore, type GroceryStore } from "@/lib/groceryStores";

function Toggle({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`tap relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-ink transition-colors disabled:opacity-50 dark:border-stone-500 ${on ? "bg-leaf" : "bg-stone-200 dark:bg-stone-800"}`}
  >
    <span className={`inline-block h-5 w-5 rounded-full border-2 border-ink bg-white transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${on ? "translate-x-7" : "translate-x-1"}`} />
  </button>
  );
}

function SettingIcon({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink dark:border-stone-950 ${tone}`}>{children}</span>
  );
}


export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [isVegetarianOnly, setIsVegetarianOnly] = useState(false);
  const [groceryStore, setGroceryStore] = useState<GroceryStore>("ah");
  // Only a store the user picked is saved (newStore below); until then the list infers one from the locale.
  const router = useRouter();
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getSupabaseClient().then((supabase) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user;
        if (!u) {
          router.push("/login");
          return;
        }
        setUser(u);
        setNativeLanguage(u.user_metadata?.native_language || "");
        setIsVegetarianOnly(u.user_metadata?.isVegetarianOnly || false);
        const savedStore = u.user_metadata?.grocery_store;
        setGroceryStore(
          isGroceryStore(savedStore)
            ? savedStore
            : inferGroceryStore({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language })
        );
        setLoading(false);
      });
    });
  }, [router]);

  const handleUpdatePreferences = async (newLang: string, newVeg: boolean, newStore?: GroceryStore) => {
    setUpdating(true);
    const supabase = await getSupabaseClient();
    await supabase.auth.updateUser({
      data: {
        native_language: newLang,
        isVegetarianOnly: newVeg,
        ...(newStore ? { grocery_store: newStore } : {}),
      }
    });
    // Server reads metadata from the JWT; refresh so the next request sees the change.
    await supabase.auth.refreshSession();
    // The grocery list caches the chosen store; drop it so the new choice shows straight away.
    void mutateCache("/api/grocery-prefs");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-saffron dark:border-stone-700 dark:border-t-saffron" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const rowText = (title: string, sub: string) => (
    <span className="min-w-0 flex-1">
      <span className="block font-extrabold leading-tight text-ink dark:text-stone-50">{title}</span>
      <span className="block text-sm text-stone-600 dark:text-stone-400">{sub}</span>
    </span>
  );

  const name = user?.user_metadata?.preferred_name || user?.email?.split("@")[0] || "You";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink dark:text-stone-50">Settings</h1>

      {/* Profile */}
      <section className="sticker-card overflow-hidden rounded-3xl">
        <div className="relative flex items-center gap-4 overflow-hidden bg-indigo p-5 text-white">
          <span aria-hidden className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-saffron" />
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-pink text-2xl font-extrabold uppercase text-ink">
            {name.charAt(0)}
          </span>
          <span className="relative min-w-0">
            <span className="block truncate text-xl font-extrabold">{name}</span>
            <span className="block truncate text-sm text-white/85">{user?.email}</span>
          </span>
        </div>
      </section>

      {/* Preferences */}
      <section aria-labelledby="prefs" className="space-y-2">
        <h2 id="prefs" className="px-1 text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">Preferences</h2>
        <div className="sticker-card divide-y-2 divide-stone-200 overflow-hidden rounded-3xl dark:divide-stone-800">
          <div className="flex items-center gap-3 p-4">
            <SettingIcon tone="bg-leaf text-white"><Leaf className="h-5 w-5" /></SettingIcon>
            {rowText("Vegetarian only", "Hide non-veg recipes")}
            <Toggle
              on={isVegetarianOnly}
              label="Vegetarian only"
              disabled={updating}
              onClick={() => {
                const v = !isVegetarianOnly;
                setIsVegetarianOnly(v);
                handleUpdatePreferences(nativeLanguage, v);
              }}
            />
          </div>
          <div className="flex items-center gap-3 p-4">
            <SettingIcon tone="bg-ink text-saffron dark:bg-saffron dark:text-ink">{isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</SettingIcon>
            {rowText("Dark mode", isDark ? "On" : "Off")}
            <Toggle on={isDark} label="Dark mode" onClick={() => setTheme(isDark ? "light" : "dark")} />
          </div>
          <div className="p-4">
            <label htmlFor="grocery_store" className="flex items-center gap-3">
              <SettingIcon tone="bg-indigo text-white"><ShoppingBasket className="h-5 w-5" /></SettingIcon>
              {rowText("Grocery store", "Where the weekly ingredient list links to")}
            </label>
            <div className="relative mt-3">
              <select
                id="grocery_store"
                value={groceryStore}
                onChange={(e) => {
                  const v = e.target.value as GroceryStore;
                  setGroceryStore(v);
                  handleUpdatePreferences(nativeLanguage, isVegetarianOnly, v);
                }}
                disabled={updating}
                className="min-h-12 w-full appearance-none rounded-2xl border-2 border-ink bg-cream px-4 text-base font-bold text-ink focus:outline-hidden focus:ring-4 focus:ring-saffron/50 disabled:opacity-50 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
              >
                {(["Netherlands", "India"] as const).map((region) => (
                  <optgroup key={region} label={region}>
                    {GROCERY_STORE_IDS.filter((id) => GROCERY_STORES[id].region === region).map((id) => (
                      <option key={id} value={id}>{GROCERY_STORES[id].label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronRight aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-ink dark:text-stone-300" />
            </div>
          </div>
          <div className="p-4">
            <label htmlFor="native_language" className="flex items-center gap-3">
              <SettingIcon tone="bg-pink text-ink"><Globe className="h-5 w-5" /></SettingIcon>
              {rowText("Mother tongue", "Preferred language for generation")}
            </label>
            <div className="relative mt-3">
              <select
                id="native_language"
                value={nativeLanguage}
                onChange={(e) => {
                  setNativeLanguage(e.target.value);
                  handleUpdatePreferences(e.target.value, isVegetarianOnly);
                }}
                disabled={updating}
                className="min-h-12 w-full appearance-none rounded-2xl border-2 border-ink bg-cream px-4 text-base font-bold text-ink focus:outline-hidden focus:ring-4 focus:ring-saffron/50 disabled:opacity-50 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
              >
                <option value="">Select a language…</option>
                {["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Bengali", "Malayalam", "Spanish", "French"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronRight aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-ink dark:text-stone-300" />
            </div>
          </div>
        </div>
      </section>

      {/* Kitchen */}
      <section aria-labelledby="kitchen" className="space-y-2">
        <h2 id="kitchen" className="px-1 text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">Kitchen</h2>
        <div className="sticker-card divide-y-2 divide-stone-200 overflow-hidden rounded-3xl dark:divide-stone-800">
          <Link href="/settings/household" className="flex min-h-16 items-center gap-3 p-4 transition-colors hover:bg-cream active:bg-saffron/20 dark:hover:bg-stone-800">
            <SettingIcon tone="bg-saffron text-ink"><Users className="h-5 w-5" /></SettingIcon>
            {rowText("Household", "Invite family to plan together")}
            <ChevronRight className="h-5 w-5 text-ink dark:text-stone-300" />
          </Link>
          <Link href="/settings/feedback" className="flex min-h-16 items-center gap-3 p-4 transition-colors hover:bg-cream active:bg-saffron/20 dark:hover:bg-stone-800">
            <SettingIcon tone="bg-indigo text-white"><MessageSquare className="h-5 w-5" /></SettingIcon>
            {rowText("Send feedback", "Report a bug or suggest a feature")}
            <ChevronRight className="h-5 w-5 text-ink dark:text-stone-300" />
          </Link>
        </div>
      </section>

      <button onClick={handleLogout} className="btn-outline press w-full text-chili dark:text-red-400">
        <LogOut className="h-5 w-5" />
        Log out
      </button>

      <p className="py-2 text-center text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
        EatPlan v0.1.2 · A meal planner by PP
      </p>
    </div>
  );
}

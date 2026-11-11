"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Link2, ShoppingBasket } from "lucide-react";
import { addDays, toISODate, weekStartOf } from "@/lib/dates";
import { groceryListToText, type GroceryGroup, type GroceryItem } from "@/lib/groceryAggregate";
import {
  GROCERY_STORES,
  GROCERY_STORE_IDS,
  inferGroceryStore,
  normalizeProductUrl,
  storeSearchUrl,
  type GroceryStore,
} from "@/lib/groceryStores";
import { saveGroceryStore } from "@/lib/groceryPrefsClient";
import { useCachedState } from "@/lib/swr";
import { toast } from "@/app/components/ui/Toast";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { GroceryShopFlow } from "@/app/components/GroceryShopFlow";

type Week = "this" | "next";
type GroceryResponse = { groups: GroceryGroup[]; mealCount: number };
type ProductLink = { ingredient_id: string; store: GroceryStore; url: string };
type Prefs = { store: GroceryStore | null; links: ProductLink[] };

// Stable fallbacks for the SWR cache hook.
const EMPTY_LIST: GroceryResponse = { groups: [], mealCount: 0 };
const EMPTY_PREFS: Prefs = { store: null, links: [] };

const TICK_PREFIX = "eatplan:grocery-ticked:";

function weekRange(week: Week) {
  const start = addDays(weekStartOf(new Date()), week === "next" ? 7 : 0);
  return { from: toISODate(start), to: toISODate(addDays(start, 6)) };
}

/** Ticked ingredient keys for a week, kept on this device (the list itself is derived from the plan). */
function useTicked(from: string) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TICK_PREFIX + from);
      setTicked(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      // Forget ticks from weeks that are long gone.
      const cutoff = toISODate(addDays(weekStartOf(new Date()), -14));
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(TICK_PREFIX) && k.slice(TICK_PREFIX.length) < cutoff) localStorage.removeItem(k);
      }
    } catch {
      setTicked(new Set());
    }
  }, [from]);

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        if (next.size) localStorage.setItem(TICK_PREFIX + from, JSON.stringify([...next]));
        else localStorage.removeItem(TICK_PREFIX + from);
      } catch {}
    },
    [from]
  );

  const toggle = useCallback(
    (key: string) => {
      setTicked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      });
    },
    [persist]
  );
  const reset = useCallback(() => {
    setTicked(new Set());
    persist(new Set());
  }, [persist]);
  return { ticked, toggle, reset };
}

/** Combined ingredient list for the meals planned this or next week, with one-tap links to your store. */
export function WeeklyGroceryList() {
  const [week, setWeek] = useState<Week>("this");
  const { from, to } = useMemo(() => weekRange(week), [week]);
  const { data, loading, error, revalidate } = useCachedState<GroceryResponse>(
    `/api/grocery-list?from=${from}&to=${to}`,
    EMPTY_LIST
  );
  const { data: prefs, setData: setPrefs, loading: prefsLoading, revalidate: revalidatePrefs } = useCachedState<Prefs>(
    "/api/grocery-prefs",
    EMPTY_PREFS
  );
  const { ticked, toggle, reset } = useTicked(from);

  // Locale-based default until the user picks a store (Indian time zone / -IN locale → India, else AH).
  const [inferred, setInferred] = useState<GroceryStore | null>(null);
  useEffect(() => {
    setInferred(
      inferGroceryStore({
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      })
    );
  }, []);
  const store: GroceryStore | null = prefs.store ?? (prefsLoading ? null : inferred);
  const storeDef = store ? GROCERY_STORES[store] : null;

  const linkMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of prefs.links) if (l.store === store) m.set(l.ingredient_id, l.url);
    return m;
  }, [prefs.links, store]);

  const rememberedUrl = useCallback((item: GroceryItem) => linkMap.get(item.key), [linkMap]);
  const hrefFor = useCallback(
    (item: GroceryItem) => (store ? rememberedUrl(item) ?? storeSearchUrl(store, item.name) : "#"),
    [store, rememberedUrl]
  );

  const { groups, mealCount } = data;
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const itemCount = allItems.length;
  const remaining = useMemo(() => allItems.filter((i) => !ticked.has(i.key)), [allItems, ticked]);
  const isTicked = useCallback((key: string) => ticked.has(key), [ticked]);

  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState<GroceryItem | null>(null);

  async function copy() {
    const text = groceryListToText(groups, `Groceries ${from} to ${to}`);
    try {
      await navigator.clipboard.writeText(text);
      toast("Grocery list copied");
    } catch {
      toast("Couldn't copy the list");
    }
  }

  async function chooseStore(next: GroceryStore) {
    setPrefs((p) => ({ ...p, store: next }));
    try {
      await saveGroceryStore(next);
      void revalidatePrefs();
    } catch {
      toast({ message: "Couldn't save your store. Try again.", tone: "error" });
      void revalidatePrefs();
    }
  }

  async function saveProduct(item: GroceryItem, url: string): Promise<string | null> {
    if (!store) return "Pick a store first.";
    const res = await fetch("/api/grocery-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient_id: item.key, store, url }),
    }).catch(() => null);
    if (!res) return "Couldn't reach the server. Try again.";
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) return body.error ?? "Couldn't save the product link.";
    const saved = body.url;
    setPrefs((p) => ({
      ...p,
      links: [...p.links.filter((l) => !(l.ingredient_id === item.key && l.store === store)), { ingredient_id: item.key, store, url: saved }],
    }));
    toast(`Saved your ${storeDef?.label} product for ${item.name}`);
    return null;
  }

  async function removeProduct(item: GroceryItem) {
    if (!store) return;
    setPrefs((p) => ({ ...p, links: p.links.filter((l) => !(l.ingredient_id === item.key && l.store === store)) }));
    const res = await fetch(
      `/api/grocery-prefs?ingredient_id=${encodeURIComponent(item.key)}&store=${store}`,
      { method: "DELETE" }
    ).catch(() => null);
    if (!res?.ok) {
      toast({ message: "Couldn't remove it. Refreshing…", tone: "error" });
      void revalidatePrefs();
    }
  }

  const tab = (w: Week, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={week === w}
      onClick={() => setWeek(w)}
      className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-extrabold ${
        week === w ? "border-2 border-ink bg-saffron text-ink" : "border-2 border-transparent text-stone-700 dark:text-stone-300"
      }`}
    >
      {label}
    </button>
  );

  const showSkeleton = loading || !store;

  return (
    <section
      aria-labelledby="weekly-grocery-heading"
      className="sticker-card space-y-3 rounded-3xl p-4"
      data-testid="weekly-grocery-list"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="weekly-grocery-heading" className="text-lg font-extrabold leading-tight text-ink dark:text-stone-50">
          Ingredients for planned meals
        </h2>
        <button
          type="button"
          onClick={copy}
          disabled={showSkeleton || itemCount === 0}
          className="btn-outline press min-h-11 shrink-0 text-sm disabled:opacity-50"
        >
          <Copy className="h-4 w-4" aria-hidden />
          Copy list
        </button>
      </div>

      <div role="tablist" aria-label="Week" className="flex gap-1 rounded-2xl border-2 border-ink bg-cream p-1 dark:border-stone-500 dark:bg-stone-800">
        {tab("this", "This week")}
        {tab("next", "Next week")}
      </div>

      <label className="flex items-center gap-2 text-sm font-extrabold text-ink dark:text-stone-200">
        <span className="shrink-0">Shop at</span>
        <span className="relative min-w-0 flex-1">
          <select
            data-testid="grocery-store-select"
            value={store ?? ""}
            onChange={(e) => void chooseStore(e.target.value as GroceryStore)}
            disabled={!store}
            className="min-h-11 w-full appearance-none rounded-2xl border-2 border-ink bg-white pl-3 pr-9 text-sm font-bold text-ink focus:outline-hidden focus:ring-4 focus:ring-saffron/50 disabled:opacity-60 dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
          >
            {(["Netherlands", "India"] as const).map((region) => (
              <optgroup key={region} label={region}>
                {GROCERY_STORE_IDS.filter((id) => GROCERY_STORES[id].region === region).map((id) => (
                  <option key={id} value={id}>
                    {GROCERY_STORES[id].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink dark:text-stone-300" />
        </span>
      </label>

      {showSkeleton ? (
        <div aria-busy="true" aria-label="Loading ingredients" className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-2xl bg-stone-200/80 dark:bg-stone-700/60" />
          ))}
        </div>
      ) : error && itemCount === 0 ? (
        <p className="text-sm text-chili dark:text-red-400">
          Couldn&apos;t load ingredients.{" "}
          <button type="button" onClick={() => void revalidate()} className="font-extrabold underline">
            Try again
          </button>
        </p>
      ) : itemCount === 0 ? (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {mealCount === 0
            ? `No meals planned for ${week === "this" ? "this" : "next"} week yet.`
            : "The planned recipes have no ingredients yet."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-stone-600 dark:text-stone-400" data-testid="grocery-progress">
              {remaining.length} of {itemCount} left · {mealCount} planned {mealCount === 1 ? "meal" : "meals"}
            </p>
            {ticked.size > 0 && (
              <button type="button" onClick={reset} className="tap text-sm font-extrabold text-indigo underline underline-offset-2 dark:text-saffron">
                Reset ticks
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="shop-next"
            onClick={() => setShopOpen(true)}
            disabled={remaining.length === 0}
            className="press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-saffron text-base font-extrabold text-ink shadow-hard disabled:opacity-50 dark:border-stone-950"
          >
            <ShoppingBasket className="h-5 w-5" aria-hidden />
            {remaining.length === 0
              ? "Everything ticked off"
              : ticked.size === 0
                ? `Shop next item at ${storeDef?.short}`
                : `Shop next item (${remaining.length} left)`}
          </button>

          {groups.map((g) => (
            <div key={g.category}>
              <h3 className="mb-1 text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">{g.category}</h3>
              <ul className="divide-y-2 divide-stone-200 dark:divide-stone-800">
                {g.items.map((item) => {
                  const done = ticked.has(item.key);
                  const mine = rememberedUrl(item);
                  const canRemember = !item.key.startsWith("name:");
                  return (
                    <li key={item.key} className="flex items-center gap-2 py-1.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        aria-label={`${item.name}: ${done ? "ticked off" : "not bought yet"}`}
                        onClick={() => toggle(item.key)}
                        className={`press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink dark:border-stone-500 ${done ? "bg-leaf text-white" : "bg-white dark:bg-stone-900"}`}
                      >
                        {done && <Check className="h-5 w-5" aria-hidden />}
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-bold ${done ? "text-stone-500 line-through dark:text-stone-500" : "text-ink dark:text-stone-100"}`}>
                          {item.name}
                          {item.quantities.length > 0 && (
                            <span className="font-semibold text-stone-600 dark:text-stone-400"> · {item.quantities.join(" + ")}</span>
                          )}
                        </span>
                        {canRemember && (
                          <button
                            type="button"
                            onClick={() => setEditing(item)}
                            aria-label={`${mine ? "Change" : "Set"} my ${storeDef?.label} product for ${item.name}`}
                            className="tap mt-0.5 inline-flex items-center gap-1 text-xs font-extrabold text-indigo underline underline-offset-2 dark:text-saffron"
                          >
                            <Link2 className="h-3 w-3" aria-hidden />
                            {mine ? "Change product" : "Set my product"}
                          </button>
                        )}
                      </span>
                      <a
                        href={hrefFor(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${mine ? "Open my" : "Search"} ${item.name} ${mine ? "product " : ""}at ${storeDef?.label}`}
                        data-testid="store-link"
                        data-remembered={mine ? "1" : "0"}
                        className={`press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-ink px-3 text-xs font-extrabold shadow-hard dark:border-stone-950 ${
                          mine ? "bg-leaf text-white" : "bg-white text-indigo dark:bg-stone-900 dark:text-saffron"
                        }`}
                      >
                        {storeDef?.short}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </>
      )}

      {store && storeDef && (
        <>
          <GroceryShopFlow
            open={shopOpen}
            paused={editing !== null}
            onClose={() => setShopOpen(false)}
            items={remaining}
            storeLabel={storeDef.label}
            hrefFor={hrefFor}
            isRemembered={(i) => linkMap.has(i.key)}
            isTicked={isTicked}
            onTick={toggle}
            onSetProduct={setEditing}
          />
          <ProductSheet
            item={editing}
            store={store}
            current={editing ? linkMap.get(editing.key) : undefined}
            onClose={() => setEditing(null)}
            onSave={saveProduct}
            onRemove={removeProduct}
          />
        </>
      )}
    </section>
  );
}

/** "Set my product": paste the product page link from the store; validated to that store's domain. */
function ProductSheet({
  item,
  store,
  current,
  onClose,
  onSave,
  onRemove,
}: {
  item: GroceryItem | null;
  store: GroceryStore;
  current?: string;
  onClose: () => void;
  onSave: (item: GroceryItem, url: string) => Promise<string | null>;
  onRemove: (item: GroceryItem) => Promise<void>;
}) {
  const def = GROCERY_STORES[store];
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);

  // Reset the form each time the sheet opens for an item.
  const key = item?.key ?? null;
  if (key !== seen) {
    setSeen(key);
    setValue(current ?? "");
    setError(null);
    setSaving(false);
  }

  async function submit() {
    if (!item) return;
    const clean = normalizeProductUrl(store, value);
    if (!clean) {
      setError(`That isn't a product link from ${def.label}. Open the product there and paste its page link (like ${def.productExample}).`);
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSave(item, clean);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text);
        setError(null);
      }
    } catch {
      setError("Couldn't read the clipboard. Long-press the box and paste.");
    }
  }

  return (
    <BottomSheet
      open={item !== null}
      onClose={onClose}
      dismissible={!saving}
      title={item ? `My ${def.label} product` : "My product"}
      subtitle={item ? `${item.name}: the exact product you buy` : undefined}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !value.trim()}
            data-testid="product-save"
            className="press min-h-12 w-full rounded-2xl border-2 border-ink bg-saffron text-base font-extrabold text-ink shadow-hard disabled:opacity-50 dark:border-stone-950"
          >
            {saving ? "Saving…" : "Save product"}
          </button>
          {current && item && (
            <button
              type="button"
              onClick={() => {
                void onRemove(item);
                onClose();
              }}
              disabled={saving}
              className="btn-outline press min-h-12 w-full text-base text-chili dark:text-red-400"
            >
              Remove, use search again
            </button>
          )}
        </div>
      }
    >
      {item && (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700 dark:text-stone-300">
            <li>
              <a
                href={storeSearchUrl(store, item.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-indigo underline underline-offset-2 dark:text-saffron"
              >
                Find it at {def.label} ↗
              </a>{" "}
              and open the product.
            </li>
            <li>Copy the page link and paste it here.</li>
          </ol>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-autofocus
              data-testid="product-url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder={`https://${def.productExample}`}
              aria-label={`${def.label} product link`}
              aria-invalid={error ? true : undefined}
              className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-ink bg-white px-3 font-semibold dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
            />
            <button type="button" onClick={() => void paste()} className="btn-outline press min-h-12 shrink-0 text-sm">
              Paste
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold text-chili dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

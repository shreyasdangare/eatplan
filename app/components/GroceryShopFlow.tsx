"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Link2, PartyPopper, SkipForward } from "lucide-react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import type { GroceryItem } from "@/lib/groceryAggregate";

type Props = {
  open: boolean;
  /** Hide the sheet without ending the flow (e.g. while the product editor is open). */
  paused?: boolean;
  onClose: () => void;
  /** Unticked items in list order, captured when the flow opens. */
  items: GroceryItem[];
  storeLabel: string;
  /** Link for an item: its remembered product page, or a search. */
  hrefFor: (item: GroceryItem) => string;
  isRemembered: (item: GroceryItem) => boolean;
  isTicked: (key: string) => boolean;
  onTick: (key: string) => void;
  onSetProduct: (item: GroceryItem) => void;
};

/**
 * "Shop next item": steps through the unbought ingredients one at a time. Big thumb-sized buttons:
 * open the store link, then tick the item off and move on.
 */
export function GroceryShopFlow({ open, paused, onClose, items, storeLabel, hrefFor, isRemembered, isTicked, onTick, onSetProduct }: Props) {
  const [queue, setQueue] = useState<GroceryItem[]>([]);
  const [pos, setPos] = useState(0);
  const [opened, setOpened] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Freeze the queue when the flow opens, so ticking items does not reshuffle it under the user.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQueue(items);
      setPos(0);
      setOpened(false);
    }
  }

  // Skip over items that were ticked elsewhere meanwhile.
  const currentPos = useMemo(() => {
    let p = pos;
    while (p < queue.length && isTicked(queue[p].key)) p++;
    return p;
  }, [pos, queue, isTicked]);
  const done = open && currentPos >= queue.length;
  const item = queue[currentPos];

  const total = queue.length;
  const next = () => {
    setOpened(false);
    setPos(currentPos + 1);
  };
  const back = () => {
    const p = currentPos - 1;
    if (p < 0) return;
    // Un-tick the previous item so "Back" is a real undo.
    if (isTicked(queue[p].key)) onTick(queue[p].key);
    setOpened(false);
    setPos(p);
  };

  const footer = done ? (
    <button type="button" onClick={onClose} className="press min-h-14 w-full rounded-2xl border-2 border-ink bg-saffron text-base font-extrabold text-ink shadow-hard dark:border-stone-950">
      Done
    </button>
  ) : item ? (
    <div className="flex flex-col gap-2.5">
      <a
        href={hrefFor(item)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        data-testid="shop-open"
        className={`press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink text-base font-extrabold shadow-hard dark:border-stone-950 ${
          opened ? "bg-white text-ink dark:bg-stone-900 dark:text-stone-100" : "bg-saffron text-ink"
        }`}
      >
        <ExternalLink className="h-5 w-5" aria-hidden />
        {isRemembered(item) ? `Open my ${storeLabel} product` : `Search at ${storeLabel}`}
      </a>
      <button
        type="button"
        data-testid="shop-done"
        onClick={() => {
          onTick(item.key);
          if (navigator.vibrate) navigator.vibrate(10);
          next();
        }}
        className={`press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink text-base font-extrabold shadow-hard dark:border-stone-950 ${
          opened ? "bg-leaf text-white" : "bg-white text-ink dark:bg-stone-900 dark:text-stone-100"
        }`}
      >
        <Check className="h-5 w-5" aria-hidden />
        {opened ? "Added it, next item" : "Got it, next item"}
      </button>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={back} disabled={currentPos === 0} className="btn-outline press min-h-12 text-sm disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <button type="button" onClick={next} className="btn-outline press min-h-12 text-sm">
          Skip <SkipForward className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <BottomSheet
      open={open && !paused}
      onClose={onClose}
      title={done ? "All done" : `Item ${currentPos + 1} of ${total}`}
      subtitle={done ? undefined : `Shopping at ${storeLabel}`}
      footer={footer}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-pink text-ink">
            <PartyPopper className="h-8 w-8" aria-hidden />
          </span>
          <p className="text-lg font-extrabold text-ink dark:text-stone-50">That&apos;s the whole list.</p>
          <p className="text-sm text-stone-600 dark:text-stone-400">Finish checkout in the {storeLabel} app or site.</p>
        </div>
      ) : item ? (
        <div className="space-y-4 py-2">
          <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white dark:border-stone-500 dark:bg-stone-950" aria-hidden>
            <div className="h-full bg-saffron transition-[width] duration-300" style={{ width: `${(currentPos / Math.max(total, 1)) * 100}%` }} />
          </div>
          <div className="rounded-3xl border-2 border-ink bg-cream p-5 shadow-hard dark:border-stone-500 dark:bg-stone-800">
            <p className="text-xs font-extrabold uppercase tracking-widest text-stone-600 dark:text-stone-400">{item.category}</p>
            <p data-testid="shop-item-name" className="mt-1 text-3xl font-extrabold leading-tight text-ink dark:text-stone-50">{item.name}</p>
            {item.quantities.length > 0 && (
              <p className="mt-1 text-lg font-bold text-indigo dark:text-saffron">{item.quantities.join(" + ")}</p>
            )}
          </div>
          {!item.key.startsWith("name:") && (
            <button
              type="button"
              onClick={() => onSetProduct(item)}
              className="tap inline-flex items-center gap-1.5 text-sm font-extrabold text-indigo underline underline-offset-2 dark:text-saffron"
            >
              <Link2 className="h-4 w-4" aria-hidden />
              {isRemembered(item) ? "Change my product" : "Set my product"}
            </button>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Sticky action area pinned to the bottom of the sheet (above the home indicator). */
  footer?: ReactNode;
  /** Prevent closing via backdrop/Escape/swipe (e.g. while saving). */
  dismissible?: boolean;
  /** Tall sheets (pickers) get a minimum height so the list has room. */
  size?: "auto" | "tall";
};

/**
 * Mobile-first modal: a bottom sheet on phones, a centred dialog from `sm` up.
 * Renders in a portal above the bottom tab bar (z-200), traps focus, locks body
 * scroll, closes on Escape / backdrop / swipe-down on the handle, and pads for
 * the iOS home indicator.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissible = true,
  size = "auto",
}: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.sheetOpen = "1";
    // Focus the first focusable element (or the panel) once painted.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
      first.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      delete document.documentElement.dataset.sheetOpen;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open, dismissible]);

  if (!open || !mounted) return null;

  const onHandleStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  };
  const onHandleMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onHandleEnd = () => {
    if (dragY > 90 && dismissible) onClose();
    dragStart.current = null;
    setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-200 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px] motion-safe:animate-[fade-in_150ms_ease-out]"
        aria-hidden
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t border-stone-200 bg-white shadow-[0_-12px_40px_rgb(0_0_0/0.18)] outline-hidden motion-safe:animate-[sheet-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] dark:border-stone-800 dark:bg-stone-900 sm:max-w-lg sm:rounded-3xl sm:border ${
          size === "tall" ? "min-h-[65dvh] sm:min-h-0 sm:max-h-[80dvh]" : ""
        }`}
      >
        <div
          className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
          aria-hidden
        >
          <div className="h-1.5 w-11 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-1 sm:pt-5"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
        >
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm font-medium text-stone-600 dark:text-stone-300">{subtitle}</p>
            ) : null}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 active:scale-95 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-stone-200 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-stone-800 dark:bg-stone-900">
            {footer}
          </div>
        ) : (
          <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>,
    document.body
  );
}

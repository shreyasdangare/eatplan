"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ShoppingLine = {
  ingredient_id: string;
  ingredient_name: string;
  quantity_display: string;
  in_stock_reason?: string;
};
type TodoistProject = { id: string; name: string };

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(weekStart: Date): string[] {
  const out: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function ShoppingListPage() {
  const [toBuy, setToBuy] = useState<ShoppingLine[]>([]);
  const [inStock, setInStock] = useState<ShoppingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [todoistConnected, setTodoistConnected] = useState<boolean | null>(null);
  const [todoistProjects, setTodoistProjects] = useState<TodoistProject[]>([]);
  const [syncProjectId, setSyncProjectId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ created: number; failed: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; skipped: number } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const weekStart = getWeekStart(new Date());
  const weekDates = getWeekDates(weekStart);
  const from = weekDates[0];
  const to = weekDates[6];

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/shopping-list?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          to_buy?: ShoppingLine[];
          in_stock?: ShoppingLine[];
        };
        setToBuy(data.to_buy ?? []);
        setInStock(data.in_stock ?? []);
      } else {
        setToBuy([]);
        setInStock([]);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/auth/todoist/status");
    const data = (await res.json()) as { connected: boolean; project_id?: string | null };
    setTodoistConnected(data.connected);
    if (data.connected) {
      const projRes = await fetch("/api/todoist/projects");
      if (projRes.ok) {
        const projData = (await projRes.json()) as { projects: TodoistProject[] };
        setTodoistProjects(projData.projects ?? []);
        if (projData.projects?.length && !syncProjectId) {
          const saved = data.project_id && projData.projects.some((p) => p.id === data.project_id)
            ? data.project_id
            : null;
          const shopping = projData.projects.find(
            (p) => /shopping|list|grocery/i.test(p.name)
          );
          setSyncProjectId(saved ?? shopping?.id ?? projData.projects[0].id);
        }
      }
    }
  }, [syncProjectId]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const err = params.get("error");
    if (err === "denied") setAuthError("You denied access.");
    else if (err === "token" || err === "missing") setAuthError("Sign-in failed. Try again.");
    else if (err) setAuthError("Something went wrong.");
  }, []);

  const copyList = () => {
    if (toBuy.length === 0) return;
    const text = toBuy
      .map((l) =>
        l.quantity_display
          ? `${l.ingredient_name}: ${l.quantity_display}`
          : l.ingredient_name
      )
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  const pushToTodoist = async () => {
    if (toBuy.length === 0 || !syncProjectId) return;
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/todoist/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_buy: toBuy.map((l) => ({
            ingredient_name: l.ingredient_name,
            quantity_display: l.quantity_display,
          })),
          project_id: syncProjectId,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (data) {
        setPushResult({ created: data.created ?? 0, failed: data.failed ?? 0 });
      }
    } finally {
      setPushing(false);
    }
  };

  const syncFromTodoist = async () => {
    if (!syncProjectId) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/pantry/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: syncProjectId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.ok) setSyncResult({ added: data.added ?? 0, skipped: data.skipped ?? 0 });
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    await fetch("/api/auth/todoist/disconnect", { method: "POST" });
    setTodoistConnected(false);
    setTodoistProjects([]);
    setSyncProjectId("");
    setSyncResult(null);
    setPushResult(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            Shopping list
          </h2>
          <p className="text-xs text-amber-700">
            From this week’s meal plan (Mon–Sun). Connect Todoist to push items and sync pantry.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
        >
          Home
        </Link>
      </div>

      {authError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {authError}
        </p>
      )}

      <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-amber-800">
          Todoist – push list & sync pantry
        </h3>
        {todoistConnected === null ? (
          <p className="text-xs text-amber-700">Checking…</p>
        ) : todoistConnected ? (
          <div className="space-y-2">
            <p className="text-xs text-amber-700">
              Connected. Choose a project for shopping tasks, then push or sync.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={syncProjectId}
                onChange={(e) => setSyncProjectId(e.target.value)}
                className="rounded border border-orange-200 bg-white px-2 py-1.5 text-xs"
              >
                {todoistProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pushing || toBuy.length === 0 || !syncProjectId}
                onClick={pushToTodoist}
                className="rounded-full bg-lime-500 px-3 py-1.5 text-xs font-medium text-lime-950 disabled:opacity-50 hover:bg-lime-400"
              >
                {pushing ? "Pushing…" : "Push to Todoist"}
              </button>
              <button
                type="button"
                disabled={syncing || !syncProjectId}
                onClick={syncFromTodoist}
                className="rounded-full bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-50 hover:bg-amber-300"
              >
                {syncing ? "Syncing…" : "Sync from Todoist"}
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
              >
                Disconnect
              </button>
            </div>
            {syncResult !== null && (
              <p className="text-[11px] text-amber-700">
                Added {syncResult.added} to pantry, {syncResult.skipped} not matched.
              </p>
            )}
            {pushResult !== null && (
              <p className="text-[11px] text-amber-700">
                {pushResult.created > 0 && <span>{pushResult.created} item{pushResult.created !== 1 ? "s" : ""} added to Todoist.</span>}
                {pushResult.failed > 0 && <span> {pushResult.failed} failed (check console for details).</span>}
                {pushResult.created === 0 && pushResult.failed === 0 && (
                  <span>No items were pushed. Make sure ingredients are listed under &quot;To buy&quot; (not all in pantry).</span>
                )}
              </p>
            )}
          </div>
        ) : (
          <a
            href="/api/auth/todoist"
            className="inline-block rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
          >
            Sign in with Todoist
          </a>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-amber-700">Loading list…</p>
      ) : (
        <>
          <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-amber-800">
                To buy
              </h3>
              {toBuy.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyList}
                    className="rounded-full bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-300"
                  >
                    Copy list
                  </button>
                </div>
              )}
            </div>
            {toBuy.length === 0 && inStock.length === 0 ? (
              <p className="text-sm text-amber-700">
                No ingredients this week. Plan meals on the Plan page first.
              </p>
            ) : toBuy.length === 0 ? (
              <p className="text-sm text-amber-700">
                Everything is in stock. Nothing to buy.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {toBuy.map((l) => (
                  <li
                    key={l.ingredient_id}
                    className="flex justify-between gap-2"
                  >
                    <span>{l.ingredient_name}</span>
                    {l.quantity_display && (
                      <span className="text-amber-700">{l.quantity_display}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {inStock.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
              <h3 className="text-xs font-semibold text-amber-800 mb-2">
                Already in pantry (not added to list)
              </h3>
              <ul className="space-y-1 text-sm text-amber-700">
                {inStock.map((l) => (
                  <li key={l.ingredient_id} className="flex justify-between gap-2">
                    <span>{l.ingredient_name}</span>
                    {l.in_stock_reason && (
                      <span className="text-[11px]">{l.in_stock_reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

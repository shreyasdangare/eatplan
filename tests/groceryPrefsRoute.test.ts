import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { op: string; args: unknown[] }[] = [];
let selectResult: { data: unknown; error: { code: string } | null } = { data: [], error: null };
let upsertResult: { error: { code: string } | null } = { error: null };
let authResult: unknown = { user: { id: "u1", grocery_store: "ah" } };
let household: string | null = "h1";

vi.mock("@/lib/supabaseServer", () => {
  return {
    supabaseServer: {
      from: () => ({
        select: () => {
          const q: Record<string, unknown> = {};
          q.eq = () => Promise.resolve(selectResult);
          return q;
        },
        upsert: (...args: unknown[]) => {
          calls.push({ op: "upsert", args });
          return Promise.resolve(upsertResult);
        },
        delete: () => {
          const q: Record<string, unknown> = {};
          q.eq = (...a: unknown[]) => {
            calls.push({ op: "delete.eq", args: a });
            return a[0] === "store" ? Promise.resolve({ error: null }) : q;
          };
          return q;
        },
      }),
    },
  };
});
vi.mock("@/lib/supabaseServerClient", () => ({ requireAuth: async () => authResult }));
vi.mock("@/lib/getHouseholdId", () => ({ getHouseholdId: async () => household }));

import { DELETE, GET, PUT } from "@/app/api/grocery-prefs/route";

const ING = "123e4567-e89b-12d3-a456-426614174000";
const put = (body: unknown) =>
  PUT(new Request("http://x/api/grocery-prefs", { method: "PUT", body: JSON.stringify(body) }) as never);

beforeEach(() => {
  calls.length = 0;
  selectResult = { data: [], error: null };
  upsertResult = { error: null };
  authResult = { user: { id: "u1", grocery_store: "ah" } };
  household = "h1";
});

describe("/api/grocery-prefs", () => {
  it("GET returns the chosen store and the household's links", async () => {
    selectResult = { data: [{ ingredient_id: ING, store: "ah", url: "https://www.ah.nl/producten/product/wi1/x" }], error: null };
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ store: "ah", links: selectResult.data });
  });

  it("GET ignores an unknown stored store and works before the migration is applied", async () => {
    authResult = { user: { id: "u1", grocery_store: "bigbasket" } };
    selectResult = { data: null, error: { code: "42P01" } };
    const res = await GET();
    expect(await res.json()).toEqual({ store: null, links: [] });
  });

  it("GET requires auth and a household", async () => {
    authResult = { error: new Response("{}", { status: 401 }) };
    expect((await GET()).status).toBe(401);
    authResult = { user: { id: "u1" } };
    household = null;
    expect((await GET()).status).toBe(403);
  });

  it("PUT saves a cleaned URL scoped to the caller's household", async () => {
    const res = await put({ ingredient_id: ING, store: "ah", url: "https://www.ah.nl/producten/product/wi441199/melk?utm=1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://www.ah.nl/producten/product/wi441199/melk" });
    const up = calls.find((c) => c.op === "upsert")!;
    expect(up.args[0]).toMatchObject({ household_id: "h1", ingredient_id: ING, store: "ah", url: "https://www.ah.nl/producten/product/wi441199/melk" });
  });

  it("PUT rejects a link from another store's domain, bad store and bad ingredient", async () => {
    expect((await put({ ingredient_id: ING, store: "ah", url: "https://www.jumbo.com/producten/melk-1l-12345BAK" })).status).toBe(400);
    expect((await put({ ingredient_id: ING, store: "bigbasket", url: "https://x.com" })).status).toBe(400);
    expect((await put({ ingredient_id: "nope", store: "ah", url: "https://www.ah.nl/producten/product/wi1" })).status).toBe(400);
    expect((await put(null)).status).toBe(400);
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("PUT maps an unknown ingredient (FK violation) to 400", async () => {
    upsertResult = { error: { code: "23503" } };
    expect((await put({ ingredient_id: ING, store: "ah", url: "https://www.ah.nl/producten/product/wi1" })).status).toBe(400);
  });

  it("DELETE validates input and scopes to the household", async () => {
    const bad = await DELETE(new Request("http://x/api/grocery-prefs?ingredient_id=nope&store=ah", { method: "DELETE" }) as never);
    expect(bad.status).toBe(400);
    const ok = await DELETE(new Request(`http://x/api/grocery-prefs?ingredient_id=${ING}&store=zepto`, { method: "DELETE" }) as never);
    expect(ok.status).toBe(200);
    expect(calls.filter((c) => c.op === "delete.eq").map((c) => c.args)).toEqual([
      ["household_id", "h1"],
      ["ingredient_id", ING],
      ["store", "zepto"],
    ]);
  });
});

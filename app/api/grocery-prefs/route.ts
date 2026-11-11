import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { isGroceryStore, normalizeProductUrl, GROCERY_STORES } from "@/lib/groceryStores";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET: the user's chosen grocery store (null = not chosen yet, the client infers a default) and the
 * household's remembered product links for every store: { links: [{ ingredient_id, store, url }] }.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const store = isGroceryStore(auth.user.grocery_store) ? auth.user.grocery_store : null;
  const { data, error } = await supabaseServer
    .from("grocery_product_links")
    .select("ingredient_id, store, url")
    .eq("household_id", householdId);
  if (error) {
    // Table not migrated yet: the list still works with plain search links.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return NextResponse.json({ store, links: [] });
    }
    console.error("grocery-prefs: select failed", error);
    return NextResponse.json({ error: "Failed to load grocery settings" }, { status: 500 });
  }
  return NextResponse.json({ store, links: data ?? [] });
}

/** PUT { ingredient_id, store, url }: remember the product page for an ingredient at a store. */
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { ingredient_id?: unknown; store?: unknown; url?: unknown } | null;
  const ingredientId = typeof body?.ingredient_id === "string" ? body.ingredient_id : "";
  if (!UUID.test(ingredientId)) return NextResponse.json({ error: "Invalid ingredient" }, { status: 400 });
  if (!isGroceryStore(body?.store)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  const store = body.store;
  const url = typeof body?.url === "string" ? normalizeProductUrl(store, body.url) : null;
  if (!url) {
    return NextResponse.json(
      { error: `Paste a product page link from ${GROCERY_STORES[store].label} (like ${GROCERY_STORES[store].productExample}).` },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from("grocery_product_links")
    .upsert(
      { household_id: householdId, ingredient_id: ingredientId, store, url, updated_at: new Date().toISOString() },
      { onConflict: "household_id,ingredient_id,store" }
    );
  if (error) {
    if (error.code === "23503") return NextResponse.json({ error: "Unknown ingredient" }, { status: 400 });
    console.error("grocery-prefs: upsert failed", error);
    return NextResponse.json({ error: "Couldn't save the product link" }, { status: 500 });
  }
  return NextResponse.json({ ingredient_id: ingredientId, store, url });
}

/** DELETE ?ingredient_id=…&store=…: forget a remembered product (back to search). */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredient_id") ?? "";
  const store = searchParams.get("store");
  if (!UUID.test(ingredientId) || !isGroceryStore(store)) {
    return NextResponse.json({ error: "Invalid ingredient or store" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("grocery_product_links")
    .delete()
    .eq("household_id", householdId)
    .eq("ingredient_id", ingredientId)
    .eq("store", store);
  if (error) {
    console.error("grocery-prefs: delete failed", error);
    return NextResponse.json({ error: "Couldn't remove the product link" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

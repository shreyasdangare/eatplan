import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabaseServer";

const REQUIRED_COLUMNS = ["name", "ingredients"];

type ImportRow = {
  name?: string;
  description?: string;
  meal_type?: string;
  prep_time_minutes?: number;
  tags?: string;
  ingredients?: string;
};

function cellToValue(v: unknown): string | number {
  if (v == null) return "";
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "richText" in v) {
    const rt = (v as { richText?: Array<{ text: string }> }).richText;
    return Array.isArray(rt) ? rt.map((t) => t.text).join("") : String(v);
  }
  return String(v);
}

/** Build array of row objects from first worksheet using row 1 as headers */
function sheetToJson(ws: ExcelJS.Worksheet): Record<string, unknown>[] {
  const rowCount = ws.actualRowCount ?? 0;
  if (rowCount < 2) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  const numCols = ws.actualColumnCount ?? 0;
  for (let c = 1; c <= numCols; c++) {
    const val = headerRow.getCell(c).value;
    headers.push(val != null ? String(val).trim() : "");
  }

  const data: Record<string, unknown>[] = [];
  for (let r = 2; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      const v = row.getCell(i + 1).value;
      obj[h] = cellToValue(v);
    });
    data.push(obj);
  }
  return data;
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function parseTags(tags: unknown): string[] | null {
  if (tags === null || tags === undefined || tags === "") return null;
  const s = String(tags).trim();
  if (!s) return null;
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function parseIngredients(ingredients: unknown): string[] {
  if (ingredients === null || ingredients === undefined || ingredients === "")
    return [];
  return String(ingredients)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mealTypeValue(val: unknown): string | null {
  const s = String(val ?? "").trim().toLowerCase();
  if (s === "lunch" || s === "dinner" || s === "both") return s;
  return null;
}

async function getOrCreateIngredientId(
  name: string,
  nameToId: Map<string, string>
): Promise<string> {
  const key = name.trim().toLowerCase();
  const existing = nameToId.get(key);
  if (existing) return existing;

  const { data, error } = await supabaseServer
    .from("ingredients")
    .insert({ name: name.trim() })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create ingredient "${name}": ${error?.message ?? "unknown"}`);
  }
  nameToId.set(key, data.id);
  return data.id;
}

export async function POST(req: NextRequest) {
  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (!f || !(f instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Use form field 'file'." },
        { status: 400 }
      );
    }
    file = f;
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Only .xlsx files are supported." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let wb: ExcelJS.Workbook;
  try {
    wb = new ExcelJS.Workbook();
    // ExcelJS accepts ArrayBuffer at runtime; types conflict with Node's Buffer
    await wb.xlsx.load(arrayBuffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  } catch {
    return NextResponse.json(
      { error: "Could not read Excel file. Ensure it is a valid .xlsx file." },
      { status: 400 }
    );
  }

  const ws = wb.worksheets[0];
  if (!ws) {
    return NextResponse.json(
      { error: "Excel file has no sheets." },
      { status: 400 }
    );
  }
  const data = sheetToJson(ws);

  if (!data.length) {
    return NextResponse.json(
      { error: "No data rows in the sheet." },
      { status: 400 }
    );
  }

  const headers = Object.keys(data[0] ?? {}).map((h) => String(h).trim().toLowerCase());
  const requiredLower = REQUIRED_COLUMNS.map((c) => c.toLowerCase());
  for (const col of requiredLower) {
    if (!headers.includes(col)) {
      return NextResponse.json(
        { error: `Missing required column: ${col}. Required columns: ${REQUIRED_COLUMNS.join(", ")}.` },
        { status: 400 }
      );
    }
  }

  // Normalize keys to lowercase for lookup
  const rows: ImportRow[] = data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.trim().toLowerCase()] = v;
    }
    return out as ImportRow;
  });

  const { data: existingIngredients } = await supabaseServer
    .from("ingredients")
    .select("id, name");
  const nameToId = new Map<string, string>();
  for (const ing of existingIngredients ?? []) {
    nameToId.set(String(ing.name).trim().toLowerCase(), ing.id);
  }

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = row.name ?? "";
    const nameStr = String(nameVal).trim();
    if (!nameStr) {
      errors.push(`Row ${i + 2}: missing recipe name (skipped).`);
      continue;
    }

    const { data: existingByName } = await supabaseServer
      .from("dishes")
      .select("id")
      .ilike("name", nameStr)
      .limit(1)
      .maybeSingle();

    let dishIdToUse: string;

    if (existingByName) {
      await supabaseServer
        .from("dishes")
        .update({
          name: nameStr,
          description: String(row.description ?? "").trim() || null,
          meal_type: mealTypeValue(row.meal_type),
          prep_time_minutes: parseNumber(row.prep_time_minutes),
          tags: parseTags(row.tags)
        })
        .eq("id", existingByName.id);
      dishIdToUse = existingByName.id;
      updated += 1;
    } else {
      const { data: newDish, error: insertErr } = await supabaseServer
        .from("dishes")
        .insert({
          name: nameStr,
          description: String(row.description ?? "").trim() || null,
          meal_type: mealTypeValue(row.meal_type),
          prep_time_minutes: parseNumber(row.prep_time_minutes),
          tags: parseTags(row.tags)
        })
        .select("id")
        .single();
      if (insertErr || !newDish) {
        errors.push(`Row ${i + 2}: failed to create dish: ${insertErr?.message ?? "unknown"}`);
        continue;
      }
      dishIdToUse = newDish.id;
      imported += 1;
    }

    const ingredientNames = parseIngredients(row.ingredients);
    if (ingredientNames.length === 0) {
      await supabaseServer.from("dish_ingredients").delete().eq("dish_id", dishIdToUse);
      continue;
    }

    try {
      const ingredientIds = await Promise.all(
        ingredientNames.map((n) => getOrCreateIngredientId(n, nameToId))
      );
      await supabaseServer.from("dish_ingredients").delete().eq("dish_id", dishIdToUse);
      const insertRows = ingredientIds.map((ingredient_id) => ({
        dish_id: dishIdToUse,
        ingredient_id,
        quantity: null,
        amount: null,
        unit: null,
        is_optional: false
      }));
      const { error: diError } = await supabaseServer
        .from("dish_ingredients")
        .insert(insertRows);
      if (diError) {
        errors.push(`Row ${i + 2}: failed to save ingredients: ${diError.message}`);
      }
    } catch (e) {
      errors.push(
        `Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return NextResponse.json({
    imported,
    updated,
    ...(errors.length > 0 && { errors })
  });
}

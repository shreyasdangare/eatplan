import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

const COLUMNS = [
  "name",
  "description",
  "meal_type",
  "prep_time_minutes",
  "tags",
  "ingredients"
] as const;

const MEAL_TYPE_OPTIONS = '"lunch,dinner,both"';

type DishRow = {
  name: string;
  description: string | null;
  meal_type: string | null;
  prep_time_minutes: number | null;
  tags: string[] | null;
  dish_ingredients?: Array<{
    ingredients?: { name: string } | null;
  }> | null;
};

function toExportRow(dish: DishRow): Record<string, string | number | null> {
  const ingredientNames = (dish.dish_ingredients ?? [])
    .map((di) => di.ingredients?.name)
    .filter(Boolean) as string[];
  return {
    name: dish.name,
    description: dish.description ?? "",
    meal_type: dish.meal_type ?? "",
    prep_time_minutes: dish.prep_time_minutes ?? "",
    tags: Array.isArray(dish.tags) ? dish.tags.join(", ") : "",
    ingredients: ingredientNames.join(", ")
  };
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select(
      "id, name, description, meal_type, prep_time_minutes, tags, dish_ingredients(ingredients(name))"
    )
    .eq("user_id", auth.user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching dishes for export", error);
    return NextResponse.json(
      { error: "Failed to export recipes" },
      { status: 500 }
    );
  }

  const rows = (dishes ?? []).map((d) => toExportRow(d as unknown as DishRow));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Recipes", { headerFooter: { firstHeader: "" } });

  ws.columns = COLUMNS.map((key, i) => ({
    header: key,
    key,
    width: key === "ingredients" ? 40 : key === "description" ? 30 : 18
  }));

  for (const row of rows) {
    ws.addRow(row);
  }

  // Apply dropdown (selector) to meal_type column for all data rows
  const mealTypeCol = COLUMNS.indexOf("meal_type") + 1; // 1-based column
  const mealTypeLetter = String.fromCharCode(64 + mealTypeCol); // A=1, B=2, C=3
  for (let r = 2; r <= rows.length + 1; r++) {
    const cell = ws.getCell(`${mealTypeLetter}${r}`);
    cell.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [MEAL_TYPE_OPTIONS],
      showErrorMessage: true,
      errorTitle: "Invalid meal type",
      error: "Choose lunch, dinner, or both."
    };
  }

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="recipes.xlsx"'
    }
  });
}

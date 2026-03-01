/**
 * Category-to-emoji mapping for shopping list tiles (Bring!-style).
 * Used when category is set on ingredient or shopping list item.
 */

const CATEGORY_EMOJI: Record<string, string> = {
  "Fruits & Vegetables": "🥬",
  "Fruits and Vegetables": "🥬",
  "Fruit": "🍎",
  "Vegetables": "🥕",
  "Dairy": "🥛",
  "Dairy & Eggs": "🥛",
  "Meat & Fish": "🥩",
  "Meat": "🥩",
  "Fish": "🐟",
  "Seafood": "🦐",
  "Bakery": "🍞",
  "Bread & Pastries": "🍞",
  "Pantry Staples": "🫒",
  "Pantry": "🫒",
  "Drinks": "🥤",
  "Beverages": "🥤",
  "Snacks": "🍿",
  "Frozen": "🧊",
  "Household": "🧴",
  "Other": "🛒",
};

const DEFAULT_EMOJI = "🛒";

/** Returns emoji for a category string (e.g. "Dairy" -> "🥛"). Case-insensitive. */
export function getCategoryEmoji(category: string | null | undefined): string {
  if (!category || !category.trim()) return DEFAULT_EMOJI;
  const normalized = category.trim();
  return (
    CATEGORY_EMOJI[normalized] ??
    CATEGORY_EMOJI[normalized.toLowerCase()] ??
    DEFAULT_EMOJI
  );
}

/** Display name for category (passthrough; can normalize later). */
export function getCategoryDisplayName(
  category: string | null | undefined
): string {
  if (!category || !category.trim()) return "Other";
  return category.trim();
}

/** Categories used in the category browser (order and display). */
export const SHOPPING_CATEGORIES = [
  "Fruits & Vegetables",
  "Dairy",
  "Meat & Fish",
  "Bakery",
  "Pantry Staples",
  "Drinks",
  "Snacks",
  "Household",
  "Other",
] as const;

/** Infer a category from ingredient name when DB category is null (for display/emoji only). */
export function inferCategoryFromName(name: string): string | null {
  const lower = name.toLowerCase();
  if (
    /apple|banana|orange|berry|fruit|grape|mango|melon|peach|pear|tomato|avocado|lemon|lime|cherry|strawberry|blueberry|raspberry|blackberry|kiwi|plum|fig|coconut|pineapple|watermelon|grapefruit|cranberry/.test(
      lower
    )
  )
    return "Fruits & Vegetables";
  if (
    /potato|onion|garlic|carrot|broccoli|spinach|lettuce|celery|cabbage|pepper|cucumber|zucchini|squash|mushroom|bean|pea|lentil|corn|beet|radish|kale|chard|asparagus|eggplant|aubergine/.test(
      lower
    )
  )
    return "Fruits & Vegetables";
  if (
    /milk|cheese|yogurt|cream|butter|egg/.test(lower)
  )
    return "Dairy";
  if (
    /beef|chicken|pork|lamb|turkey|meat|bacon|sausage|mince/.test(lower)
  )
    return "Meat & Fish";
  if (
    /fish|salmon|tuna|shrimp|prawn|crab|cod|tilapia|seafood/.test(lower)
  )
    return "Meat & Fish";
  if (
    /bread|roll|bagel|croissant|pastry|flour|dough/.test(lower)
  )
    return "Bakery";
  if (
    /oil|vinegar|salt|sugar|rice|pasta|noodle|flour|cereal|oat|bean|chickpea|lentil|canned|sauce|stock|broth|spice|herb|honey|jam|nut|seed/.test(
      lower
    )
  )
    return "Pantry Staples";
  if (
    /juice|water|soda|coffee|tea|wine|beer|drink|beverage/.test(lower)
  )
    return "Drinks";
  if (
    /chocolate|candy|chip|cookie|cracker|popcorn|snack|nut/.test(lower)
  )
    return "Snacks";
  if (
    /soap|paper|cleaner|detergent|foil|bag|trash|household/.test(lower)
  )
    return "Household";
  return null;
}

/** Get emoji for an item: use category if set, else infer from name. */
export function getItemEmoji(
  category: string | null | undefined,
  name: string
): string {
  if (category?.trim()) return getCategoryEmoji(category);
  const inferred = inferCategoryFromName(name);
  return inferred ? getCategoryEmoji(inferred) : DEFAULT_EMOJI;
}

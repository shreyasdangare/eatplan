/** Local (not UTC) YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday of the week containing d (local time, 00:00). */
export function weekStartOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day + (day === 0 ? -6 : 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseISODate(s: string): Date {
  return new Date(s + "T12:00:00");
}

/** "Today", "Tomorrow" or "Wed 16". */
export function relativeDayLabel(iso: string, today = toISODate(new Date())): string {
  if (iso === today) return "Today";
  if (iso === toISODate(addDays(parseISODate(today), 1))) return "Tomorrow";
  return parseISODate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

/** Default meal slot for "now": breakfast before 11:00, lunch before 15:00, else dinner. */
export function currentSlot(now = new Date()): "breakfast" | "lunch" | "dinner" {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  return "dinner";
}

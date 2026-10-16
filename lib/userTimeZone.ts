import { cookies } from "next/headers";

/** The browser's IANA time zone (set as the `tz` cookie by the client); UTC if unknown/invalid. */
export async function getUserTimeZone(): Promise<string> {
  const raw = (await cookies()).get("tz")?.value;
  const tz = raw ? decodeURIComponent(raw) : undefined;
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

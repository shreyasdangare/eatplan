/**
 * Sanitise a user-supplied `next` redirect target so it can only point at a
 * same-origin path. Blocks open redirects such as `//evil.com`, `/\evil.com`,
 * `https://evil.com` or `@evil.com`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

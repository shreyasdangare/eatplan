// Post-deploy smoke check: node scripts/smoke.mjs https://<preview-url> [bypass-token]
// Verifies public pages render and protected APIs reject anonymous callers.
const base = process.argv[2];
const bypass = process.argv[3];
if (!base) { console.error("usage: node scripts/smoke.mjs <base-url> [vercel-bypass-token]"); process.exit(2); }
const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
const checks = [
  ["/login", (s) => s === 200],
  ["/signup", (s) => s === 200],
  ["/", (s) => s === 200 || (s >= 300 && s < 400)],
  ["/api/dishes", (s) => s === 401 || s === 403],
  ["/api/meal-plans", (s) => s === 401 || s === 403],
  ["/api/shopping-list", (s) => s === 401 || s === 403],
];
let failed = 0;
for (const [path, ok] of checks) {
  const res = await fetch(base + path, { headers, redirect: "manual" });
  const pass = ok(res.status);
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"} ${res.status} ${path}`);
}
process.exit(failed ? 1 : 0);

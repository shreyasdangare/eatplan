# EatPlan stack upgrade plan (Oct 2026)

Branch: `stack-upgrade-2026` · Baseline: `main` @ 5a60f05 (AI Gateway migration, PR #4)

## 1. Audit (baseline on main)

### Runtime
| Item | Found | Notes |
|---|---|---|
| Node | Vercel project `24.x`; no `engines`/`.nvmrc` in repo | `ai@7` / `@ai-sdk/*` require Node >= 22. Local Node 20 builds only with EBADENGINE warnings. |
| Next.js | 16.1.6 | **Critical** advisory affects `next <= 16.3.7`. Latest 16.4.1. |
| React | 18.3.1 + `@types/react` 18 | Next 16 App Router requires React 19. Mismatched. |
| TypeScript | 5.9.3, `strict`, `moduleResolution: bundler` | Config is fine. TS 7 (native) exists; not adopted yet. `tsconfig.tsbuildinfo` was committed. |
| ESLint | 9.39 + legacy `.eslintrc.json`; `lint` = `next lint` | **Broken**: `next lint` was removed in Next 16 (`lint` got read as a directory). |
| Tailwind | 3.4.19 (+ postcss/autoprefixer) | v4 is current (CSS-first config, new engine). Its tooling (chokidar/fast-glob/braces) makes up most of the remaining dev-only audit findings. |
| Supabase | `@supabase/ssr` 0.8 (latest 0.12.7), `supabase-js` 2.95 (latest 2.117) | Already on `@supabase/ssr` with `getAll/setAll` cookies. No `@supabase/auth-helpers-*` in the code or the lockfile. |
| AI SDK | `ai@^7.0.140` via AI Gateway (`lib/aiGateway.ts`) | Current. Uses `generateText` + `Output.json()`. |
| Tests | none | No `test` script. |

### npm outdated (main)
| Package | Current | Latest | Type |
|---|---|---|---|
| next / eslint-config-next | 16.1.6 | 16.4.1 | minor |
| react / react-dom | 18.3.1 | 19.3.1 | **major** |
| @types/react / -dom | 18.3.x | 19.3.0 | major |
| @supabase/supabase-js | 2.95.3 | 2.117.3 | minor |
| @supabase/ssr | 0.8.0 | 0.12.7 | major (0.x) |
| @vercel/speed-insights | 1.3.1 | 2.0.0 | major |
| lucide-react | 0.577.0 | 1.57.0 | major |
| tailwindcss | 3.4.19 | 4.3.3 | major |
| eslint | 9.39.2 | 10.12.0 | major |
| typescript | 5.9.3 | 7.0.2 | major |
| @types/node | 22.19 | 26.6 | major (should track the runtime, 24) |
| postcss / autoprefixer | 8.5.6 / 10.4.24 | 8.5.30 / 10.6.1 | patch/minor |
| @dnd-kit/*, cheerio, exceljs, next-themes, @vercel/analytics, ai | current | | |

### npm audit (main)
27 total (1 critical, 19 high, 6 moderate, 1 low). Production-only: 12 (1 critical `next`, high `ws`, moderate `uuid` via `exceljs`, plus others).

### Code / patterns
- **Open redirect**: `?next=` was used unsanitised in `proxy.ts` (`new URL(next, base)` accepts `//evil.com`), in `app/auth/callback/route.ts` (`${origin}${next}` accepts `@evil.com`), and in login/signup.
- `proxy.ts` calls `supabase.auth.signOut()` on every anonymous request. That is wasteful but harmless. Follow-up item.
- `app/api/import-recipe/route.ts`: `.filter(Boolean)` didn't narrow the type (the new supabase-js types catch this), and the `dish_ingredients` insert error is ignored.
- Lint debt once lint runs again: 24 `no-explicit-any`, 7 `react-hooks/set-state-in-effect`, 5 `preserve-manual-memoization`, unused vars, 3 unescaped entities.
- Async `params`/`cookies()` are already used correctly (Next 15+ style). The `middleware` → `proxy.ts` rename is already done.
- `app/api/dev-setup-user` is guarded by `NODE_ENV === "development"`. OK.

### Dead code
- **Todoist** (deprecated): no runtime code is left. Only historical migrations `005_todoist_pantry.sql` / `015_remove_todoist.sql` reference it. Nothing to remove.
- **Pantry** (on hold, keep): `app/pantry/page.tsx`, `app/api/pantry/route.ts`, plus references in `MobileNav`, `layout`, `page.tsx`, `what-can-i-cook`, `shopping-list`, `MissingIngredients`, `settings/household`, `api/shopping-list/populate`, `api/meal-plans/prepare`, and `proxy.ts` (protected path). Flagged only. If it stays on hold, consider a feature flag to hide the nav entry.

### Supabase advisors (prod project rndmugyfzbzdzjzxzphj, read-only)
Security:
- WARN `batch_reorder_shopping_list` is SECURITY DEFINER and executable by **anon** and **authenticated**, with a mutable `search_path`. Because it takes `p_household_id` from the caller and bypasses RLS, anyone with the anon key can reorder any household's list. The app only calls it through the service role.
- WARN Leaked password protection is disabled (Auth setting, dashboard only).
- INFO `llm_usage_log` has RLS enabled and no policies. That's fine if only the service role writes and reads it (it does).
Performance:
- 6 unindexed foreign keys (dishes.household_id, favorites.dish_id, llm_usage_log.household_id, meal_plans.dish_id, shopping_list_items.household_id/ingredient_id).
- 9 `auth_rls_initplan` policies (`auth.uid()` re-evaluated per row).
- 3 unused indexes. Multiple permissive SELECT policies on `household_members`.

## 2. Phased plan

Every phase follows the same gate: `npm run typecheck && npm run lint && npm test && npm run build`. One commit per phase, so each can be reverted alone. A Vercel preview smoke test runs after the branch is pushed.

| # | Phase | Risk | Status |
|---|---|---|---|
| 1 | React 19 + @types 19 | Med: runtime behaviour (ref callbacks, hydration warnings, removed legacy APIs). None of the legacy APIs are used. | ✅ done |
| 2 | Fix lint: flat `eslint.config.mjs`, `lint: eslint .`, fix errors, keep pre-existing debt as warnings | Low | ✅ done |
| 3 | Smoke tests: vitest unit tests for pure libs + `scripts/smoke.mjs` for deployed URLs | None | ✅ done |
| 4 | Minor/patch bumps (next 16.4.1, supabase-js, eslint 9.x, postcss, autoprefixer) + `npm audit fix` | Low–Med: Next minor. Fixes the critical advisory. | ✅ done |
| 5a | `@supabase/ssr` 0.12 | Med: auth cookies. Same `getAll/setAll` API. Verify login, refresh and logout on preview. | ✅ done |
| 5b | `@vercel/speed-insights` 2 | Low | ✅ done |
| 5c | `lucide-react` 1.x | Low: icon renames/removals would fail typecheck (it passed) | ✅ done |
| 6 | Security in code: `safeNextPath` for every `?next=` redirect; uuid override for exceljs; Node engines/.nvmrc 24/@types/node 24 | Low | ✅ done |
| 7 | DB migrations **written, not applied**: `020_lock_down_batch_reorder_rpc.sql`, `021_perf_fk_indexes_rls_initplan.sql` | Med: changes prod schema/policies. Apply to a Supabase **branch** first and run the smoke flows there. | ✍️ written |
| 8 | Supabase Auth: enable leaked password protection (dashboard → Auth → Passwords) | Low (needs Pro plan) | ⏳ manual |
| 9 | Tailwind 4 (`npx @tailwindcss/upgrade`, `@tailwindcss/postcss`, drop autoprefixer) | **High** visual risk. Needs screenshot review of every page in light and dark mode. Clears most of the remaining dev-only audit findings. | ⏳ next |
| 10 | ESLint 10 | Med: wait until `eslint-config-next` / plugins declare support | ⏳ blocked upstream |
| 11 | TypeScript 7 (native) | Med: tooling/plugin compatibility. Next's TS plugin. | ⏳ later |
| 12 | Lint debt: remove `any`, refactor setState-in-effect, then turn the rules back to `error`. Consider enabling the React Compiler. | Low–Med, touches many components | ⏳ later |
| 13 | Cleanup: proxy `signOut()` on anon requests; check the `dish_ingredients` insert error in import-recipe; pantry feature flag | Low | ⏳ later |

### Testing per phase
- Static: typecheck, lint, vitest, production build (with placeholder env).
- Preview (signed in as test user): home, dishes list and detail, meal plans, shopping list (including drag reorder), recipe import by dish name (AI Gateway), ingredient translation, logout/login.
- DB phases: apply to a Supabase dev branch. Re-run `get_advisors`. Call the RPC as anon and expect `permission denied`. Run the reorder flow through the app.

### Rollback
Every phase is its own commit, so revert that commit. The migrations include rollback notes. Nothing reaches production until the PR is merged by hand.

## Phase 2 status (branch `stack-upgrade-2026-phase2`)
- **Tailwind 4**: done with `@tailwindcss/upgrade` (adds `@tailwindcss/postcss`, removes autoprefixer and `tailwind.config.mjs`, uses `@custom-variant dark` for next-themes). The tool turned `.dark ::-webkit-scrollbar-thumb` into a `@utility dark`; I changed it back to a plain selector by hand. Typecheck, lint, tests and build all pass.
  - Visual diff (390px viewport, prod Tailwind 3 vs preview Tailwind 4, light and dark): login, home and settings are nearly identical (<0.4% of pixels differ). Recipes, dish detail, plan and shopping list show small shifts of a few pixels in vertical spacing and shadows, most likely from v4's `space-y-*` selector and shadow/ring scale changes. Side-by-sides are in `docs/tailwind4-review/` (left = prod, right = TW4).
  - Pages that still need a manual look: /recipes, /dishes/[id] (plus edit, new, cook), /plan, /shopping-list, /pantry, /what-can-i-cook, /admin, /settings/household, /settings/feedback.
- **ESLint 10**: blocked. `eslint-plugin-react` (pulled in by `eslint-config-next`) only declares support up to ESLint 9.
- **TypeScript 7**: blocked. `typescript-eslint` requires `typescript <6.1`.

# EatPlan mobile UI plan (audit 2026-10-15)

**How the audit was done:** production https://eatplan.app, signed in as test@eatplan.com. Playwright (mobile emulation, touch on) at 360×780, 390×844 and 430×932 in light and dark mode, plus 844×390 landscape. 16 pages: login, signup, home, recipes, dish, cook, edit, new (manual), import (magic), plan, shopping list, pantry, what-can-i-cook, settings, household, feedback. Each page was checked for tap targets under 44px, text under 12px, horizontal overflow, axe WCAG 2 A/AA violations, input attributes, and fixed/sticky elements. On top of that: touch-drag tests via CDP touch events, the plan and shopping sheets, and Lighthouse mobile on 4 pages. Annotated screenshots are in `/workspace/mobile-audit/` on the agent box.

## What's already good
- There's a **bottom tab bar** on mobile (`MobileNav`, `sm:hidden`): Recipes, Planner, List, Pantry, Cook. Primary navigation is in thumb reach. It already pads for `env(safe-area-inset-bottom)`.
- **No horizontal overflow** on any page at any width tested (360/390/430/landscape).
- **Viewport meta** is correct: `width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover`. Zoom isn't blocked. `theme-color` is set.
- Inputs use 16px, so iOS doesn't zoom on focus. Login and signup use `type=email`, `autocomplete=email/current-password/new-password/name`.
- The plan "Add Breakfast/Lunch/Dinner" buttons are 46px tall. The recipe picker is a proper bottom sheet on mobile, with safe-area bottom padding.
- A manifest exists (standalone, theme color, 512px icon), plus an apple-touch-icon and an install prompt component.
- Lighthouse mobile performance is good on the lighter pages: login 91, shopping 96, plan 86.

## Findings, ranked by impact

| # | Issue | Where | Impact |
|---|---|---|---|
| 1 | **Shopping-list drag-to-reorder doesn't work by touch.** dnd-kit uses `PointerSensor` only, and tiles have `touch-action: auto`, so the browser claims the gesture. In emulated touch drags (sideways and down), the order never changed. `/plan` already uses `TouchSensor` plus a `touch-none` handle. | `app/shopping-list/page.tsx` | High: a core feature unusable on phones |
| 2 | **Bottom nav sits on top of bottom sheets.** The item-detail sheet (quantity/priority/notes) is covered by the nav bar (nav `z-100` > sheet), hiding its lower actions. | `ShoppingItemDetail.tsx`, `MobileNav.tsx` | High: blocks completing an action |
| 3 | **Undersized tap targets everywhere.** About 600 elements under 44px across 16 pages per width. Worst: favorite heart 22×18 and Delete 64×26 on dish detail; shopping tile edit "ⓘ" 28×28; Home/Meal plan/Copy chips 56–74×24; priority chips 28px; "Add a meal →" 90×17 on home; ingredient chips 30px tall (~240 on edit/new); servings slider 8px tall; 1×1 file input. | dish, shopping, home, edit/new | High: mis-taps, accessibility |
| 4 | **Colour contrast.** About 60–70 axe `color-contrast` failures per width, in both themes. Dark `/plan` alone has 29 (stone-500 on stone-900 meta text, amber on amber chips). Placeholder and "Optional" labels fail too. | all pages | Medium–high: readability outdoors and in dark mode |
| 5 | **Tiny text.** Bottom-nav labels are 10px and "Coming soon" is 7px. Shopping section headings and "Add a meal →" are 11px. | MobileNav, shopping, home | Medium |
| 6 | **Recipe images are heavy.** `<img>` loads 960px Wikipedia originals (≈2.3 MB on `/recipes`) with no `next/image`, `srcset` or lazy loading. Lighthouse mobile on `/recipes`: perf 76, LCP 5.4 s. | `DishesListWithFilter.tsx`, dish page | Medium: slow on mobile data |
| 7 | **Not a real PWA offline-wise.** No service worker, so no offline shell. The shopping list is useless without signal in a supermarket. The manifest reuses `/icon` for both 192 and 512, has no `maskable` icon, no `id`/`scope`, and no screenshots. Chrome's install bar will still show, but the experience is poor. | `app/manifest.ts` | Medium |
| 8 | **Safe-area top missing.** `viewport-fit=cover` is on, but the sticky header (`top-2`) and the install prompt (`top-4`) don't use `env(safe-area-inset-top)`. In iOS standalone the header slides under the status bar or notch. | `app/layout.tsx`, `InstallPrompt.tsx` | Medium (installed iOS users) |
| 9 | **Semantics hurting touch and screen readers.** `nested-interactive` ×18 (buttons inside the sortable tile wrapper `role=button`); `button-name` ×2 on settings; `select-name` on edit/new; an unlabelled input on import; `listitem` outside a list in the nav. | shopping, settings, edit, import | Medium |
| 10 | **Keyboard hints missing on forms.** The shopping "Search or add item" input has no `enterkeyhint="done"/"go"`, `autocomplete="off"` or `autocapitalize`. Prep time/servings use `type=number` (OK) but no `inputmode="numeric"`. The recipe URL field should be `type=url`/`inputmode=url`. | shopping, edit/new, import | Low–medium |
| 11 | **Header and back button overlap** on dish detail: the round back button sits on top of the logo. The sticky header plus a second sticky filter panel (`top-24`, 220px tall on `/recipes`) take about 40% of a 780px-tall screen when scrolled. | dish, recipes | Low–medium |
| 12 | Hover-only affordances: drag handles and `group-hover` reveals have no touch equivalent. (Tailwind 4 already stops hover from sticking after a tap.) | various | Low |

Landscape (844×390): the desktop top nav is used (≥640px), nothing overflows, and sticky headers eat about a third of the height on `/plan`. Acceptable.

## Phased work

### Phase 1: quick wins (≈1–1.5 days)
1. Shopping touch drag: add `TouchSensor` (`delay: 200, tolerance: 6`), as `/plan` does, plus `KeyboardSensor`. Add `touch-action: none` on a drag handle (or long-press anywhere on the tile) so scrolling still works.
2. Sheets above the nav: raise sheet/backdrop z-index above `MobileNav` (or hide the nav while a sheet is open). Pad sheet footers with `env(safe-area-inset-bottom)`.
3. Tap targets: add a shared `.tap` utility (`min-h-11 min-w-11` with an invisible hit-area pseudo-element) and apply it to the favorite heart, Delete, ⓘ, chips, priority pills, the servings slider thumb and "Add a meal". Ingredient chips go to 40–44px with 8px gaps.
4. Text: nav labels to 11–12px, drop the 7px "Coming soon" badge text (use a dot), section headings 12px.
5. Form hints: `enterkeyhint`, `inputmode`, `autocomplete="off"` on search/add, `type=url` for the import URL, labels for unlabelled inputs/selects.
6. Safe-area top on the sticky header and install prompt.
- **Test:** re-run the audit script (tap-target, small-text and axe counts must drop; no new overflow) at 360/390/430 in light and dark. Touch-drag test on shopping (order changes, page still scrolls with a normal swipe). Manual check on a real iPhone (Safari and installed PWA) and an Android Chrome.

### Phase 2: structural (≈3–5 days)
1. Navigation pattern: keep the bottom tab bar, but make it the one source of truth. Move the shopping "Home / Meal plan / Copy" chips into a segmented control or overflow menu. Collapse the sticky filter panel on `/recipes` into a compact search bar plus a "Filters" bottom sheet, and auto-hide the header on scroll-down. Fix the dish header/back-button overlap with a dedicated mobile page header (back, title, actions).
2. One `<BottomSheet>` primitive (focus trap, `aria-modal`, swipe-to-close, safe-area padding, sits above the nav). Migrate the plan picker, shopping item detail and any confirm dialogs to it.
3. Contrast pass on design tokens: raise stone-400/500 meta text to stone-600 (light) and stone-300/400 (dark), and fix amber-on-amber chips. Target 0 axe `color-contrast` failures.
4. Fix the semantics: no interactive elements nested inside the sortable wrapper (separate drag handle + button), names on icon buttons, lists for the nav.
- **Test:** audit script + axe = 0 serious/critical. Lighthouse a11y ≥ 95 on all key pages. VoiceOver/TalkBack spot-check of shopping and plan. Visual diff against current screenshots for unintended changes.

### Phase 3: PWA and performance (≈2–4 days)
1. Images: switch to `next/image` (remote pattern for upload.wikimedia.org and the Supabase storage bucket), with `sizes`, lazy loading below the fold, AVIF/WebP. Or store resized thumbnails in `dish-images` at import time.
   - Target `/recipes` LCP < 2.5 s and Lighthouse perf ≥ 90.
2. Offline: a service worker (e.g. Serwist) that caches the app shell and the last shopping list and meal plan. Queue shopping "bought" toggles offline and sync when back online. Show an offline banner.
3. Manifest: real 192/512 PNGs plus a `maskable` icon, `id`, `scope`, `screenshots`, `shortcuts` (Shopping list, Plan today). Optional iOS splash images.
- **Test:** Lighthouse mobile (perf/a11y/best-practices/PWA installability) in CI on the preview URL. Airplane-mode test of the shopping list on a real device. Check the install flow on Android and iOS.

### Phase 4: nice-to-haves (backlog)
- Haptic feedback (`navigator.vibrate`) on reorder/check-off. Pull-to-refresh on the list and plan.
- Swipe actions on shopping tiles (swipe to mark bought, long-press for details).
- Landscape/tablet two-column layouts for plan and recipes.
- `prefers-reduced-motion` handling for the scale/blur animations.
- Wake lock on the cook view.

## Measurements to track (baseline from this audit)
| Metric (per width, light) | 360 | 390 | 430 |
|---|---|---|---|
| Tap targets < 44px (16 pages) | 602 | 608 | 612 |
| axe color-contrast nodes (light / dark) | 68 / 67 | 62 / 65 | 69 / 72 |
| Pages with horizontal overflow | 0 | 0 | 0 |

| Lighthouse mobile | Perf | A11y | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| /login | 91 | 86 | 100 | 100 | 2.0 s |
| /recipes | 76 | 91 | 77 | 100 | 5.4 s |
| /plan | 86 | 89 | 100 | 100 | 3.0 s |
| /shopping-list | 96 | 85 | 100 | 100 | 2.2 s |

Caveat: touch-drag and safe-area results come from Chromium emulation. Confirm them on real iOS and Android devices in Phase 1 testing.

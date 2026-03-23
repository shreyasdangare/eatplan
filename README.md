# EatPlan

**Live:** [https://eatplan.app/](https://eatplan.app/)

*काय खायचं?* (What to eat?) — Plan meals, manage recipes, build shopping lists, and cook with what you have. Installable as a **PWA** on Android and iOS.

---

## Features

- **Recipes** — Add dishes with ingredients, photos, servings, and tags. Filter by tag or favorites. Import from URL, screenshot, or YouTube (Gemini).
- **This week** — Drag recipes onto breakfast, lunch, and dinner for each day.
- **Shopping list** — Pick recipes and get one combined grocery list.
- **Pantry** — Ingredients you always have; used when searching “What can I cook?”.
- **What can I cook?** — Enter what you have; see matching recipes.
- **Auth** — Email sign-up/sign-in via Supabase. Multi-user: each user has their own recipes, plans, and list.

---

## Tech stack

| Layer        | Choice |
|-------------|--------|
| Framework   | Next.js 16 (App Router, TypeScript) |
| UI         | React 18, Tailwind CSS, mobile-first layout |
| Backend    | Next.js Route Handlers under `app/api` |
| Database   | Supabase (Postgres) — dishes, ingredients, meal plans, pantry, auth |
| Optional   | Google AI (Gemini) for recipe import; Spoonacular for auto dish images |

---

## Project structure

```
├── app/
│   ├── api/              # Route Handlers (recipes, dishes, meal-plans, pantry, auth, etc.)
│   ├── components/       # Shared UI (HeaderTitle, AuthLinks, InstallPrompt, …)
│   ├── dishes/           # Recipe CRUD, edit, cook view, image upload
│   ├── plan/             # Weekly meal plan (drag-and-drop)
│   ├── recipes/          # Recipe list and filters
│   ├── shopping-list/    # Combined grocery list
│   ├── pantry/           # “Always have” ingredients
│   ├── what-can-i-cook/  # Match ingredients → recipes
│   ├── login/, signup/   # Auth pages
│   ├── layout.tsx        # Root layout, nav, PWA meta
│   ├── manifest.ts       # PWA web app manifest
│   └── icon.tsx, apple-icon.tsx  # PWA icons
├── lib/
│   ├── supabaseServer.ts     # Server-only Supabase (service role)
│   ├── supabaseServerClient.ts
│   ├── supabaseBrowser.ts    # Client Supabase (anon key)
│   └── ingredientMatch.ts
├── db/
│   ├── schema.sql        # Base tables (dishes, ingredients, meal_plans, pantry, …)
│   └── migrations/       # Numbered migrations (multi-user, shopping list, etc.)
├── scripts/              # Utilities (e.g. delete-user-by-email)
├── docs/                  # Email templates, multi-user setup
├── DEPLOYMENT.md          # Full deployment and env configuration
└── public/                # Static assets, PWA
```

---

## Development

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

### Environment variables

Create `.env.local` in the project root (see [DEPLOYMENT.md](DEPLOYMENT.md) for full details):

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (multi-user) | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (multi-user) | Supabase anon key (client auth) |
| `GOOGLE_GEMINI_API_KEY` | For recipe import | Google AI Studio key (URL/screenshot/YouTube import) |
| `SPOONACULAR_API_KEY` | Optional | Auto dish image when importing recipe |
| `NEXT_PUBLIC_APP_URL` | Optional (production) | Canonical app URL (e.g. `https://eatplan.app`) so favicon and PWA icons load the logo correctly |

`.env.local` is gitignored; do not commit secrets.

### Scripts

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint
npm run delete-user  # Delete user by email (uses .env.local; see scripts/)
```

### Local run

1. Clone the repo and `npm install`.
2. Create a Supabase project, run `db/schema.sql` (and any migrations in `db/migrations/` if you have an existing DB).
3. In Supabase Storage, create a **public** bucket named `dish-images`.
4. Set the variables above in `.env.local`.
5. Run `npm run dev` and open `http://localhost:3000`.

For **multi-user (email auth)** see [docs/MULTI_USER_SETUP.md](docs/MULTI_USER_SETUP.md).

---

## Database

- **Schema:** [db/schema.sql](db/schema.sql) — base tables for dishes, ingredients, dish_ingredients, meal_plans, pantry.
- **Migrations:** [db/migrations/](db/migrations/) — apply in order when upgrading an existing DB (e.g. multi-user, favorites, shopping list).

---

## Deployment

The app is built for **Vercel** and **Supabase**:

1. **Supabase** — Create project, run schema + migrations, create `dish-images` bucket, configure Auth (e.g. Email provider for multi-user).
2. **Vercel** — Import repo, set environment variables (same as above), deploy. Custom domain (e.g. eatplan.app) can be added in Vercel.

Full steps, API key restrictions, and optional integrations (Gemini, Spoonacular) are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Documentation

| Doc | Purpose |
|-----|--------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting, env vars, Supabase, Vercel, Gemini |
| [docs/MULTI_USER_SETUP.md](docs/MULTI_USER_SETUP.md) | Email auth and multi-user setup |
| [docs/email-templates/](docs/email-templates/) | Email copy (e.g. confirm signup) |

---

## License

Private project.

## Deployment & hosting

This app is designed for **Next.js on Vercel** with a **Supabase Postgres** database.

### 1. Create Supabase project

- Go to the Supabase dashboard and create a new project.
- In the SQL editor, run the statements from `db/schema.sql` to create tables. If you already have an existing database, run the scripts in `db/migrations/` to add new columns and tables.
- For dish photos: in **Storage**, create a **public** bucket named `dish-images` (no extra settings required).

### 2. Configure API keys

In Supabase **Project Settings → API**:

- Copy the **Project URL** and **service role key**.
- In Vercel (or your local `.env.local`), set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The server-only Supabase client in `lib/supabaseServer.ts` uses these values.

### 3. Deploy to Vercel

1. Push this project to a Git repository (GitHub, GitLab, etc.).
2. In the Vercel dashboard, import the repo as a new project.
3. During setup:
   - Framework preset: **Next.js**
   - Root directory: repository root (where `package.json` lives)
   - Environment variables: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Optional: `OPENAI_API_KEY` for the "Import from URL" feature; `TODOIST_CLIENT_ID` and `TODOIST_CLIENT_SECRET` for Todoist (Shopping list sync).
4. Click **Deploy**. Vercel will run `npm install` and `npm run build` automatically.

### 4. Running locally

Create a `.env.local` file in the project root:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` on desktop or phone (same Wi‑Fi) to use the app.

### 5. Todoist integration (optional)

To enable "Sign in with Todoist" and syncing checked-off Todoist tasks into the pantry:

1. Create an app at [Todoist App Management Console](https://developer.todoist.com/appconsole.html).
2. Set the OAuth redirect URL to `https://your-domain.com/api/auth/todoist/callback` (or `http://localhost:3000/api/auth/todoist/callback` for local dev).
3. Add to `.env.local` (and Vercel env):
   - `TODOIST_CLIENT_ID` – from the Todoist app
   - `TODOIST_CLIENT_SECRET` – from the Todoist app
4. Run the migration `db/migrations/005_todoist_pantry.sql` if you have an existing DB (schema.sql already includes these tables for new installs).
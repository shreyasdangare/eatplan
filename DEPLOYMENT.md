## Deployment & hosting

This app is designed for **Next.js on Vercel** with a **Supabase Postgres** database.

### 1. Create Supabase project

- Go to the Supabase dashboard and create a new project.
- In the SQL editor, run the statements from `db/schema.sql` to create:
  - `dishes`
  - `ingredients`
  - `dish_ingredients`

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
   - Environment variables: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
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


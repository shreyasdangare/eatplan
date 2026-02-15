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

#### Recipe import (Import from URL)

The app uses **Google AI Studio (Gemini)** by default for extracting recipes from URLs. Set your API key in the server environment so all users can use the feature without entering a key.

**Where to save the API key**

1. **Local development**  
   In the project root, create or edit `.env.local` and add:
   ```bash
   GOOGLE_GEMINI_API_KEY=your_google_ai_studio_api_key
   ```
   Do not commit `.env.local` to git (it should be in `.gitignore`).

2. **Production (e.g. Vercel)**  
   In the Vercel dashboard: **Project → Settings → Environment Variables**. Add:
   - **Name:** `GOOGLE_GEMINI_API_KEY`  
   - **Value:** your Google AI Studio API key  
   - **Environment:** Production (and optionally Preview / Development if you use them).  
   Redeploy after adding or changing variables.

If `GOOGLE_GEMINI_API_KEY` is not set, the app will fall back to `OPENAI_API_KEY` for recipe import (if set). At least one of them must be set for "Import from URL" to work.

#### Restricting your Google AI Studio API key

To reduce risk of abuse and control costs, restrict the key in Google AI Studio or Google Cloud Console.

**Option A – Restrict in Google AI Studio (API key created in AI Studio)**

1. Go to [Google AI Studio](https://aistudio.google.com) and sign in.
2. Open **Get API key** (left sidebar or [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
3. Find your API key and click the **pencil/edit** icon (or the key name).
4. Under **API restrictions**:
   - Choose **Restrict key**.
   - In “API key restrictions”, select only **Generative Language API** (or the specific Gemini APIs you use). Do not leave the key unrestricted.
5. Under **Application restrictions** (optional but recommended):
   - **HTTP referrers**: If your app runs in the browser and calls Gemini from the client, list your domains (e.g. `https://yourdomain.com/*`, `http://localhost:3000/*`).  
   - **IP addresses**: For a server-only app (like this one), choose **IP addresses** and add the IPs of your hosting provider (e.g. Vercel’s outbound IPs if you use Vercel). This limits use to requests from your server.  
   - **None**: Only for quick testing; not recommended for production.
6. Save. Changes can take a few minutes to apply.

**Option B – Restrict in Google Cloud Console (API key linked to a GCP project)**

1. Go to [Google Cloud Console](https://console.cloud.google.com) and select the project that owns the key.
2. Open **APIs & Services → Credentials**.
3. Click the API key you use for Gemini (e.g. “Google AI Studio” or the key name).
4. **Application restrictions**:
   - **HTTP referrers**: For browser-only usage, add your website URLs.
   - **IP addresses**: For server-only usage (recommended for this app), add the outbound IPs of your host (e.g. Vercel). You can find these in your host’s docs or by running a request from your app and checking the IP in your host’s dashboard or logs.
   - **Android / iOS**: Leave unused for a web/server app.
5. **API restrictions**:
   - Select **Restrict key**.
   - In the list, enable only **Generative Language API** (and any other APIs this key must use). Leave all others disabled.
6. Click **Save**. Restrictions apply within a few minutes.

**Setting usage quotas (rate limits / daily caps)**

- In **Google Cloud Console** for the same project: **APIs & Services → Dashboard** (or **Library** → Generative Language API → **Manage**). Use the **Quotas** tab to set request limits or get alerts.
- In **Google AI Studio**, check the usage/quota section for free-tier or pay-as-you-go limits.

Keeping the key in server-side environment variables (e.g. `GOOGLE_GEMINI_API_KEY`) and restricting it by **IP** (and **API**) ensures only your app’s server can use it and helps control usage.

### 3. Deploy to Vercel

1. Push this project to a Git repository (GitHub, GitLab, etc.).
2. In the Vercel dashboard, import the repo as a new project.
3. During setup:
   - Framework preset: **Next.js**
   - Root directory: repository root (where `package.json` lives)
   - Environment variables: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. For "Import from URL" set `GOOGLE_GEMINI_API_KEY` (recommended) or `OPENAI_API_KEY`. Optional: `TODOIST_CLIENT_ID` and `TODOIST_CLIENT_SECRET` for Todoist (Shopping list sync).
4. Click **Deploy**. Vercel will run `npm install` and `npm run build` automatically.

### 4. Running locally

Create a `.env.local` file in the project root:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_GEMINI_API_KEY=your_google_ai_studio_api_key
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
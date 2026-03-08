# Sending auth emails from your domain

By default, Supabase sends auth emails (confirm signup, reset password, etc.) from `noreply@mail.app.supabase.io`. To send from your own domain (e.g. `noreply@yourdomain.com`), use **custom SMTP** in Supabase and an email provider that lets you send from a verified domain.

## Family & friends: free with Resend

For a family-and-friends app you **do not need to pay**. Resend’s free tier includes **3,000 emails per month** (100 per day). Signup confirmations and password resets are only a few emails per user, so that’s enough for a small group. No credit card required. Detailed setup is below in **“Resend setup (step-by-step)”**.

---

## Cost implications

**Supabase** does not charge extra for using custom SMTP. You only pay your chosen email provider.

**Default Supabase email** (no custom SMTP) is free but limited: about 2 emails per hour and only to pre‑authorized addresses (e.g. team members). It’s for testing only, not production.

**With custom SMTP**, you pay the provider. Typical ballpark:

| Provider   | Free tier (approx.)     | Paid (approx.)              |
|-----------|-------------------------|------------------------------|
| **Resend**   | 3,000 emails/month (100/day) | From ~$20/mo for 50k emails  |
| **Brevo**    | 300 emails/day          | From ~$9–15/mo for higher volume |
| **SendGrid** | 100 emails/day for 60 days (trial) | From ~$20/mo after trial   |
| **AWS SES**  | 62,000/month when sent from EC2, or pay‑as‑you‑go | ~$0.10 per 1,000 emails |

Auth emails (signup confirmation, password reset, magic link) are usually a few per user per month. For a small app, a **free tier** (e.g. Resend’s 3,000/month or Brevo’s 300/day) is often enough. Check each provider’s current pricing and limits on their site.

## 1. Choose an email provider and verify your domain

Use a transactional email service that supports SMTP and allows sending from your domain. Examples:

- **[Resend](https://resend.com)** – simple setup, [Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp)
- [Brevo](https://brevo.com), [SendGrid](https://sendgrid.com), [Postmark](https://postmarkapp.com), [ZeptoMail](https://www.zoho.com/zeptomail/), [AWS SES](https://aws.amazon.com/ses/)

In the provider’s dashboard:

1. Add and **verify your domain** (DNS records: SPF, DKIM, sometimes DMARC). The provider will show which records to add.
2. Create an API key or SMTP credentials.
3. Note the **SMTP settings**: host, port (usually 587 or 465), username, password. The “From” address will be something like `noreply@yourdomain.com` (must use your verified domain).

## 2. Configure custom SMTP in Supabase

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project.
2. Go to **Authentication** → **SMTP** (or **Project Settings** → **Auth** → SMTP section).
3. Enable **Custom SMTP** and fill in:

   | Field | Example | Notes |
   |-------|--------|--------|
   | **Sender email** | `noreply@yourdomain.com` | Must be an address on your verified domain. |
   | **Sender name** | `काय खायचं?` or "EatPlan" | Shown as “From” name in inbox. |
   | **Host** | `smtp.resend.com` (Resend) | From your provider’s SMTP docs. |
   | **Port** | `587` (TLS) or `465` (SSL) | Use the value your provider gives. |
   | **Username** | Your SMTP user / API key | Often an API key for Resend/SendGrid. |
   | **Password** | Your SMTP password / API secret | As provided by the provider. |

4. Save. Supabase will use this for all auth emails (confirm signup, password reset, magic links, etc.).

## 3. Resend setup (step-by-step)

Follow these steps to use Resend for free with your domain. Replace `yourdomain.com` with your actual domain.

### Step 1: Create a Resend account

1. Go to [resend.com](https://resend.com) and click **Sign up**.
2. Sign up with email or Google. You do **not** need to add a credit card for the free tier (3,000 emails/month).

### Step 2: Add your domain in Resend

1. In the Resend dashboard, open **Domains** in the left sidebar.
2. Click **Add Domain**.
3. Enter your domain (e.g. `yourdomain.com` — no `www`, no `https://`). Click **Add**.
4. Resend will show a list of **DNS records** you must add. You’ll see something like:
   - **TXT** record (for verification)
   - **DKIM** record(s) — one or more **TXT** records with names like `resend._domainkey.yourdomain.com`
   - **SPF** or other TXT if shown

   Leave this tab open; you’ll copy each **Name** and **Value** into your DNS provider.

### Step 3: Add the DNS records at your domain provider

You add these records wherever your domain’s DNS is managed (e.g. Cloudflare, Namecheap, Google Domains, Vercel, your registrar).

1. Log in to your **DNS provider** and open the DNS / DNS records section for `yourdomain.com`.
2. For **each** record Resend shows:
   - Click **Add record** (or equivalent).
   - **Type:** choose the type Resend shows (usually **TXT** for verification and DKIM).
   - **Name / Host:** paste the name Resend gives. It might be something like `resend._domainkey` or just a subdomain. (Some providers want `resend._domainkey.yourdomain.com`, others want only `resend._domainkey` — use what Resend displays.)
   - **Value / Content / Target:** paste the value Resend gives (the long string).
   - **TTL:** leave default (e.g. Auto or 3600). Save.
3. Add every record Resend lists. Then wait **5–15 minutes** (sometimes up to an hour) for DNS to propagate.

#### If your domain is on Vercel (you bought it from Vercel)

**Your DNS provider is Vercel.** When you purchase a domain from Vercel, they host the DNS. Add the Resend records in Vercel like this:

1. Go to [vercel.com](https://vercel.com) and log in.
2. Open **Dashboard** → **Domains** (or your **Team** → **Domains** from the sidebar).
3. Click the domain you want to use for email (e.g. `yourdomain.com`).
4. You should see a **DNS Records** or **Advanced** section. If you see **“Configure DNS”** or **“Use Vercel DNS”**, make sure the domain is using **Vercel nameservers** (Vercel will show the nameservers; your domain is already on them if you bought it from Vercel).
5. Click **Add** (or **Add record**) to create a new DNS record.
6. For **each** record Resend gave you:
   - **Type:** choose **TXT** (Resend’s verification and DKIM records are TXT).
   - **Name:** enter the host part Resend shows. In Vercel you often enter only the **subdomain** part, not the full domain. For example:
     - If Resend says the name is `resend._domainkey` or `resend._domainkey.yourdomain.com`, try **Name:** `resend._domainkey` (Vercel may add your domain automatically).
     - If Resend shows a different name, use the part before `.yourdomain.com`, or exactly what Resend tells you.
   - **Value:** paste the full **Value** from Resend (the long string).
   - **TTL:** leave default (e.g. 60 or Auto). Save.
7. Repeat for every TXT record Resend lists. Then wait 5–15 minutes (Vercel can take up to 24 hours in rare cases) and verify in Resend (Step 4 below).

Vercel docs: [Managing DNS Records](https://vercel.com/docs/projects/domains/managing-dns-records).

### Step 4: Verify the domain in Resend

1. Back in Resend → **Domains**, find your domain.
2. Click **Verify** (or refresh). Resend will check the DNS records.
3. When status is **Verified**, you can send from addresses like `noreply@yourdomain.com`.

If it stays “Pending”, wait a bit longer and try again. Double-check that each record was added exactly as Resend shows (no extra spaces, full value pasted).

### Step 5: Create an API key in Resend

1. In Resend, open **API Keys** in the left sidebar.
2. Click **Create API Key**.
3. Give it a name (e.g. “Supabase auth”).
4. Choose **Sending access** (or Full access if that’s the only option).
5. Click **Add**. Resend will show the key **once** — copy it and store it somewhere safe (you’ll paste it into Supabase in the next step). You won’t be able to see it again.

### Step 6: Configure Supabase to use Resend (SMTP)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Authentication** → **SMTP** (in the left sidebar under Auth).
3. Enable **Custom SMTP** (toggle on).
4. Fill in the form exactly as below (replace with your domain and API key):

   | Field | Value to enter |
   |-------|----------------|
   | **Sender email** | `noreply@yourdomain.com` (must use the domain you verified in Resend) |
   | **Sender name** | `काय खायचं?` or any name you want (e.g. “EatPlan”) |
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` |
   | **Username** | `resend` (literally the word “resend”) |
   | **Password** | Your Resend API key (the long string you copied in Step 5) |

5. Click **Save**.

### Step 7: Test

1. In your app, go to the **Log in** page.
2. Enter an email that is **not** confirmed and try to log in, or use “Resend confirmation email” if you already see that option.
3. Check the inbox (and spam folder). You should receive an email from `noreply@yourdomain.com` (or whatever sender you set). If it arrives and is not in spam, you’re done.

If no email arrives, check Supabase **Authentication** → **SMTP** for any error message, and confirm in Resend that the domain is verified and the API key has sending access.

## 4. Test (quick check)

Trigger a “Resend confirmation email” from the app login page (or sign up with a new address). The email should be from your sender address and land in the inbox. If it goes to spam, ensure all DNS records (DKIM, SPF) from Resend are added correctly; propagation can take up to an hour.

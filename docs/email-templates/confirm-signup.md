# Confirm signup – email template for Supabase

Use in **Supabase Dashboard → Authentication → Email Templates → Confirm signup**.

**Sending from your domain:** To send these emails from `noreply@yourdomain.com` instead of `noreply@mail.app.supabase.io`, set up [custom SMTP with your domain](./custom-domain-smtp.md).

## What to paste

1. **Subject**  
   Open [confirm-signup-subject.txt](./confirm-signup-subject.txt), copy the **whole file** (one line), and paste into the **Subject** field in Supabase.

2. **Body**  
   Open [confirm-signup-body.html](./confirm-signup-body.html) in an editor. Select **all** (e.g. Ctrl+A / Cmd+A), copy, then in Supabase **clear the Body field completely** and paste. The Body must contain **only** that HTML: it must start with `<!DOCTYPE html>` and end with `</html>`. No other text.

**If your confirmation email still shows instructions, “Copy this”, “Subject”, “Body”, or markdown:** the Supabase **Body** field currently has the wrong content. Go to Supabase → Authentication → Email Templates → Confirm signup, **delete everything** in the Body field, then paste **only** the contents of [confirm-signup-body.html](./confirm-signup-body.html) (open the file, select all, copy, paste). Do not paste from this .md file or from any webpage—only from the raw .html file.

## Supabase default footer

If the email still shows “You're receiving this email because you signed up for an application powered by Supabase” and “Opt out of these emails” at the bottom, that is Supabase’s default footer. To remove or change it:

- In the Dashboard go to **Authentication → Email Templates** (or **Project Settings → Auth**).
- Look for an option such as **“Customize email footer”** or **“Disable Supabase branding in emails”** and turn it off or replace the footer text if your plan allows it.

## Template variables

- `{{ .ConfirmationURL }}` — replaced by Supabase with the real confirmation link.
- `{{ .Data.preferred_name }}` — the name the user entered at signup (e.g. “Shreyas”); if missing, the template shows “Hi,”.

## Testing

After saving the template in Supabase, trigger a new signup or use “Resend confirmation email” on the login page to test.

## “Confirm email” link shows error or expired

If clicking the button in the email sends you to a URL with `error=access_denied&error_code=otp_expired` or “Email link is invalid or has expired”:

1. **Link expired** — Confirmation links expire (often after 24 hours). Go to the app **Log in** page, enter your email, and when it says email not confirmed use **“Resend confirmation email”** to get a new link. Use the new link soon.

2. **Open in the same browser** — If you use the link in a different browser or device (or in a new tab where you weren’t logged in), verification can fail. Prefer opening the link in the **same browser** where you signed up.

3. **Site URL / Redirect URLs** — In Supabase go to **Authentication → URL Configuration**. Set **Site URL** to your app’s URL (e.g. `http://localhost:3000` for local dev or `https://yourdomain.com` for production). Add the same URL to **Redirect URLs** so Supabase can redirect back after confirmation.

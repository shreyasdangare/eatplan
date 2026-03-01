# Confirm signup – email template for Supabase

Use in **Supabase Dashboard → Authentication → Email Templates → Confirm signup**.

**Sending from your domain:** To send these emails from `noreply@yourdomain.com` instead of `noreply@mail.app.supabase.io`, set up [custom SMTP with your domain](./custom-domain-smtp.md).

## What to paste

1. **Subject**  
   Open [confirm-signup-subject.txt](./confirm-signup-subject.txt), copy the entire contents, and paste into the **Subject** field in Supabase.

2. **Body**  
   Open [confirm-signup-body.html](./confirm-signup-body.html), copy the entire contents (from `<!DOCTYPE` to `</html>`), and paste into the **Body** field in Supabase.

Do **not** paste anything from this `.md` file into Supabase — only from the `.txt` and `.html` files above.

## Supabase default footer

If the email still shows “You're receiving this email because you signed up for an application powered by Supabase” and “Opt out of these emails” at the bottom, that is Supabase’s default footer. To remove or change it:

- In the Dashboard go to **Authentication → Email Templates** (or **Project Settings → Auth**).
- Look for an option such as **“Customize email footer”** or **“Disable Supabase branding in emails”** and turn it off or replace the footer text if your plan allows it.

## Template variables

- `{{ .ConfirmationURL }}` — replaced by Supabase with the real confirmation link.
- `{{ .Data.preferred_name }}` — the name the user entered at signup (e.g. “Shreyas”); if missing, the template shows “Hi,”.

## Testing

After saving the template in Supabase, trigger a new signup or use “Resend confirmation email” on the login page to test.

# Confirm signup – email template for Supabase

Use this in **Supabase Dashboard → Authentication → Email Templates → Confirm signup**.

**Important:** Copy only the values below. Do **not** paste any text from this page (headings, backticks, or notes) into Supabase.  
- In the **Subject** field, paste only the single line under “Subject” below.  
- In the **Body** field, paste only the HTML under “Body” below (from `<!DOCTYPE` through `</html>`).

---

## Subject

Copy this line only into the Subject field:

```
Confirm your email – काय खायचं?
```

---

## Body

Copy everything from `<!DOCTYPE` to `</html>` into the Body field (nothing else):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email – काय खायचं?</title>
</head>
<body style="margin:0; padding:0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background-color: #fffbf7; color: #1c1917;">
  <div style="max-width: 420px; margin: 0 auto; padding: 40px 24px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="margin: 0; font-size: 22px; font-weight: 700; color: #9a3412; letter-spacing: -0.02em;">
        काय खायचं?
      </p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #78716c;">
        What to eat?
      </p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #a8a29e; font-weight: 500;">
        Meal planner by PP
      </p>
    </div>

    <!-- Card -->
    <div style="background: #ffffff; border-radius: 16px; border: 1px solid #f5f5f4; padding: 28px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
      <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.5; color: #44403c;">
        {{ if .Data.preferred_name }}Hi {{ .Data.preferred_name }},{{ else }}Hi,{{ end }}
      </p>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.55; color: #57534e;">
        Thanks for signing up. Tap the button below to confirm your email and start planning meals.
      </p>

      <p style="margin: 0 0 24px 0; text-align: center;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; background-color: #1c1917; text-decoration: none; border-radius: 12px; box-shadow: 0 2px 8px rgba(28,25,23,0.2);">
          Confirm email
        </a>
      </p>

      <p style="margin: 0; font-size: 13px; color: #a8a29e; line-height: 1.5;">
        If you didn’t create an account, you can ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <p style="margin: 24px 0 0 0; text-align: center; font-size: 11px; color: #a8a29e;">
      Meal planner by PP
    </p>
  </div>
</body>
</html>
```

---

## Notes

- **Preferred name**: The greeting uses `{{ .Data.preferred_name }}` when the user signed up with a name; otherwise it shows “Hi,”.
- **ConfirmationURL**: Supabase replaces `{{ .ConfirmationURL }}` with the real link.
- After updating the template in Supabase, save and trigger a new signup to test.

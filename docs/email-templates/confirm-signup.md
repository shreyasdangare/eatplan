# Confirm signup – email template for Supabase

Paste this into **Supabase Dashboard → Authentication → Email Templates → Confirm signup**.

---

## Subject

```
Confirm your email – काय खायचं?
```

---

## Body (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
</head>
<body style="margin:0; padding:0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background-color: #fffbf7; color: #1c1917;">
  <div style="max-width: 400px; margin: 32px auto; padding: 0 20px;">
    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #9a3412;">
      काय खायचं?
    </p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #78716c;">
      What to eat?
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #44403c;">
      {{ if .Data.preferred_name }}Hi {{ .Data.preferred_name }},{{ else }}Hi,{{ end }}
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #44403c;">
      Thanks for signing up. Tap the button below to confirm your email and start planning meals.
    </p>

    <p style="margin: 0 0 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #fff; background-color: #1c1917; text-decoration: none; border-radius: 12px;">
        Confirm email
      </a>
    </p>

    <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.5;">
      If you didn’t create an account, you can ignore this email.
    </p>
  </div>
</body>
</html>
```

---

## Notes

- **Preferred name**: `{{ if .Data.preferred_name }}Hi {{ .Data.preferred_name }},{{ else }}Hi,{{ end }}` shows the name from signup when present; otherwise “Hi,”.
- **Colours**: Warm neutral (stone/amber) to match the app; dark button for contrast.
- **ConfirmationURL**: Supabase replaces this with the real confirmation link.

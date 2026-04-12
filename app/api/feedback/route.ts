import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });
  }

  const userEmail = auth.user.email;
  const userName = auth.user.user_metadata?.preferred_name || "User";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "EatPlan App <onboarding@resend.dev>",
        to: "shreyasdangare@gmail.com",
        subject: `New Feedback from ${userName}`,
        html: `
          <h3>Feedback from ${userName} (${userEmail})</h3>
          <p>${message}</p>
        `
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API Error: ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}

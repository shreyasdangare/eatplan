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
  const userName = auth.user.preferred_name || "A User";

  try {
    console.log(`Sending feedback from ${userEmail}...`);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "EatPlan Feedback <onboarding@resend.dev>",
        to: "shreyasdangare@gmail.com",
        subject: `[EatPlan Feedback] from ${userName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
            <h2>New Feedback Received</h2>
            <p><strong>From:</strong> ${userName} (${userEmail})</p>
            <hr />
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        `
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API Error details:", errorText);
      return NextResponse.json({ error: `Resend Error: ${errorText}` }, { status: res.status });
    }

    console.log("Feedback sent successfully.");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Critical Feedback error:", err);
    return NextResponse.json({ error: "Internal server error while sending feedback" }, { status: 500 });
  }
}

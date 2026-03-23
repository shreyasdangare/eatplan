import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Missing Supabase admin keys" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Need to find user. listUsers might be paginated but usually test users are found easily
    // We'll just try to create. If it fails due to existing, we update it.
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { preferred_name: "Test User", native_language: "Marathi" },
    });

    if (createError) {
      if (createError.message.includes("already exist")) {
        // User exists, find them to confirm their email just in case
        let page = 1;
        let userId = null;
        while (true) {
          const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
          if (!data || !data.users || data.users.length === 0) break;
          const user = data.users.find(u => u.email === email);
          if (user) {
            userId = user.id;
            break;
          }
          page++;
        }

        if (userId) {
          // Ensure email is confirmed
          await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true, password });
        }
      } else {
        throw createError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Dev user setup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

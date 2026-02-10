import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // These will surface clearly in logs in deployed environments.
  console.warn(
    "Supabase environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not fully configured."
  );
}

export const supabaseServer = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? "",
  {
    auth: {
      persistSession: false
    }
  }
);


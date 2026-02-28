#!/usr/bin/env node
/**
 * Delete a Supabase Auth user by email and all their data.
 * Run from project root: node --env-file=.env.local scripts/delete-user-by-email.mjs user@example.com
 *
 * Uses service role. Deleting the user from auth.users cascades to their
 * dishes, meal_plans, favorites, todoist_connections (and pantry, dish_ingredients).
 */

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: node --env-file=.env.local scripts/delete-user-by-email.mjs <email>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function findUserByEmail(emailToFind) {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }
    const match = data.users.find((u) => (u.email || "").toLowerCase() === emailToFind.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function main() {
  console.log(`Looking up user: ${email}`);
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Found user id: ${user.id}. Deleting user and all their data...`);
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Delete failed:", error.message);
    process.exit(1);
  }
  console.log("User and all associated data have been deleted.");
}

main();

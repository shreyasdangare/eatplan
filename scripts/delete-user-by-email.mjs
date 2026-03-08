#!/usr/bin/env node
/**
 * Delete a Supabase Auth user by email and all their data.
 * Run from project root: node --env-file=.env.local scripts/delete-user-by-email.mjs user@example.com
 *
 * What gets removed:
 *
 * 1. Storage: dish images in bucket "dish-images" (paths {dishId}.jpg etc.).
 *    This script deletes those explicitly before Auth delete.
 *
 * 2. Database (via ON DELETE CASCADE when auth.users row is removed):
 *    - dishes, dish_ingredients (via dishes), meal_plans, favorites, pantry.
 *
 * If you add more Storage buckets or other user-owned data later, extend
 * deleteUserStorageFiles() or add similar cleanup before deleteUser().
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "dish-images";
const EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

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

async function deleteUserStorageFiles(userId) {
  const { data: dishes, error: listError } = await supabase
    .from("dishes")
    .select("id")
    .eq("user_id", userId);
  if (listError) {
    console.warn("Could not list user dishes for storage cleanup:", listError.message);
    return;
  }
  if (!dishes?.length) return;

  const paths = [];
  for (const d of dishes) {
    for (const ext of EXTENSIONS) {
      paths.push(`${d.id}.${ext}`);
    }
  }

  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeError) {
    console.warn("Storage cleanup warning (bucket may not exist or be empty):", removeError.message);
  } else {
    console.log(`Removed up to ${paths.length} file(s) from ${BUCKET} for this user's dishes.`);
  }
}

async function main() {
  console.log(`Looking up user: ${email}`);
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Found user id: ${user.id}. Deleting storage files, then user and all their data...`);
  await deleteUserStorageFiles(user.id);
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Delete failed:", error.message);
    process.exit(1);
  }
  console.log("User and all associated data have been deleted.");
}

main();

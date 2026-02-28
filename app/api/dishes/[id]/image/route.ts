import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

const BUCKET = "dish-images";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: dishId } = await context.params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.size) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 2MB)" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP or GIF." },
      { status: 400 }
    );
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "jpg";
  const path = `${dishId}.${ext}`;

  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    if (uploadError.message?.includes("Bucket not found")) {
      return NextResponse.json(
        {
          error:
            "Storage bucket not found. Create a public bucket named 'dish-images' in Supabase Dashboard > Storage."
        },
        { status: 502 }
      );
    }
    console.error("Supabase storage upload error", uploadError);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabaseServer.storage
    .from(BUCKET)
    .getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const { error: updateError } = await supabaseServer
    .from("dishes")
    .update({ image_url: imageUrl })
    .eq("id", dishId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    console.error("Error updating dish image_url", updateError);
    return NextResponse.json(
      { error: "Uploaded but failed to save URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ image_url: imageUrl });
}

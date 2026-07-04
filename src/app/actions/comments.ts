"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export async function createComment(formData: FormData) {
  const userId = await requireUserId();

  const itemId = String(formData.get("item_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    item_id: itemId,
    user_id: userId,
    scope: "item",
    content,
  });

  revalidatePath(`/books/${itemId}`);
}

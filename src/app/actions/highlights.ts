"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export async function createHighlight(formData: FormData) {
  const userId = await requireUserId();

  const itemId = String(formData.get("item_id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  const noteRaw = String(formData.get("note") ?? "").trim();
  const unitRefRaw = String(formData.get("unit_ref") ?? "").trim();

  if (!imagePath) {
    redirect(`/books/${itemId}?error=${encodeURIComponent("Escolha uma foto.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("highlights").insert({
    item_id: itemId,
    user_id: userId,
    image_url: imagePath, // caminho no bucket privado "highlights", não uma URL pública
    unit_ref: unitRefRaw ? Number(unitRefRaw) : null,
    note: noteRaw || null,
  });

  if (error) {
    redirect(`/books/${itemId}?error=${encodeURIComponent("Não foi possível salvar o trecho.")}`);
  }

  revalidatePath(`/books/${itemId}`);
  redirect(`/books/${itemId}`);
}

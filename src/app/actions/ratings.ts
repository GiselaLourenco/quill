"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

// Nota por estrelas (1–5), independente do status do livro — dá pra avaliar
// sem terminar, inclusive um livro abandonado. `stars = 0` limpa a nota.
export async function setRating(itemId: string, stars: number) {
  const userId = await requireUserId();
  const supabase = await createClient();

  if (!Number.isInteger(stars) || stars < 0 || stars > 5) return;

  if (stars === 0) {
    await supabase
      .from("ratings")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("ratings")
      .upsert(
        { item_id: itemId, user_id: userId, stars },
        { onConflict: "item_id,user_id" },
      );
  }

  revalidatePath(`/books/${itemId}`);
  revalidatePath("/estante");
}

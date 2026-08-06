"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

// Indicar um livro a um amigo. Guarda item_ref (referência) + title/creator
// (para o destinatário ver mesmo sem acesso ao item do dono).
export async function recommendBook(input: {
  toUserId: string;
  itemRef: string;
  title: string;
  message?: string | null;
}) {
  const userId = await requireUserId();
  if (!input.toUserId || input.toUserId === userId) return;

  const supabase = await createClient();

  // só indica para amigo de fato (amizade aceita)
  const { data: ok } = await supabase.rpc("are_friends", {
    a: userId,
    b: input.toUserId,
  });
  if (!ok) return;

  await supabase.from("recommendations").insert({
    from_user_id: userId,
    to_user_id: input.toUserId,
    item_ref: input.itemRef || null,
    title: input.title,
    message: input.message?.trim() || null,
    source: "friend",
  });
}

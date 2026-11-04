"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

const REACTION_EMOJIS = ["🔥", "👏", "☕", "😮"];

export async function toggleReaction(formData: FormData) {
  const userId = await requireUserId();
  const checkinId = String(formData.get("checkin_id") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!checkinId || !REACTION_EMOJIS.includes(emoji)) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("comments")
    .select("id")
    .eq("checkin_id", checkinId)
    .eq("user_id", userId)
    .eq("content", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("comments").delete().eq("id", existing.id);
  } else {
    await supabase.from("comments").insert({
      scope: "checkin",
      checkin_id: checkinId,
      user_id: userId,
      content: emoji,
    });
  }

  revalidatePath(`/juntos/${groupId}`);
}

export async function replyToCheckin(formData: FormData) {
  const userId = await requireUserId();
  const checkinId = String(formData.get("checkin_id") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!checkinId || !content) return;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    scope: "checkin",
    checkin_id: checkinId,
    user_id: userId,
    content,
  });

  revalidatePath(`/juntos/${groupId}`);
}

// Comentário num check-in do desafio (texto e/ou GIF) — o "comentar" do feed
// e do painel do dia. Quem lê é quem está no grupo (RLS "members read checkin
// comments").
export async function comentarCheckin(input: {
  checkinId: string;
  groupId: string;
  content: string;
  gifUrl: string | null;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  const content = input.content.trim();
  if (!input.checkinId || (!content && !input.gifUrl)) {
    return { error: "Escreva algo ou escolha um GIF." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    scope: "checkin",
    checkin_id: input.checkinId,
    user_id: userId,
    content: content || null,
    gif_url: input.gifUrl,
  });
  if (error) return { error: "Não deu pra comentar. Tente de novo." };

  revalidatePath(`/juntos/${input.groupId}`);
  return { error: null };
}

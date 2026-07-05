"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export async function createCheckin({
  groupId,
  sessionId,
  photoPath,
  note,
}: {
  groupId: string;
  sessionId: string;
  photoPath?: string | null;
  note?: string | null;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  await supabase.from("challenge_checkins").insert({
    group_id: groupId,
    session_id: sessionId,
    user_id: userId,
    photo_path: photoPath || null,
    note: note || null,
  });

  revalidatePath(`/juntos/${groupId}`);
}

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

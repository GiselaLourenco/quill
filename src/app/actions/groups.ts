"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

const SCORING_METRICS = ["pages", "active_days", "check_ins", "chapters", "minutes"];

export async function createChallenge(formData: FormData) {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const scoringMetric = String(formData.get("scoring_metric") ?? "pages");
  const startsAt = String(formData.get("starts_at") ?? "").trim() || null;
  const endsAt = String(formData.get("ends_at") ?? "").trim() || null;
  const itemId = String(formData.get("item_id") ?? "").trim() || null;
  const competes = formData.get("competes") === "on";

  if (!name || !SCORING_METRICS.includes(scoringMetric)) {
    redirect("/juntos/novo?error=Preencha nome e métrica de pontuação.");
  }

  const supabase = await createClient();
  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      emoji,
      description,
      format: "challenge",
      scoring_metric: scoringMetric,
      starts_at: startsAt,
      ends_at: endsAt,
      item_id: itemId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !group) {
    redirect("/juntos/novo?error=Não foi possível criar o desafio.");
  }

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "owner",
    competes,
  });

  revalidatePath("/juntos");
  redirect(`/juntos/${group.id}`);
}

export async function joinChallengeByCode(formData: FormData) {
  const userId = await requireUserId();
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) redirect("/juntos?error=Digite um código de convite.");

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) {
    redirect("/juntos?error=Código não encontrado.");
  }

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "member",
    competes: true,
  });

  revalidatePath("/juntos");
  redirect(`/juntos/${group.id}`);
}

export async function toggleCompete(groupId: string, competes: boolean) {
  const userId = await requireUserId();
  const supabase = await createClient();
  await supabase
    .from("group_members")
    .update({ competes })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  revalidatePath(`/juntos/${groupId}`);
}

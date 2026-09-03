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
  // Guardado em minúsculo porque a entrada por código normaliza para minúsculo.
  const inviteCode = String(formData.get("invite_code") ?? "").trim().toLowerCase() || null;

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
      // Sem código informado, o default do banco gera um.
      ...(inviteCode ? { invite_code: inviteCode } : {}),
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
  await requireUserId(); // só garante sessão — o uid vem de auth.uid() na RPC
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) redirect("/juntos?error=Digite um código de convite.");

  // RPC security definer: a RLS de groups só deixa membros lerem o grupo,
  // então a busca por código (feita por quem AINDA não é membro) precisa
  // passar por dentro. A função também semeia as amizades automáticas.
  const supabase = await createClient();
  const { data: groupId } = await supabase.rpc("join_group_with_code", {
    invite: code,
  });

  if (!groupId) {
    redirect("/juntos?error=Código não encontrado.");
  }

  revalidatePath("/juntos");
  redirect(`/juntos/${groupId}`);
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

// Sair de um desafio: remove a participação. Os check-ins já feitos continuam
// no histórico das sessões, mas somem do feed e do ranking do grupo.
export async function leaveChallenge(groupId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  revalidatePath("/juntos");
  revalidatePath("/");
  redirect("/juntos");
}

/**
 * Puxa um amigo pra um desafio que já existe.
 *
 * A RLS garante o resto: a política "add friend to my group" exige que quem
 * chama já esteja no grupo e que a pessoa adicionada já seja amiga dela. Aqui
 * a checagem existe só pra devolver mensagem em vez de uma escrita
 * silenciosamente recusada.
 */
export async function adicionarAmigoAoDesafio(input: {
  groupId: string;
  friendId: string;
}): Promise<{ error: string | null }> {
  await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: input.groupId, user_id: input.friendId });

  if (error) {
    // Chave duplicada: já está no desafio. Não é falha, é o estado desejado.
    if (error.code === "23505") return { error: null };
    console.error("[adicionarAmigoAoDesafio]", error.code, error.message);
    return { error: "Não foi possível adicionar." };
  }

  revalidatePath(`/juntos/${input.groupId}`);
  return { error: null };
}

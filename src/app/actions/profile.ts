"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { AVATARES, AVATAR_FUNDOS } from "@/lib/avatares";

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || null,
    })
    .eq("id", userId);

  if (error) {
    const message =
      error.code === "23505"
        ? "Esse username já está em uso."
        : "Não foi possível salvar o perfil.";
    redirect(`/profile?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

/**
 * "Editar perfil": nome de exibição + avatar (arte, zoom e cor de fundo).
 * O username não entra — é identificador e não muda por aqui.
 */
export async function updateAvatar(input: {
  nome: string;
  username: string;
  avatarId: string;
  zoom: number;
  fundo: string;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();

  const nome = input.nome.trim().slice(0, 30);
  if (!nome) return { error: "O nome não pode ficar vazio." };

  // Username é identificador: normaliza e valida o formato antes de gravar.
  const username = input.username.trim().toLowerCase().slice(0, 30);
  if (!username) return { error: "O username não pode ficar vazio." };
  if (!/^[a-z0-9_.]+$/.test(username)) {
    return { error: "Username aceita apenas letras, números, ponto e underline." };
  }

  // Listas de permissão: o cliente não grava caminho nem cor arbitrária.
  const escolhido = AVATARES.find((a) => a.id === input.avatarId);
  if (!escolhido) return { error: "Avatar inválido." };

  const fundo = (AVATAR_FUNDOS as readonly string[]).includes(input.fundo)
    ? input.fundo
    : AVATAR_FUNDOS[0];

  const zoom = Math.round(input.zoom);
  if (!Number.isFinite(zoom) || zoom < 80 || zoom > 200) {
    return { error: "Zoom fora do intervalo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: nome,
      username,
      avatar_url: escolhido.src,
      avatar_zoom: zoom,
      avatar_bg: fundo,
    })
    .eq("id", userId);

  // `profiles.username` é unique — o conflito vira mensagem, não erro genérico.
  if (error) {
    if (error.code === "23505") return { error: "Esse username já está em uso." };
    return { error: "Não foi possível salvar o perfil." };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { error: null };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { AVATARES, AVATAR_FOTO_ID, AVATAR_FUNDOS } from "@/lib/avatares";
import { arteEnviadaValida } from "@/lib/artes";
import { ehAdmin } from "@/app/actions/admin";

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
  /** URL da foto enviada — só vale com `avatarId` "foto", e só para o admin. */
  fotoUrl?: string | null;
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

  const supabase = await createClient();

  // Listas de permissão: o cliente não grava caminho nem cor arbitrária.
  // A exceção é a foto enviada, que só o admin tem — e a URL precisa apontar
  // para um arquivo que existe mesmo no bucket.
  let avatarSrc: string;
  if (input.avatarId === AVATAR_FOTO_ID) {
    if (!(await ehAdmin())) return { error: "Só o admin usa foto enviada." };
    if (!input.fotoUrl || !(await arteEnviadaValida(supabase, input.fotoUrl))) {
      return { error: "Foto inválida." };
    }
    avatarSrc = input.fotoUrl;
  } else {
    const escolhido = AVATARES.find((a) => a.id === input.avatarId);
    if (!escolhido) return { error: "Avatar inválido." };
    avatarSrc = escolhido.src;
  }

  const fundo = (AVATAR_FUNDOS as readonly string[]).includes(input.fundo)
    ? input.fundo
    : AVATAR_FUNDOS[0];

  const zoom = Math.round(input.zoom);
  if (!Number.isFinite(zoom) || zoom < 80 || zoom > 200) {
    return { error: "Zoom fora do intervalo." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: nome,
      username,
      avatar_url: avatarSrc,
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

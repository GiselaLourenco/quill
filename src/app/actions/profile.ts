"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { AVATARES, AVATAR_FUNDOS } from "@/lib/avatares";
import { arteEnviadaValida, avatarEnviadoValido } from "@/lib/artes";
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
  /** `src` da opção escolhida: arte do Quill ou foto adicionada pelo admin. */
  avatarSrc: string;
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

  // Listas de permissão: o cliente não grava caminho nem cor arbitrária. Vale
  // arte do Quill ou foto da pasta de avatares (que só o admin abastece). A
  // foto antiga do admin, da raiz do bucket, segue valendo pra ele não perder
  // o avatar ao salvar só o nome.
  const valido =
    AVATARES.some((a) => a.src === input.avatarSrc) ||
    (await avatarEnviadoValido(supabase, input.avatarSrc)) ||
    ((await arteEnviadaValida(supabase, input.avatarSrc)) && (await ehAdmin()));
  if (!valido) return { error: "Avatar inválido." };
  const avatarSrc = input.avatarSrc;

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

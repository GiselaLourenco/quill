"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { arteValida } from "@/lib/artes";

/**
 * Só quem tem `profiles.is_admin` mexe nas artes.
 *
 * Usa `getClaims()` (JWT verificado localmente) como o resto do app —
 * `getUser()` depende de round-trip e volta vazio quando o token está para
 * renovar, o que fazia o admin perder o acesso sem motivo. A garantia real
 * continua sendo a RLS da tabela.
 */
export async function ehAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

export async function salvarAjusteImagem(input: {
  path: string;
  zoom: number;
  posX: number;
  posY: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();

  // A RLS já barra não-admin, mas checar aqui devolve mensagem em vez de
  // uma escrita silenciosamente ignorada.
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  if (!input.path.startsWith("/img/") || input.path.includes("..")) {
    return { error: "Caminho inválido." };
  }
  const limite = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v)));

  const supabase = await createClient();
  const { error } = await supabase.from("image_adjustments").upsert(
    {
      path: input.path,
      zoom: limite(input.zoom, 50, 300),
      pos_x: limite(input.posX, 0, 100),
      pos_y: limite(input.posY, 0, 100),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "path" },
  );

  if (error) return { error: "Não foi possível salvar o ajuste." };

  // O ajuste vale para o app inteiro assim que salva — sem novo deploy.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function limparAjusteImagem(path: string): Promise<{ error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  const supabase = await createClient();
  await supabase.from("image_adjustments").delete().eq("path", path);
  revalidatePath("/", "layout");
  return { error: null };
}

/**
 * Define o que aparece num ponto fixo do app: qual arte e como enquadrada.
 * `src: null` devolve o ponto para a arte que o código define.
 */
export async function salvarSlotImagem(input: {
  slot: string;
  src: string | null;
  zoom: number;
  posX: number;
  posY: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  if (!/^[a-z0-9.\-]{3,60}$/.test(input.slot)) return { error: "Slot inválido." };
  // A arte só pode ser uma que já existe em /public/img — o cliente não grava
  // caminho arbitrário.
  if (input.src !== null && !arteValida(input.src)) return { error: "Arte inexistente." };

  const limite = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v)));

  const supabase = await createClient();
  const { error } = await supabase.from("image_slots").upsert(
    {
      slot: input.slot,
      src: input.src,
      zoom: limite(input.zoom, 50, 300),
      pos_x: limite(input.posX, 0, 100),
      pos_y: limite(input.posY, 0, 100),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "slot" },
  );

  if (error) return { error: "Não foi possível salvar." };

  // Vale para o app inteiro assim que salva — sem novo deploy.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function limparSlotImagem(slot: string): Promise<{ error: string | null }> {
  await requireUserId();
  if (!(await ehAdmin())) return { error: "Só o admin ajusta as imagens." };

  const supabase = await createClient();
  await supabase.from("image_slots").delete().eq("slot", slot);
  revalidatePath("/", "layout");
  return { error: null };
}

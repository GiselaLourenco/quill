"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { paletteIndexForTitle } from "@/lib/covers";

export async function createMediaItem(formData: FormData) {
  const userId = await requireUserId();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect("/books/new?error=Título é obrigatório.");
  }

  const creator = String(formData.get("creator") ?? "").trim() || null;
  const genre = String(formData.get("genre") ?? "").trim() || null;
  const spotifyUrl = String(formData.get("spotify_url") ?? "").trim() || null;
  const totalUnitsRaw = String(formData.get("total_units") ?? "").trim();
  const totalUnits = totalUnitsRaw ? Number(totalUnitsRaw) : null;
  const totalChaptersRaw = String(formData.get("total_chapters") ?? "").trim();
  // 0 não é contagem de capítulo — o check da coluna recusa, então vira null
  // aqui em vez de estourar o insert.
  const totalChapters =
    totalChaptersRaw && Number(totalChaptersRaw) > 0 ? Number(totalChaptersRaw) : null;
  const status = String(formData.get("status") ?? "reading");
  const coverKind = String(formData.get("cover_kind") ?? "illustrated");
  const coverUrl =
    coverKind === "real"
      ? String(formData.get("cover_url") ?? "").trim() || null
      : null;

  const supabase = await createClient();
  const { error } = await supabase.from("media_items").insert({
    user_id: userId,
    title,
    creator,
    genre,
    spotify_url: spotifyUrl,
    total_units: totalUnits,
    total_chapters: totalChapters,
    status,
    cover_kind: coverKind === "real" && coverUrl ? "real" : "illustrated",
    cover_url: coverUrl,
    cover_palette: paletteIndexForTitle(title),
  });

  if (error) {
    redirect("/books/new?error=Não foi possível salvar o livro.");
  }

  redirect("/estante");
}

/**
 * Corrige título, autor, capa, páginas, capítulos ou playlist de um livro já
 * na estante. Status fica de fora de propósito: já tem editor próprio
 * (`updateItemStatus` / `StatusEditor`) na página do livro.
 */
export async function updateMediaItem(formData: FormData) {
  const userId = await requireUserId();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/estante");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect(`/books/${id}/editar?error=Título é obrigatório.`);
  }

  const creator = String(formData.get("creator") ?? "").trim() || null;
  const genre = String(formData.get("genre") ?? "").trim() || null;
  const spotifyUrl = String(formData.get("spotify_url") ?? "").trim() || null;
  const totalUnitsRaw = String(formData.get("total_units") ?? "").trim();
  const totalUnits = totalUnitsRaw ? Number(totalUnitsRaw) : null;
  const totalChaptersRaw = String(formData.get("total_chapters") ?? "").trim();
  const totalChapters =
    totalChaptersRaw && Number(totalChaptersRaw) > 0 ? Number(totalChaptersRaw) : null;
  const coverKind = String(formData.get("cover_kind") ?? "illustrated");
  const coverUrl =
    coverKind === "real"
      ? String(formData.get("cover_url") ?? "").trim() || null
      : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("media_items")
    .update({
      title,
      creator,
      genre,
      spotify_url: spotifyUrl,
      total_units: totalUnits,
      total_chapters: totalChapters,
      cover_kind: coverKind === "real" && coverUrl ? "real" : "illustrated",
      cover_url: coverUrl,
      cover_palette: paletteIndexForTitle(title),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    redirect(`/books/${id}/editar?error=Não foi possível salvar as alterações.`);
  }

  revalidatePath(`/books/${id}`);
  revalidatePath("/estante");
  redirect(`/books/${id}`);
}

const VALID_STATUSES = ["want", "reading", "finished", "recomendado", "abandoned"];

// "Recomendado" é uma marca que convive com o status de leitura: dá pra estar
// recomendado E quero ler (ou lendo, terminei, abandonei). O status
// `recomendado` sozinho continua significando "chegou de um amigo, ainda não
// decidi" — por isso trocar para outro status não apaga a marca.
export async function toggleRecommended(itemId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("media_items")
    .select("status, is_recommended")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!atual) return;

  const marcado = atual.is_recommended || atual.status === "recomendado";
  const updates: { is_recommended: boolean; status?: string } = { is_recommended: !marcado };
  // Desmarcar um livro que só tinha "recomendado" deixaria ele sem status de
  // leitura nenhum — cai em "quero ler", que é o mais próximo de "ainda não li".
  if (marcado && atual.status === "recomendado") updates.status = "want";

  await supabase.from("media_items").update(updates).eq("id", itemId).eq("user_id", userId);

  revalidatePath(`/books/${itemId}`);
  revalidatePath("/estante");
  revalidatePath("/");
}

export async function updateItemStatus(itemId: string, status: string) {
  if (!VALID_STATUSES.includes(status)) return;
  await requireUserId();

  const supabase = await createClient();

  const updates: {
    status: string;
    finished_at: string | null;
    started_at?: string;
    is_recommended?: boolean;
  } = {
    status,
    finished_at: status === "finished" ? new Date().toISOString().slice(0, 10) : null,
  };
  // Escolher "recomendado" aqui é o caso "ainda não decidi": a marca vem junto.
  if (status === "recomendado") updates.is_recommended = true;

  // "Dias lidos" conta do primeiro "lendo" até o "terminei" — grava só na
  // primeira vez que entra como lendo; abandonar e retomar depois não
  // reinicia essa data.
  if (status === "reading") {
    const { data: atual } = await supabase
      .from("media_items")
      .select("started_at")
      .eq("id", itemId)
      .maybeSingle();
    if (!atual?.started_at) {
      updates.started_at = new Date().toISOString().slice(0, 10);
    }
  }

  await supabase.from("media_items").update(updates).eq("id", itemId);

  revalidatePath(`/books/${itemId}`);
  revalidatePath("/estante");
  revalidatePath("/");
}

// "Adicionar à minha estante" a partir do livro de um amigo: copia os dados
// visíveis (título, autor, capa) para um item novo meu, com o status escolhido.
// Não mexe no item do amigo — cada pessoa tem o seu próprio media_item.
export async function addFriendBookToShelf(input: {
  sourceItemId: string;
  /** Quando vem de uma indicação: guarda qual, pra página do livro mostrar quem indicou e o recado. */
  recommendationId?: string | null;
}): Promise<{ itemId: string | null; error: string | null }> {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("media_items")
    .select("title, creator, cover_kind, cover_url, cover_palette, total_units, total_chapters")
    .eq("id", input.sourceItemId)
    .maybeSingle();

  if (!source) return { itemId: null, error: "Livro não encontrado." };

  const { data: existing } = await supabase
    .from("media_items")
    .select("id")
    .eq("user_id", userId)
    .eq("title", source.title)
    .maybeSingle();

  if (existing) {
    // Já tinha o livro: não duplica, mas registra a indicação nele — a marca
    // "recomendado" entra sem mexer no status que a pessoa já escolheu.
    if (input.recommendationId) {
      await supabase
        .from("media_items")
        .update({ is_recommended: true, recommendation_id: input.recommendationId })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .is("recommendation_id", null);
      await marcarIndicacaoAceita(supabase, input.recommendationId);
      revalidatePath(`/books/${existing.id}`);
      revalidatePath("/estante");
    }
    return { itemId: existing.id, error: "Esse livro já está na sua estante." };
  }

  const { data: created, error } = await supabase
    .from("media_items")
    .insert({
      user_id: userId,
      title: source.title,
      creator: source.creator,
      total_units: source.total_units,
      total_chapters: source.total_chapters,
      // Chega sem decisão tomada. Antes o fluxo obrigava a escolher entre
      // "quero ler" e "lendo" na hora de adicionar — decisão que ninguém tem
      // no momento em que está passeando pela estante de outra pessoa.
      // `recomendado` é o status que já significa "veio de um amigo, ainda não
      // decidi": é o mesmo que a indicação de livro usa, e tem chip próprio na
      // estante pra filtrar depois.
      status: "recomendado",
      is_recommended: true,
      recommendation_id: input.recommendationId ?? null,
      cover_kind: source.cover_kind,
      cover_url: source.cover_url,
      cover_palette: source.cover_palette ?? paletteIndexForTitle(source.title),
    })
    .select("id")
    .single();

  if (error || !created) return { itemId: null, error: "Não foi possível adicionar." };

  if (input.recommendationId) await marcarIndicacaoAceita(supabase, input.recommendationId);

  revalidatePath("/estante");
  revalidatePath("/");
  return { itemId: created.id, error: null };
}

// Excluir um livro da minha estante. As sessões, notas e comentários ligados a
// ele caem junto pelo `on delete cascade` do schema.
export async function deleteMediaItem(itemId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  await supabase.from("media_items").delete().eq("id", itemId).eq("user_id", userId);

  revalidatePath("/estante");
  revalidatePath("/");
  redirect("/estante");
}

async function marcarIndicacaoAceita(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recommendationId: string,
) {
  // A RLS só deixa o destinatário atualizar — basta filtrar pelo id.
  await supabase.from("recommendations").update({ status: "accepted" }).eq("id", recommendationId);
}

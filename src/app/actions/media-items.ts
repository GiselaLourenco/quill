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

const VALID_STATUSES = ["want", "reading", "finished", "recomendado", "abandoned"];

export async function updateItemStatus(itemId: string, status: string) {
  if (!VALID_STATUSES.includes(status)) return;
  await requireUserId();

  const supabase = await createClient();
  await supabase
    .from("media_items")
    .update({
      status,
      finished_at: status === "finished" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", itemId);

  revalidatePath(`/books/${itemId}`);
  revalidatePath("/estante");
  revalidatePath("/");
}

// "Adicionar à minha estante" a partir do livro de um amigo: copia os dados
// visíveis (título, autor, capa) para um item novo meu, com o status escolhido.
// Não mexe no item do amigo — cada pessoa tem o seu próprio media_item.
export async function addFriendBookToShelf(input: {
  sourceItemId: string;
  status: "want" | "reading";
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

  if (existing) return { itemId: existing.id, error: "Esse livro já está na sua estante." };

  const { data: created, error } = await supabase
    .from("media_items")
    .insert({
      user_id: userId,
      title: source.title,
      creator: source.creator,
      total_units: source.total_units,
      total_chapters: source.total_chapters,
      status: input.status,
      cover_kind: source.cover_kind,
      cover_url: source.cover_url,
      cover_palette: source.cover_palette ?? paletteIndexForTitle(source.title),
    })
    .select("id")
    .single();

  if (error || !created) return { itemId: null, error: "Não foi possível adicionar." };

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

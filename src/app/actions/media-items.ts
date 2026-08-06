"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { paletteIndexForTitle } from "@/lib/covers";

export type CoverCandidate = {
  id: string;
  title: string;
  author: string | null;
  thumbUrl: string;
  largeUrl: string;
};

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

export async function searchBookCovers(
  query: string,
): Promise<CoverCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("fields", "title,author_name,cover_i");
  url.searchParams.set("limit", "6");

  const res = await fetch(url, {
    headers: { "User-Agent": "Quill (personal reading app)" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };

  return (data.docs ?? [])
    .filter((doc): doc is OpenLibraryDoc & { cover_i: number } =>
      Boolean(doc.cover_i),
    )
    .map((doc) => ({
      id: String(doc.cover_i),
      title: doc.title ?? trimmed,
      author: doc.author_name?.[0] ?? null,
      thumbUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
      largeUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    }));
}

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

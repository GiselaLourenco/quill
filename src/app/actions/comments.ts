"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

// Comentário na página do livro, por nível (livro/capítulo) — passagem é
// backlog (dependia de foto). GIF via Giphy. Visibilidade: privado por padrão.
export async function createComment(input: {
  itemId: string;
  content: string;
  scope: "item" | "chapter";
  chapterRef?: number | null;
  gifUrl?: string | null;
  isPublic?: boolean;
}) {
  const userId = await requireUserId();

  const content = input.content?.trim() || null;
  const gifUrl = input.gifUrl?.trim() || null;
  // precisa de texto OU GIF
  if (!content && !gifUrl) return;

  const chapterRef =
    input.scope === "chapter" &&
    input.chapterRef != null &&
    Number.isFinite(input.chapterRef) &&
    input.chapterRef > 0
      ? Math.round(input.chapterRef)
      : null;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    item_id: input.itemId,
    user_id: userId,
    scope: input.scope,
    chapter_ref: chapterRef,
    content,
    gif_url: gifUrl,
    is_public: input.isPublic ?? false,
  });

  revalidatePath(`/books/${input.itemId}`);
}

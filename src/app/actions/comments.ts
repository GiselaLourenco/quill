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

/**
 * Apaga uma anotação minha.
 *
 * O `.eq("user_id", ...)` é redundante com a RLS ("own comments - all"), e é
 * de propósito: se um dia alguém afrouxar a policy, a ação continua não
 * apagando nota dos outros.
 */
export async function excluirComentario(input: {
  id: string;
  itemId: string;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) return { error: "Não foi possível excluir a nota." };

  revalidatePath(`/books/${input.itemId}`);
  // A mesma nota aparece no diário; sem isto ela sobreviveria lá até o cache
  // daquela rota vencer.
  revalidatePath("/estante/diario");
  return { error: null };
}

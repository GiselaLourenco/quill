"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

// Curtir e comentar uma atualização do feed dos amigos (ver src/lib/interacoes.ts).
// O dono do livro vai gravado junto: a RLS confere que é o dono de verdade e
// que quem interage é amigo dele.

async function donoDoLivro(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string) {
  const { data } = await supabase.from("media_items").select("user_id").eq("id", itemId).maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

function revalidar(itemId: string) {
  revalidatePath("/estante");
  revalidatePath(`/books/${itemId}`);
  revalidatePath("/notificacoes");
}

/** Liga/desliga a sua curtida. Devolve se ficou curtido. */
export async function curtirAtualizacao(input: {
  itemId: string;
  chave: string;
}): Promise<{ curtiu: boolean; error: string | null }> {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("interacoes_feed")
    .select("id")
    .eq("item_id", input.itemId)
    .eq("atualizacao", input.chave)
    .eq("user_id", userId)
    .eq("tipo", "curtida")
    .maybeSingle();

  if (existente) {
    const { error } = await supabase.from("interacoes_feed").delete().eq("id", existente.id);
    if (error) return { curtiu: true, error: "Não deu pra descurtir." };
    revalidar(input.itemId);
    return { curtiu: false, error: null };
  }

  const dono = await donoDoLivro(supabase, input.itemId);
  if (!dono) return { curtiu: false, error: "Esse livro não está mais disponível." };

  const { error } = await supabase.from("interacoes_feed").insert({
    item_id: input.itemId,
    dono_id: dono,
    atualizacao: input.chave,
    user_id: userId,
    tipo: "curtida",
  });
  if (error) return { curtiu: false, error: "Não deu pra curtir." };
  revalidar(input.itemId);
  return { curtiu: true, error: null };
}

export async function comentarAtualizacao(input: {
  itemId: string;
  chave: string;
  content: string;
  gifUrl: string | null;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  const content = input.content.trim();
  if (!content && !input.gifUrl) return { error: "Escreva algo ou escolha um GIF." };

  const supabase = await createClient();
  const dono = await donoDoLivro(supabase, input.itemId);
  if (!dono) return { error: "Esse livro não está mais disponível." };

  const { error } = await supabase.from("interacoes_feed").insert({
    item_id: input.itemId,
    dono_id: dono,
    atualizacao: input.chave,
    user_id: userId,
    tipo: "comentario",
    content: content || null,
    gif_url: input.gifUrl,
  });
  if (error) return { error: "Não deu pra comentar. Tente de novo." };
  revalidar(input.itemId);
  return { error: null };
}

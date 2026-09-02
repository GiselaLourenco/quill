"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ehAdmin } from "@/app/actions/admin";
import { paletteIndexForTitle } from "@/lib/covers";

export type LivroImportado = { title: string; creator: string | null };

/** Os mesmos status que o cadastro aceita, menos os que não fazem sentido em lote. */
const STATUS_PERMITIDOS = ["want", "reading", "finished", "recomendado"];

/** Um CSV da Amazon costuma ter centenas de linhas; o teto evita insert gigante. */
const MAXIMO = 500;

/**
 * Importa livros de um CSV da Amazon.
 *
 * Só título e autor: é o que o export da Amazon traz de útil. Páginas e capa
 * ficam de fora de propósito — completá-las exigiria uma busca na Open Library
 * por livro, e 200 livros seriam 200 requisições de ~1s. Cada livro importado
 * pode ser completado depois, abrindo e editando.
 *
 * Admin por enquanto, como pedido: o fluxo ainda não foi usado de verdade e um
 * erro aqui enche a estante de alguém com lixo.
 */
export async function importarLivros(input: {
  livros: LivroImportado[];
  status: string;
}): Promise<{ criados: number; pulados: number; error: string | null }> {
  const userId = await requireUserId();
  if (!(await ehAdmin())) {
    return { criados: 0, pulados: 0, error: "Importação disponível só para admin." };
  }
  if (!STATUS_PERMITIDOS.includes(input.status)) {
    return { criados: 0, pulados: 0, error: "Status inválido." };
  }

  const limpos = input.livros
    .map((l) => ({ title: l.title.trim(), creator: l.creator?.trim() || null }))
    .filter((l) => l.title.length > 0)
    .slice(0, MAXIMO);

  if (limpos.length === 0) {
    return { criados: 0, pulados: 0, error: "Nenhum livro válido no arquivo." };
  }

  const supabase = await createClient();

  // Duplicata é por título, comparado sem caixa: o CSV da Amazon repete livro
  // que você comprou duas vezes, e reimportar não pode dobrar a estante.
  const { data: existentes } = await supabase
    .from("media_items")
    .select("title")
    .eq("user_id", userId);
  const jaTenho = new Set(
    (existentes ?? []).map((l) => (l.title as string).trim().toLowerCase()),
  );

  const novos = limpos.filter((l) => !jaTenho.has(l.title.toLowerCase()));
  const pulados = limpos.length - novos.length;

  if (novos.length === 0) {
    return { criados: 0, pulados, error: null };
  }

  const { error } = await supabase.from("media_items").insert(
    novos.map((l) => ({
      user_id: userId,
      title: l.title,
      creator: l.creator,
      status: input.status,
      cover_kind: "illustrated",
      cover_palette: paletteIndexForTitle(l.title),
    })),
  );

  if (error) {
    console.error("[importar]", error.message);
    return { criados: 0, pulados, error: "Não foi possível importar. Tente de novo." };
  }

  revalidatePath("/estante");
  return { criados: novos.length, pulados, error: null };
}

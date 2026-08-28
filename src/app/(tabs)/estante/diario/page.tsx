import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import DiarioClient from "./diario-client";
import type { EntradaDiario } from "@/lib/types";

function paletteClass(n: number): EntradaDiario["cover_palette"] {
  return (`cover-${[1, 2, 3, 4].includes(n) ? n : 1}`) as "cover-1";
}

export default async function DiarioPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("comments")
    .select("id, item_id, content, scope, is_public, created_at, chapter_ref, media_items!inner(title, cover_palette)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const entradas: EntradaDiario[] = (comments ?? [])
    .filter((c) => c.content)
    .map((c) => {
      const item = Array.isArray(c.media_items) ? c.media_items[0] : c.media_items;
      return {
        id: c.id as string,
        livroId: c.item_id as string,
        livroTitulo: (item?.title as string) ?? "Livro",
        cover_palette: paletteClass(item?.cover_palette as number),
        capitulo: c.chapter_ref != null ? `Cap. ${c.chapter_ref}` : undefined,
        texto: c.content as string,
        data: c.created_at as string,
        publico: Boolean(c.is_public),
        tipo: c.scope === "chapter" ? "capitulo" : "livro",
      };
    });

  return <DiarioClient entradas={entradas} />;
}

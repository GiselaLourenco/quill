import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { FreeReadingSession, type BookOption } from "@/components/free-reading-session";
import { getActiveChallenges } from "@/lib/challenges";
import { posicaoAtualPorItem } from "@/lib/reading-stats";

export default async function LerPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: books }, { data: positions }, activeChallenges] = await Promise.all([
    // Sem filtro de status: a busca de "outro livro da estante" (passo 1 do
    // registro) precisa achar qualquer livro, não só os já "lendo"/"quero ler".
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("item_id, unit_end, created_at")
      .eq("user_id", userId)
      .not("unit_end", "is", null)
      .not("item_id", "is", null),
    getActiveChallenges(supabase, userId),
  ]);

  // Posição atual de cada livro = unit_end da sessão mais recente (não o
  // maior já visto — uma correção pra baixo precisa "pegar").
  const posicaoPorItem = posicaoAtualPorItem(
    (positions ?? []).map((p) => ({
      item_id: p.item_id as string,
      unit_end: p.unit_end as number | null,
      created_at: p.created_at as string,
    })),
  );
  const paginaAtual = new Map(
    [...posicaoPorItem.entries()].map(([id, pos]) => [id, pos.paginas]),
  );

  const bookOptions: BookOption[] = (books ?? []).map((b) => ({
    id: b.id as string,
    title: (b.title as string) ?? "Sem título",
    author: (b.creator as string | null) ?? "",
    cover_kind: (b.cover_kind as string) ?? "illustrated",
    cover_url: (b.cover_url as string | null) ?? null,
    cover_palette: (b.cover_palette as number) ?? 0,
    status: b.status as string,
    paginaAtual: paginaAtual.get(b.id as string) ?? null,
  }));

  return (
    <div className="flex-1">
      <FreeReadingSession books={bookOptions} activeChallenges={activeChallenges} />
    </div>
  );
}

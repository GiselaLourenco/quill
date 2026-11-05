import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { FreeReadingSession, type BookOption } from "@/components/free-reading-session";
import { getActiveChallenges } from "@/lib/challenges";
import { posicaoRegistradaPorItem } from "@/lib/reading-stats";

export default async function LerPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: books }, { data: positions }, activeChallenges] = await Promise.all([
    // Sem filtro de status: a busca de "outro livro da estante" (passo 1 do
    // registro) precisa achar qualquer livro, não só os já "lendo"/"quero ler".
    supabase
      .from("media_items")
      .select("id, title, creator, cover_kind, cover_url, cover_palette, status, total_units, total_chapters")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("item_id, unit_end, chapter_end, percent_end, created_at")
      .eq("user_id", userId)
      .or("unit_end.not.is.null,chapter_end.not.is.null")
      .not("item_id", "is", null),
    getActiveChallenges(supabase, userId),
  ]);

  // Posição atual de cada livro = a da sessão mais recente (não o maior já
  // visto — uma correção pra baixo precisa "pegar"). null = nunca registrada:
  // a primeira sessão pergunta se começou agora ou já vinha lendo.
  const posicaoPorItem = posicaoRegistradaPorItem(
    (positions ?? []).map((p) => ({
      item_id: p.item_id as string,
      unit_end: p.unit_end as number | null,
      chapter_end: p.chapter_end as number | null,
      created_at: p.created_at as string,
    })),
  );

  // Registro por %: o % digitado na sessão mais recente em páginas — se ela
  // foi em %, o livro volta a abrir em % (preferência por livro).
  const percentualPorItem = new Map<string, { pct: number | null; at: string }>();
  for (const p of positions ?? []) {
    if (p.unit_end == null) continue;
    const atual = percentualPorItem.get(p.item_id as string);
    if (!atual || (p.created_at as string) > atual.at) {
      percentualPorItem.set(p.item_id as string, {
        pct: (p.percent_end as number | null) ?? null,
        at: p.created_at as string,
      });
    }
  }

  // Unidade da sessão mais recente: em capítulos, a tela volta a abrir em Caps
  // (mesmo que a sessão também tenha gravado a página estimada).
  const ultimaPorItem = new Map<string, { caps: boolean; at: string }>();
  for (const p of positions ?? []) {
    const atual = ultimaPorItem.get(p.item_id as string);
    if (!atual || (p.created_at as string) > atual.at) {
      ultimaPorItem.set(p.item_id as string, { caps: p.chapter_end != null, at: p.created_at as string });
    }
  }

  const bookOptions: BookOption[] = (books ?? []).map((b) => ({
    id: b.id as string,
    title: (b.title as string) ?? "Sem título",
    author: (b.creator as string | null) ?? "",
    cover_kind: (b.cover_kind as string) ?? "illustrated",
    cover_url: (b.cover_url as string | null) ?? null,
    cover_palette: (b.cover_palette as number) ?? 0,
    status: b.status as string,
    paginaAtual: posicaoPorItem.get(b.id as string)?.pagina ?? null,
    capituloAtual: posicaoPorItem.get(b.id as string)?.capitulo ?? null,
    percentualAtual: percentualPorItem.get(b.id as string)?.pct ?? null,
    totalPaginas: (b.total_units as number | null) ?? null,
    totalCapitulos: (b.total_chapters as number | null) ?? null,
    ultimaEmCapitulos: ultimaPorItem.get(b.id as string)?.caps ?? false,
  }));

  return (
    <div className="flex-1">
      <FreeReadingSession books={bookOptions} activeChallenges={activeChallenges} />
    </div>
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { addDaysToKey, diasDaSessao, localTime } from "@/lib/date-br";
import type { SessaoDoDia } from "@/app/actions/sessions";

/**
 * Sessões de UM livro num dia — alimenta o painel do dia aberto pelo
 * calendário da página do livro. Mesma regra de dia que `sessoesDoDia`
 * (sessão que vira a noite conta nos dois dias).
 */
export async function sessoesDoLivroNoDia(itemId: string, chave: string): Promise<SessaoDoDia[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chave)) return [];
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sessions")
    .select(
      "id, started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, media_items(id, title, creator, cover_kind, cover_url, cover_palette)",
    )
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("cadastro", false)
    .gte("started_at", `${addDaysToKey(chave, -1)}T00:00:00Z`)
    .lt("started_at", `${addDaysToKey(chave, 2)}T00:00:00Z`)
    .order("started_at", { ascending: true });

  return (data ?? [])
    .filter((s) => diasDaSessao(s).includes(chave))
    .map((s) => {
      const livro = Array.isArray(s.media_items) ? s.media_items[0] : s.media_items;
      return {
        id: s.id,
        inicio: localTime(s.started_at),
        fim: s.ended_at ? localTime(s.ended_at) : null,
        minutos: Math.round((s.duration_seconds ?? 0) / 60),
        paginaInicio: s.unit_start,
        paginaFim: s.unit_end,
        capituloInicio: s.chapter_start,
        capituloFim: s.chapter_end,
        tags: s.quality_tags ?? [],
        livro: livro ?? null,
      };
    });
}

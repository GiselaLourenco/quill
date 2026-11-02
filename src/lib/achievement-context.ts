import type { SupabaseClient } from "@supabase/supabase-js";
import { computeStreak, computeMaxSessionPages, type SessionRow } from "@/lib/gamification";
import type { AchievementContext } from "@/lib/achievements";

// Fonte única do que as conquistas (e os recordes "da vida") leem. Antes cada
// tela montava a própria query, e o perfil esqueceu o `item_id` — sem ele
// `computeMaxSessionPages` ignora toda sessão e a "Maratona de 100 páginas"
// nunca desbloqueava. Qualquer critério novo que precise de outra coluna
// entra AQUI, não na página.
const COLUNAS_SESSAO = "started_at, duration_seconds, unit_start, unit_end, item_id";

// O PostgREST corta em 1000 linhas por padrão; recorde e contagem precisam do
// histórico inteiro, então paginamos.
const PAGINA = 1000;

async function todasAsSessoes(supabase: SupabaseClient, userId: string): Promise<SessionRow[]> {
  const sessoes: SessionRow[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("sessions")
      .select(COLUNAS_SESSAO)
      .eq("user_id", userId)
      .order("started_at", { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    sessoes.push(...((data ?? []) as SessionRow[]));
    if (!data || data.length < PAGINA) break;
  }
  return sessoes;
}

/**
 * Histórico completo de sessões (sem janela de data) + o contexto pronto pra
 * `evaluateAchievements`. Ajustes manuais de posição (duração 0) contam como
 * sessão — decisão de produto.
 */
export async function loadAchievementData(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ctx: AchievementContext; sessions: SessionRow[] }> {
  const [sessions, { count: booksFinished, error }] = await Promise.all([
    todasAsSessoes(supabase, userId),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "finished"),
  ]);
  if (error) throw error;

  return {
    sessions,
    ctx: {
      sessionsCount: sessions.length,
      booksFinished: booksFinished ?? 0,
      streakRecord: computeStreak(sessions).record,
      maxSessionPages: computeMaxSessionPages(sessions),
    },
  };
}

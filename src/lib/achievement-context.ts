import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeStreak,
  computeMaxSessionPages,
  weekKey,
  type SessionRow,
} from "@/lib/gamification";
import { localDateKey, localHour } from "@/lib/date-br";
import { ACHIEVEMENTS, type AchievementContext } from "@/lib/achievements";

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
 * Títulos de tudo que está como "terminei". Serve à contagem de livros e às
 * conquistas de livro específico. O validador do avatar usa só esta parte —
 * não precisa do histórico de sessões.
 */
export async function titulosTerminados(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const titulos: string[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("media_items")
      .select("title")
      .eq("user_id", userId)
      .eq("status", "finished")
      .order("created_at", { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    titulos.push(...(data ?? []).map((linha) => linha.title as string));
    if (!data || data.length < PAGINA) break;
  }
  return titulos;
}

type ItemConquista = {
  id: string;
  title: string;
  status: string;
  creator: string | null;
  genre: string | null;
  total_units: number | null;
  started_at: string | null;
  finished_at: string | null;
};

async function todosOsItens(supabase: SupabaseClient, userId: string): Promise<ItemConquista[]> {
  const itens: ItemConquista[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("media_items")
      .select("id, title, status, creator, genre, total_units, started_at, finished_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    itens.push(...((data ?? []) as ItemConquista[]));
    if (!data || data.length < PAGINA) break;
  }
  return itens;
}

/** "Fiction " e "fiction" são o mesmo gênero; vazio não é gênero nenhum. */
function chave(texto: string | null): string | null {
  const t = texto?.trim().toLowerCase();
  return t ? t : null;
}

/** Maior número de dias distintos dentro de um mesmo grupo (semana, mês). */
function maxDiasPorGrupo(dias: string[], grupo: (dia: string) => string): number {
  const porGrupo = new Map<string, number>();
  for (const d of dias) porGrupo.set(grupo(d), (porGrupo.get(grupo(d)) ?? 0) + 1);
  return Math.max(0, ...porGrupo.values());
}

/**
 * Histórico completo de sessões (sem janela de data) + o contexto pronto pra
 * `evaluateAchievements`. Ajustes manuais de posição (duração 0) contam como
 * sessão — decisão de produto. Hora e dia sempre no fuso do Brasil.
 */
export async function loadAchievementData(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ctx: AchievementContext; sessions: SessionRow[] }> {
  const [sessions, itens, { count: cincoEstrelas, error }] = await Promise.all([
    todasAsSessoes(supabase, userId),
    todosOsItens(supabase, userId),
    supabase
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("stars", 5),
  ]);
  if (error) throw error;

  // ---- Sessões ----------------------------------------------------------
  let totalSegundos = 0;
  let totalPages = 0;
  let morningSessions = 0;
  let lateSessions = 0;
  let lateLongSessions = 0;
  let longestSessionMinutes = 0;
  let sessions10min = 0;
  const minutosPorDia = new Map<string, number>();
  for (const s of sessions) {
    const segundos = s.duration_seconds ?? 0;
    const minutos = segundos / 60;
    totalSegundos += segundos;
    if (s.item_id && s.unit_start != null && s.unit_end != null) {
      totalPages += Math.max(0, s.unit_end - s.unit_start);
    }
    const hora = localHour(s.started_at);
    if (hora >= 4 && hora < 8) morningSessions++;
    if (hora >= 23 || hora < 4) lateSessions++;
    if ((hora >= 22 || hora < 4) && minutos >= 30) lateLongSessions++;
    if (minutos >= 10) sessions10min++;
    longestSessionMinutes = Math.max(longestSessionMinutes, Math.floor(minutos));
    const dia = localDateKey(s.started_at);
    minutosPorDia.set(dia, (minutosPorDia.get(dia) ?? 0) + minutos);
  }
  const dias = [...minutosPorDia.keys()];

  // ---- Estante ----------------------------------------------------------
  const terminados = itens.filter((i) => i.status === "finished");
  const finishedTitles = terminados.map((i) => i.title);
  const generos = new Set(terminados.map((i) => chave(i.genre)).filter(Boolean));
  const autores = new Set(terminados.map((i) => chave(i.creator)).filter(Boolean));
  const terminadosPorMes = new Map<string, number>();
  for (const i of terminados) {
    if (!i.finished_at) continue;
    const mes = i.finished_at.slice(0, 7);
    terminadosPorMes.set(mes, (terminadosPorMes.get(mes) ?? 0) + 1);
  }
  // Terminou um e começou OUTRO no mesmo dia.
  const finishThenStart = terminados.filter(
    (t) =>
      t.finished_at &&
      itens.some((o) => o.id !== t.id && o.started_at === t.finished_at),
  ).length;

  return {
    sessions,
    ctx: {
      sessionsCount: sessions.length,
      booksFinished: terminados.length,
      streakRecord: computeStreak(sessions).record,
      maxSessionPages: computeMaxSessionPages(sessions),
      totalMinutes: Math.floor(totalSegundos / 60),
      totalHours: Math.floor(totalSegundos / 3600),
      totalPages,
      morningSessions,
      lateSessions,
      lateLongSessions,
      longestSessionMinutes,
      maxDayMinutes: Math.floor(Math.max(0, ...minutosPorDia.values())),
      sessions10min,
      maxDaysInWeek: maxDiasPorGrupo(dias, (d) => weekKey(`${d}T12:00:00Z`)),
      maxDaysInMonth: maxDiasPorGrupo(dias, (d) => d.slice(0, 7)),
      daysRead: dias.length,
      maxFinishedInMonth: Math.max(0, ...terminadosPorMes.values()),
      booksStarted: itens.filter((i) => i.status !== "want").length,
      finishThenStart,
      distinctGenres: generos.size,
      distinctAuthors: autores.size,
      bigBooksFinished: terminados.filter((i) => (i.total_units ?? 0) > 500).length,
      fiveStarRatings: cincoEstrelas ?? 0,
      finishedTitles,
    },
  };
}

/**
 * Grava o momento em que cada conquista foi vista feita pela primeira vez e
 * devolve as datas (chave → unlocked_at). Quem fez antes desta tela existir
 * ganha a data do primeiro acesso.
 *
 * As de livro específico ficam de fora: a linha delas vira notificação, e
 * só é gravada ao terminar o livro (`registrarConquistaDeLivro`).
 */
export async function datasDeDesbloqueio(
  supabase: SupabaseClient,
  userId: string,
  feitas: string[],
): Promise<Record<string, string>> {
  const gravar = feitas.filter(
    (k) => ACHIEVEMENTS.find((a) => a.key === k)?.criteria.type === "metric",
  );
  if (gravar.length > 0) {
    await supabase.from("user_achievements").upsert(
      gravar.map((achievement_key) => ({ user_id: userId, achievement_key })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
    );
  }
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", userId);
  return Object.fromEntries(
    (data ?? []).map((r) => [r.achievement_key as string, r.unlocked_at as string]),
  );
}

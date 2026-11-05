import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeStreak,
  computeMaxSessionPages,
  weekKey,
  type SessionRow,
} from "@/lib/gamification";
import { localDateKey, localHour, segundosPorDiaDaSessao } from "@/lib/date-br";
import { paginasDeLivrosTerminados } from "@/lib/reading-stats";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementContext } from "@/lib/achievements";

// Fonte única do que as conquistas (e os recordes "da vida") leem. Antes cada
// tela montava a própria query, e o perfil esqueceu o `item_id` — sem ele
// `computeMaxSessionPages` ignora toda sessão e a "Maratona de 100 páginas"
// nunca desbloqueava. Qualquer critério novo que precise de outra coluna
// entra AQUI, não na página.
const COLUNAS_SESSAO = "started_at, ended_at, duration_seconds, unit_start, unit_end, item_id";

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
      // Cadastro da estante não é leitura: não conta pra sequência, contagem
      // de sessões nem recorde de páginas.
      .eq("cadastro", false)
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

/**
 * Leituras anteriores de livros relidos, como itens "terminados" a mais: cada
 * término conta no ano em que aconteceu (livros terminados, gêneros, meses
 * seguidos…), mesmo com o livro de volta em "lendo".
 */
async function leiturasAnteriores(
  supabase: SupabaseClient,
  userId: string,
  itens: ItemConquista[],
): Promise<ItemConquista[]> {
  const { data } = await supabase
    .from("past_readings")
    .select("item_id, started_at, finished_at")
    .eq("user_id", userId);
  const porId = new Map(itens.map((i) => [i.id, i]));
  return (data ?? []).flatMap((p) => {
    const item = porId.get(p.item_id as string);
    return item
      ? [
          {
            ...item,
            status: "finished",
            started_at: p.started_at as string | null,
            finished_at: p.finished_at as string | null,
          },
        ]
      : [];
  });
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

/** Maior sequência de meses seguidos ("2026-03", "2026-04"...) na lista. */
function maiorSequenciaDeMeses(meses: string[]): number {
  const indices = [...new Set(meses)]
    .map((m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)))
    .sort((a, b) => a - b);
  let maior = 0;
  let atual = 0;
  indices.forEach((n, i) => {
    atual = i > 0 && n === indices[i - 1] + 1 ? atual + 1 : 1;
    maior = Math.max(maior, atual);
  });
  return maior;
}

/** Ano (fuso do Brasil) em que estamos. */
export function anoAtual(): number {
  return Number(localDateKey(new Date()).slice(0, 4));
}

const anoDeData = (data: string | null) => (data ? Number(data.slice(0, 4)) : null);

/**
 * O contexto das conquistas a partir dos dados crus. Com `ano`, só entra o
 * que aconteceu naquele ano — a coleção zera em janeiro. Livro sem data de
 * término (ou de início) não conta em ano nenhum, e sequência não atravessa
 * a virada (decisões da Gisela, 2026-11-02).
 */
function calcularContexto(
  todasSessoes: SessionRow[],
  itens: ItemConquista[],
  cincoEstrelas: string[],
  ano: number | null,
): AchievementContext {
  const noAno = (data: string | null) => ano === null || anoDeData(data) === ano;
  const sessions =
    ano === null
      ? todasSessoes
      : todasSessoes.filter((s) => anoDeData(localDateKey(s.started_at)) === ano);

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
    // Sessão que vira a noite conta nos dois dias (tempo repartido).
    for (const [dia, seg] of segundosPorDiaDaSessao(s)) {
      if (ano !== null && anoDeData(dia) !== ano) continue;
      minutosPorDia.set(dia, (minutosPorDia.get(dia) ?? 0) + seg / 60);
    }
  }
  const dias = [...minutosPorDia.keys()];

  // Quando começou cada livro: o "lendo" gravado ou, sem ele, a primeira
  // sessão nele — quase ninguém tem `started_at` (livro criado direto como
  // lendo não gravava), e sem isso "começar" quase nunca contava.
  const primeiraSessao = new Map<string, string>();
  for (const s of todasSessoes) {
    if (s.item_id && !primeiraSessao.has(s.item_id)) {
      primeiraSessao.set(s.item_id, localDateKey(s.started_at));
    }
  }
  const comecouEm = (i: ItemConquista) => i.started_at ?? primeiraSessao.get(i.id) ?? null;

  // ---- Estante ----------------------------------------------------------
  const terminados = itens.filter(
    (i) => i.status === "finished" && (ano === null || (i.finished_at && noAno(i.finished_at))),
  );
  // Livro terminado no período soma as páginas que as sessões não cobriram
  // (ex.: cadastrado já lido, com data). As sessões são do histórico todo,
  // pra descontar o que já foi lido no app em qualquer ano.
  // Num livro relido, cada leitura desconta só as sessões do próprio período.
  totalPages += paginasDeLivrosTerminados(
    terminados,
    todasSessoes,
    itens.filter((i) => i.status === "finished"),
  );
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
      itens.some((o) => o.id !== t.id && comecouEm(o) === t.finished_at),
  ).length;

  return {
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
    finishedMonthsStreak: maiorSequenciaDeMeses([...terminadosPorMes.keys()]),
    booksStarted: itens.filter((i) => {
      const inicio = comecouEm(i);
      if (ano !== null) return inicio !== null && noAno(inicio);
      return inicio !== null || ["reading", "finished", "abandoned"].includes(i.status);
    }).length,
    finishThenStart,
    distinctGenres: generos.size,
    distinctAuthors: autores.size,
    bigBooksFinished: terminados.filter((i) => (i.total_units ?? 0) > 500).length,
    fiveStarRatings: cincoEstrelas.filter((c) => ano === null || anoDeData(localDateKey(c)) === ano)
      .length,
    finishedTitles: terminados.map((i) => i.title),
  };
}

export type DadosConquistas = {
  /** O histórico inteiro — recordes "da vida" e fotos de perfil liberadas. */
  ctx: AchievementContext;
  sessions: SessionRow[];
  /** A coleção daquele ano (a que zera em janeiro). */
  doAno: (ano: number) => AchievementContext;
  /** Anos em que algo foi conquistado, do mais recente pro mais antigo. */
  anosComConquista: number[];
};

/**
 * Histórico completo de sessões e da estante + os contextos prontos pra
 * `evaluateAchievements`. Ajustes manuais de posição (duração 0) contam como
 * sessão — decisão de produto. Hora e dia sempre no fuso do Brasil.
 */
export async function loadAchievementData(
  supabase: SupabaseClient,
  userId: string,
): Promise<DadosConquistas> {
  const [sessions, itensAtuais, { data: notas, error }] = await Promise.all([
    todasAsSessoes(supabase, userId),
    todosOsItens(supabase, userId),
    supabase.from("ratings").select("created_at").eq("user_id", userId).eq("stars", 5),
  ]);
  if (error) throw error;
  const itens = [...itensAtuais, ...(await leiturasAnteriores(supabase, userId, itensAtuais))];
  const cincoEstrelas = (notas ?? []).map((n) => n.created_at as string);

  const cache = new Map<number, AchievementContext>();
  const doAno = (ano: number) => {
    if (!cache.has(ano)) cache.set(ano, calcularContexto(sessions, itens, cincoEstrelas, ano));
    return cache.get(ano)!;
  };

  const anos = new Set<number>();
  for (const s of sessions) anos.add(Number(localDateKey(s.started_at).slice(0, 4)));
  for (const i of itens) {
    for (const d of [i.finished_at, i.started_at]) if (d) anos.add(Number(d.slice(0, 4)));
  }
  for (const c of cincoEstrelas) anos.add(Number(localDateKey(c).slice(0, 4)));
  const anosComConquista = [...anos]
    .filter((ano) =>
      evaluateAchievements(doAno(ano)).some((e) => e.met && e.achievement.criteria.type === "metric"),
    )
    .sort((a, b) => b - a);

  return {
    sessions,
    ctx: calcularContexto(sessions, itens, cincoEstrelas, null),
    doAno,
    anosComConquista,
  };
}

/**
 * Datas de desbloqueio das conquistas do `ano` (chave → unlocked_at).
 *
 * No ano corrente, grava o momento em que cada conquista foi vista feita pela
 * primeira vez — com o ano na chave (`streak_3:2027`), já que a coleção zera
 * em janeiro e a mesma conquista volta a ser feita. Linhas antigas, sem ano,
 * valem pro ano da própria data. Anos passados só leem: gravar agora daria a
 * data de hoje a algo feito lá atrás.
 *
 * As de livro específico ficam de fora: a linha delas vira notificação, e
 * só é gravada ao terminar o livro (`registrarConquistaDeLivro`).
 */
export async function datasDeDesbloqueio(
  supabase: SupabaseClient,
  userId: string,
  feitas: string[],
  ano: number,
): Promise<Record<string, string>> {
  const gravar = feitas.filter(
    (k) => ACHIEVEMENTS.find((a) => a.key === k)?.criteria.type === "metric",
  );
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", userId);
  const datas: Record<string, string> = {};
  for (const r of data ?? []) {
    const [key, anoDaChave] = (r.achievement_key as string).split(":");
    const quando = r.unlocked_at as string;
    const anoDaLinha = anoDaChave ? Number(anoDaChave) : Number(localDateKey(quando).slice(0, 4));
    // As de livro específico valem pra vida toda: a data vale em qualquer ano.
    const daVida =
      ACHIEVEMENTS.find((a) => a.key === key)?.criteria.type === "specific_book";
    if ((daVida || anoDaLinha === ano) && !(key in datas && anoDaChave === undefined)) {
      datas[key] = quando;
    }
  }

  const novas = ano === anoAtual() ? gravar.filter((k) => !(k in datas)) : [];
  if (novas.length > 0) {
    const agora = new Date().toISOString();
    await supabase.from("user_achievements").upsert(
      novas.map((k) => ({ user_id: userId, achievement_key: `${k}:${ano}` })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
    );
    for (const k of novas) datas[k] = agora;
  }
  return datas;
}

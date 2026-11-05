"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId, userIdOuNull } from "@/lib/supabase/auth";
import { updateItemStatus } from "@/app/actions/media-items";
import { addDaysToKey, diasDaSessao, localTime, todayLocalDateKey } from "@/lib/date-br";

export type SessionUnit = "chapters" | "pages";

// Ao bater o total de páginas/capítulos cadastrado, o livro vira "terminei"
// sozinho — ninguém lembra de voltar na página do livro só pra trocar o
// status depois de fechar a última página.
async function talvezMarcarTerminado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  unidade: SessionUnit,
  valor: number,
) {
  const { data: item } = await supabase
    .from("media_items")
    .select("status, total_units, total_chapters")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.status === "finished") return;
  const total = unidade === "pages" ? item.total_units : item.total_chapters;
  if (total != null && valor >= total) {
    await updateItemStatus(itemId, "finished");
  }
}

// Passo 1 do fluxo (modal essencial): grava a sessão e devolve o id pro
// pós-sessão do cliente — sem redirect, os extras vêm depois (opcionais).
//
// A pessoa informa onde PAROU (página/capítulo atual), não quanto leu: o
// início é a posição anterior do livro (a mais recente por `created_at`) e a
// métrica é fim − início, como sempre foi. Posição menor que a anterior
// corrige (conta 0); a tela já pediu confirmação. `paginaAntes`/`capituloAntes`
// = "já vinha lendo, estava na X" na primeira sessão do livro: vira uma
// sessão de cadastro (fora das métricas) antes desta.
//
// Registro por %: `pagina`/`paginaAntes` chegam já convertidas pelo cliente
// (a mesma conta que a tela mostrou); `percentual`/`percentualAntes` guardam o
// que a pessoa digitou, pra tela voltar a abrir em % e pra recalcular as
// páginas se o total do livro mudar.
export async function createSession(input: {
  itemId: string | null;
  startedAt: string;
  durationSeconds: number;
  pagina?: number | null;
  capitulo?: number | null;
  paginaAntes?: number | null;
  capituloAntes?: number | null;
  percentual?: number | null;
  percentualAntes?: number | null;
  tags: string[];
}): Promise<{ sessionId: string | null; error: string | null }> {
  // Sem redirect: a sessão de leitura (tempo, livro, desafios) continua na
  // tela e no aparelho — dá pra entrar de novo e salvar sem perder nada.
  const userId = await userIdOuNull();
  if (!userId) {
    return {
      sessionId: null,
      error: "Seu login expirou. Entre de novo em outra aba e toque em salvar — a sessão continua guardada aqui.",
    };
  }
  const supabase = await createClient();

  const itemId = input.itemId || null;
  const numero = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  const pagina = numero(input.pagina);
  const capitulo = numero(input.capitulo);
  const pct = (n: number | null | undefined) => {
    const v = numero(n);
    return v == null ? null : Math.min(100, v);
  };
  const percentual = pagina != null ? pct(input.percentual) : null;

  let posicao: {
    unit_start: number | null;
    unit_end: number | null;
    chapter_start: number | null;
    chapter_end: number | null;
    percent_start?: number | null;
    percent_end?: number | null;
  } = { unit_start: null, unit_end: null, chapter_start: null, chapter_end: null };
  const cadastro: {
    unit_start?: number;
    unit_end?: number;
    chapter_start?: number;
    chapter_end?: number;
    percent_start?: number;
    percent_end?: number;
  } = {};

  // Posição só ancora quando há livro vinculado — sem vínculo, a sessão vale
  // pelo tempo (mesma regra de antes).
  if (itemId && (pagina != null || capitulo != null)) {
    const { data: livro } = await supabase
      .from("media_items")
      .select("total_units, total_chapters")
      .eq("id", itemId)
      .maybeSingle();
    // A posição nunca passa do total cadastrado (no desafio também).
    const limite = (total: number | null | undefined, valor: number) =>
      total != null && total > 0 ? Math.min(valor, total) : valor;

    const ultima = async (campo: "unit_end" | "chapter_end") => {
      const { data } = await supabase
        .from("sessions")
        .select(campo)
        .eq("item_id", itemId)
        .not(campo, "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return ((data as Record<string, number> | null)?.[campo] ?? null) as number | null;
    };

    if (pagina != null) {
      let inicio = await ultima("unit_end");
      const antes = numero(input.paginaAntes);
      if (inicio == null && antes != null && antes > 0) {
        inicio = limite(livro?.total_units, antes);
        cadastro.unit_start = 0;
        cadastro.unit_end = inicio;
      }
      posicao = { ...posicao, unit_start: inicio ?? 0, unit_end: limite(livro?.total_units, pagina) };

      const total = livro?.total_units;
      if (percentual != null && total != null && total > 0) {
        // De onde partiu, em %: o digitado na sessão anterior, se foi em %;
        // senão, a página anterior convertida.
        let pctInicio = 0;
        const pctAntes = pct(input.percentualAntes);
        if (cadastro.unit_end != null) {
          pctInicio = pctAntes ?? Math.min(100, Math.round((cadastro.unit_end / total) * 100));
          cadastro.percent_start = 0;
          cadastro.percent_end = pctInicio;
        } else if (inicio != null) {
          const { data: ant } = await supabase
            .from("sessions")
            .select("percent_end")
            .eq("item_id", itemId)
            .not("unit_end", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          pctInicio =
            (ant?.percent_end as number | null) ?? Math.min(100, Math.round((inicio / total) * 100));
        }
        posicao = { ...posicao, percent_start: pctInicio, percent_end: percentual };
      }
    }
    if (capitulo != null) {
      let inicio = await ultima("chapter_end");
      const antes = numero(input.capituloAntes);
      if (inicio == null && antes != null && antes > 0) {
        inicio = limite(livro?.total_chapters, antes);
        cadastro.chapter_start = 0;
        cadastro.chapter_end = inicio;
      }
      posicao = {
        ...posicao,
        chapter_start: inicio ?? 0,
        chapter_end: limite(livro?.total_chapters, capitulo),
      };
    }
  }

  // "Já vinha lendo": a posição de antes entra primeiro, como cadastro — vale
  // pra posição do livro, não pras métricas.
  if (itemId && Object.keys(cadastro).length > 0) {
    await supabase.from("sessions").insert({
      item_id: itemId,
      user_id: userId,
      started_at: input.startedAt,
      ended_at: input.startedAt,
      duration_seconds: 0,
      cadastro: true,
      ...cadastro,
    });
  }

  const { data: newSession, error } = await supabase
    .from("sessions")
    .insert({
      item_id: itemId,
      user_id: userId,
      started_at: input.startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: input.durationSeconds,
      ...posicao,
      quality_tags: input.tags,
    })
    .select("id")
    .single();

  if (error || !newSession) {
    return { sessionId: null, error: "Não foi possível salvar a sessão." };
  }

  if (itemId) {
    if (posicao.unit_end != null) await talvezMarcarTerminado(supabase, itemId, "pages", posicao.unit_end);
    if (posicao.chapter_end != null) {
      await talvezMarcarTerminado(supabase, itemId, "chapters", posicao.chapter_end);
    }
  }

  revalidatePath("/");
  if (itemId) {
    revalidatePath(`/books/${itemId}`);
    // A posição nova (e o "terminei" automático) mudam o % e o "Páginas" da estante.
    revalidatePath("/estante");
  }
  return { sessionId: newSession.id, error: null };
}

// Corrige a posição atual direto na página do livro (sem passar pela tela de
// Ler) — grava como uma sessão de duração zero, pra continuar valendo pro
// mesmo cálculo de "página/capítulo atual" (maior unit_end/chapter_end) que
// as estatísticas e a % da estante já usam. Mudar a página não é leitura:
// sai marcada `cadastro`, fora de todas as métricas (sessões, dias lidos,
// sequência, recordes). As páginas voltam a contar quando o livro termina
// (`paginasDeLivrosTerminados`).
export async function atualizarPosicaoLeitura(input: {
  itemId: string;
  unidade: SessionUnit;
  valor: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!Number.isFinite(input.valor) || input.valor < 0) {
    return { error: "Número inválido." };
  }
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select("user_id")
    .eq("id", input.itemId)
    .maybeSingle();
  if (!item || item.user_id !== userId) {
    return { error: "Livro não encontrado." };
  }

  const valor = Math.round(input.valor);
  const campo = input.unidade === "pages" ? "unit_end" : "chapter_end";
  // Ordenado por `created_at` (mais recente), não pelo próprio valor — senão
  // uma correção pra baixo nunca "pega": o maior valor já visto continuaria
  // sendo o ponto de partida pra sempre.
  const { data: last } = await supabase
    .from("sessions")
    .select(campo)
    .eq("item_id", input.itemId)
    .not(campo, "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const anterior = (last as Record<string, number> | null)?.[campo] ?? 0;

  const posicao =
    input.unidade === "pages"
      ? { unit_start: anterior, unit_end: valor }
      : { chapter_start: anterior, chapter_end: valor };

  const agora = new Date().toISOString();
  const { error } = await supabase.from("sessions").insert({
    item_id: input.itemId,
    user_id: userId,
    started_at: agora,
    ended_at: agora,
    duration_seconds: 0,
    cadastro: true,
    ...posicao,
  });

  if (error) return { error: "Não foi possível atualizar a posição." };

  await talvezMarcarTerminado(supabase, input.itemId, input.unidade, valor);

  revalidatePath(`/books/${input.itemId}`);
  revalidatePath("/estante");
  revalidatePath("/");
  return { error: null };
}

// Livro sem total cadastrado: o editor de posição não tem "de quanto"
// comparar, então esta ação grava os dois de uma vez — o total (campo do
// livro) e a posição atual (sessão de duração zero, igual à função acima).
export async function definirTotalEPosicao(input: {
  itemId: string;
  unidade: SessionUnit;
  total: number;
  atual: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { error: "Informe o total." };
  }
  if (!Number.isFinite(input.atual) || input.atual < 0) {
    return { error: "Número inválido." };
  }

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select("user_id")
    .eq("id", input.itemId)
    .maybeSingle();
  if (!item || item.user_id !== userId) {
    return { error: "Livro não encontrado." };
  }

  const campoTotal = input.unidade === "pages" ? "total_units" : "total_chapters";
  const { error: erroTotal } = await supabase
    .from("media_items")
    .update({ [campoTotal]: Math.round(input.total) })
    .eq("id", input.itemId);
  if (erroTotal) return { error: "Não foi possível salvar o total." };

  const atual = Math.round(input.atual);
  const totalNum = Math.round(input.total);
  if (atual > 0) {
    const posicao =
      input.unidade === "pages"
        ? { unit_start: 0, unit_end: atual }
        : { chapter_start: 0, chapter_end: atual };
    const agora = new Date().toISOString();
    await supabase.from("sessions").insert({
      item_id: input.itemId,
      user_id: userId,
      started_at: agora,
      ended_at: agora,
      duration_seconds: 0,
      cadastro: true,
      ...posicao,
    });
    if (atual >= totalNum) await updateItemStatus(input.itemId, "finished");
  }

  revalidatePath(`/books/${input.itemId}`);
  revalidatePath("/estante");
  revalidatePath("/");
  return { error: null };
}

// Pós-sessão: publica o registro nos desafios marcados (multi, pré-selecionados
// no cliente).
export async function publishSession(input: {
  sessionId: string;
  itemId: string | null;
  groupIds: string[];
  note: string | null;
  /** Comentário diferente por desafio (aba Ler); sem entrada, vale `note`. */
  notasPorGrupo?: Record<string, string | null>;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const note = input.note?.trim() || null;
  if (input.groupIds.length > 0) {
    // Sessão que terminou o livro: o check-in conta no desafio "Livros
    // terminados" — só se o término caiu dentro do período do desafio (um
    // livro terminado antes, relido agora, não vale ponto).
    let terminadoEm: string | null = null;
    if (input.itemId) {
      const { data: item } = await supabase
        .from("media_items")
        .select("status, finished_at")
        .eq("id", input.itemId)
        .maybeSingle();
      if (item?.status === "finished") terminadoEm = (item.finished_at as string | null) ?? todayLocalDateKey();
    }
    const inicioPorGrupo = new Map<string, string | null>();
    if (terminadoEm) {
      const { data: grupos } = await supabase
        .from("groups")
        .select("id, starts_at")
        .in("id", input.groupIds);
      for (const g of grupos ?? []) inicioPorGrupo.set(g.id as string, (g.starts_at as string | null) ?? null);
    }
    const livroTerminadoNo = (groupId: string) => {
      if (!terminadoEm || !input.itemId) return null;
      const inicio = inicioPorGrupo.get(groupId);
      return !inicio || terminadoEm >= inicio ? input.itemId : null;
    };
    await supabase.from("challenge_checkins").insert(
      input.groupIds.map((groupId) => ({
        group_id: groupId,
        session_id: input.sessionId,
        user_id: userId,
        finished_item_id: livroTerminadoNo(groupId),
        note:
          input.notasPorGrupo && groupId in input.notasPorGrupo
            ? input.notasPorGrupo[groupId]?.trim() || null
            : note,
      })),
    );
    for (const groupId of input.groupIds) revalidatePath(`/juntos/${groupId}`);
  }

  revalidatePath("/");
}

// Pós-sessão: "Pra não esquecer" — o texto vira comentário na página do
// livro, com visibilidade escolhida (só eu = padrão · amigos).
export async function saveSessionMemory(input: {
  itemId: string;
  text: string | null;
  isPublic: boolean;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const text = input.text?.trim() || null;
  if (!text) return;

  await supabase.from("comments").insert({
    item_id: input.itemId,
    user_id: userId,
    scope: "item",
    content: text,
    is_public: input.isPublic,
  });

  revalidatePath(`/books/${input.itemId}`);
}

export type SessaoDoDia = {
  id: string;
  inicio: string;
  fim: string | null;
  minutos: number;
  paginaInicio: number | null;
  paginaFim: number | null;
  capituloInicio: number | null;
  capituloFim: number | null;
  tags: string[];
  livro: {
    id: string;
    title: string;
    creator: string | null;
    cover_kind: string;
    cover_url: string | null;
    cover_palette: number;
  } | null;
};

// Sessões de um dia (chave YYYY-MM-DD no fuso do Brasil), pro painel que abre
// ao tocar num dia do calendário da home. Busca uma janela UTC folgada e filtra
// pelo dia local — a mesma régua que o gráfico usa pra somar os minutos.
export async function sessoesDoDia(chave: string): Promise<SessaoDoDia[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chave)) return [];
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sessions")
    .select(
      "id, started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, media_items(id, title, creator, cover_kind, cover_url, cover_palette)",
    )
    .eq("user_id", userId)
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

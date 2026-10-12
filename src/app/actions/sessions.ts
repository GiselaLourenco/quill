"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { updateItemStatus } from "@/app/actions/media-items";

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
export async function createSession(input: {
  itemId: string | null;
  startedAt: string;
  durationSeconds: number;
  unit: SessionUnit;
  quantity: number | null;
  tags: string[];
}): Promise<{ sessionId: string | null; error: string | null }> {
  const userId = await requireUserId();
  const supabase = await createClient();

  const itemId = input.itemId || null;
  const quantity =
    input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
      ? Math.round(input.quantity)
      : null;

  let unitStart: number | null = null;
  let unitEnd: number | null = null;
  let chapterStart: number | null = null;
  let chapterEnd: number | null = null;

  // Quantidade só ancora numa posição de leitura quando há livro vinculado —
  // sem vínculo, a sessão vale pelo tempo (mesma regra de antes).
  if (itemId && quantity != null) {
    if (input.unit === "pages") {
      const { data: last } = await supabase
        .from("sessions")
        .select("unit_end")
        .eq("item_id", itemId)
        .not("unit_end", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const start = last?.unit_end ?? 0;
      unitStart = start;
      unitEnd = start + quantity;
    } else {
      const { data: last } = await supabase
        .from("sessions")
        .select("chapter_end")
        .eq("item_id", itemId)
        .not("chapter_end", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const start = last?.chapter_end ?? 0;
      chapterStart = start;
      chapterEnd = start + quantity;
    }
  }

  const { data: newSession, error } = await supabase
    .from("sessions")
    .insert({
      item_id: itemId,
      user_id: userId,
      started_at: input.startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: input.durationSeconds,
      unit_start: unitStart,
      unit_end: unitEnd,
      chapter_start: chapterStart,
      chapter_end: chapterEnd,
      quality_tags: input.tags,
    })
    .select("id")
    .single();

  if (error || !newSession) {
    return { sessionId: null, error: "Não foi possível salvar a sessão." };
  }

  if (itemId) {
    const valorFinal = input.unit === "pages" ? unitEnd : chapterEnd;
    if (valorFinal != null) await talvezMarcarTerminado(supabase, itemId, input.unit, valorFinal);
  }

  revalidatePath("/");
  if (itemId) revalidatePath(`/books/${itemId}`);
  return { sessionId: newSession.id, error: null };
}

// Corrige a posição atual direto na página do livro (sem passar pela tela de
// Ler) — grava como uma sessão de duração zero, pra continuar valendo pro
// mesmo cálculo de "página/capítulo atual" (maior unit_end/chapter_end) que
// as estatísticas e a % da estante já usam.
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
// no cliente). `pagesExtra` cobre o caso "marquei capítulos, desafio pontua
// páginas" — completa a posição de páginas da mesma sessão.
export async function publishSession(input: {
  sessionId: string;
  itemId: string | null;
  groupIds: string[];
  note: string | null;
  pagesExtra: number | null;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  if (
    input.pagesExtra != null &&
    Number.isFinite(input.pagesExtra) &&
    input.pagesExtra > 0 &&
    input.itemId
  ) {
    const { data: last } = await supabase
      .from("sessions")
      .select("unit_end")
      .eq("item_id", input.itemId)
      .not("unit_end", "is", null)
      .neq("id", input.sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const start = last?.unit_end ?? 0;
    const unitEnd = start + Math.round(input.pagesExtra);
    await supabase
      .from("sessions")
      .update({ unit_start: start, unit_end: unitEnd })
      .eq("id", input.sessionId)
      .eq("user_id", userId);
    await talvezMarcarTerminado(supabase, input.itemId, "pages", unitEnd);
  }

  const note = input.note?.trim() || null;
  if (input.groupIds.length > 0) {
    await supabase.from("challenge_checkins").insert(
      input.groupIds.map((groupId) => ({
        group_id: groupId,
        session_id: input.sessionId,
        user_id: userId,
        note,
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

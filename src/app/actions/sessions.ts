"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export type SessionUnit = "chapters" | "pages";

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
        .order("unit_end", { ascending: false })
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
        .order("chapter_end", { ascending: false })
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

  revalidatePath("/");
  if (itemId) revalidatePath(`/books/${itemId}`);
  return { sessionId: newSession.id, error: null };
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
      .order("unit_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    const start = last?.unit_end ?? 0;
    await supabase
      .from("sessions")
      .update({ unit_start: start, unit_end: start + Math.round(input.pagesExtra) })
      .eq("id", input.sessionId)
      .eq("user_id", userId);
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

// Pós-sessão: "Pra não esquecer" — texto/foto viram comentário/highlight na
// página do livro, com visibilidade escolhida (só eu = padrão · amigos).
export async function saveSessionMemory(input: {
  itemId: string;
  text: string | null;
  imagePath: string | null;
  isPublic: boolean;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const text = input.text?.trim() || null;
  if (!text && !input.imagePath) return;

  if (input.imagePath) {
    await supabase.from("highlights").insert({
      item_id: input.itemId,
      user_id: userId,
      image_url: input.imagePath, // caminho no bucket privado "highlights"
      note: text,
      is_public: input.isPublic,
    });
  } else {
    await supabase.from("comments").insert({
      item_id: input.itemId,
      user_id: userId,
      scope: "item",
      content: text,
      is_public: input.isPublic,
    });
  }

  revalidatePath(`/books/${input.itemId}`);
}

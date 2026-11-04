import type { SupabaseClient } from "@supabase/supabase-js";
import { diasDaSessao, todayLocalDateKey } from "@/lib/date-br";

export type ActiveChallenge = {
  id: string;
  name: string;
  scoring_metric: string;
};

// Desafios (format='challenge') dos quais o usuário é membro e que estão
// dentro do período — usado pro bloco "publicar nos desafios" do pós-sessão.
export async function getActiveChallenges(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveChallenge[]> {
  const today = todayLocalDateKey();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups!inner(id, name, format, starts_at, ends_at, scoring_metric)")
    .eq("user_id", userId);

  type GroupRow = {
    id: string;
    name: string;
      format: string;
    starts_at: string | null;
    ends_at: string | null;
    scoring_metric: string | null;
  };

  return ((memberships ?? []) as unknown as { groups: GroupRow }[])
    .map((m) => m.groups)
    .filter(
      (g) =>
        g &&
        g.format === "challenge" &&
        (!g.starts_at || g.starts_at <= today) &&
        (!g.ends_at || g.ends_at >= today),
    )
    .map((g) => ({
      id: g.id,
      name: g.name,
      scoring_metric: g.scoring_metric ?? "active_days",
    }));
}

export type ScoringMetric =
  | "pages"
  | "active_days"
  | "check_ins"
  | "chapters"
  | "minutes";

export const SCORING_METRIC_OPTIONS: { value: ScoringMetric; label: string }[] = [
  { value: "pages", label: "Páginas" },
  { value: "active_days", label: "Dias ativos" },
  { value: "check_ins", label: "Livros terminados" },
  { value: "chapters", label: "Capítulos" },
  { value: "minutes", label: "Minutos" },
];

export const SCORING_METRIC_UNIT: Record<ScoringMetric, string> = {
  pages: "pág",
  active_days: "dias",
  check_ins: "livros",
  chapters: "cap",
  minutes: "min",
};

export type CheckinForScoring = {
  user_id: string;
  /** Livro terminado com esse check-in (métrica "Livros terminados"). */
  finished_item_id?: string | null;
  session: {
    started_at: string;
    ended_at?: string | null;
    duration_seconds: number | null;
    unit_start: number | null;
    unit_end: number | null;
    chapter_start: number | null;
    chapter_end: number | null;
  } | null;
};

export function computeScores(
  checkins: CheckinForScoring[],
  metric: ScoringMetric,
  /** Período do desafio (YYYY-MM-DD): dia de madrugada fora dele não conta. */
  periodo?: { inicio: string | null; fim: string | null },
): Map<string, number> {
  const scores = new Map<string, number>();
  const daysByUser = new Map<string, Set<string>>();
  const booksByUser = new Map<string, Set<string>>();

  for (const c of checkins) {
    const uid = c.user_id;

    // "Livros terminados" (valor interno `check_ins`): livros distintos que a
    // pessoa terminou — não um ponto por check-in.
    if (metric === "check_ins") {
      if (!booksByUser.has(uid)) booksByUser.set(uid, new Set());
      if (c.finished_item_id) booksByUser.get(uid)!.add(c.finished_item_id);
      continue;
    }

    if (!c.session) continue;

    if (metric === "active_days") {
      // Sessão que vira a noite (≥ 5 min depois da meia-noite) vale 2 dias;
      // vários check-ins no mesmo dia valem 1.
      if (!daysByUser.has(uid)) daysByUser.set(uid, new Set());
      for (const day of diasDaSessao(c.session)) {
        if (periodo?.inicio && day < periodo.inicio) continue;
        if (periodo?.fim && day > periodo.fim) continue;
        daysByUser.get(uid)!.add(day);
      }
      continue;
    }

    let delta = 0;
    if (metric === "pages") {
      if (c.session.unit_start != null && c.session.unit_end != null) {
        delta = Math.max(0, c.session.unit_end - c.session.unit_start);
      }
    } else if (metric === "minutes") {
      delta = (c.session.duration_seconds ?? 0) / 60;
    } else if (metric === "chapters") {
      if (c.session.chapter_start != null && c.session.chapter_end != null) {
        delta = Math.max(0, c.session.chapter_end - c.session.chapter_start);
      }
    }
    scores.set(uid, (scores.get(uid) ?? 0) + delta);
  }

  if (metric === "active_days") {
    for (const [uid, days] of daysByUser) scores.set(uid, days.size);
  }
  if (metric === "check_ins") {
    for (const [uid, books] of booksByUser) scores.set(uid, books.size);
  }

  for (const [uid, val] of scores) scores.set(uid, Math.round(val));
  return scores;
}

export function daysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const today = todayLocalDateKey();
  const diff = Math.ceil(
    (+new Date(`${endsAt}T00:00:00Z`) - +new Date(`${today}T00:00:00Z`)) / 86_400_000,
  );
  return diff;
}

export function periodProgress(
  startsAt: string | null,
  endsAt: string | null,
): number {
  if (!startsAt || !endsAt) return 0;
  const today = todayLocalDateKey();
  const total = +new Date(`${endsAt}T00:00:00Z`) - +new Date(`${startsAt}T00:00:00Z`);
  if (total <= 0) return 100;
  const elapsed = +new Date(`${today}T00:00:00Z`) - +new Date(`${startsAt}T00:00:00Z`);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

// Marca (ou desmarca) o livro como terminado nos meus check-ins dele, só em
// desafios ainda abertos — terminar um livro depois que o desafio acabou não
// mexe no ranking fechado. Chamado quando o status do livro muda.
export async function sincronizarLivroTerminadoNosDesafios(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  terminado: boolean,
) {
  const { data: sessoes } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId);
  const sessionIds = (sessoes ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return [];

  const { data: checkins } = await supabase
    .from("challenge_checkins")
    .select("id, group_id, groups!inner(starts_at, ends_at)")
    .eq("user_id", userId)
    .in("session_id", sessionIds);

  const hoje = todayLocalDateKey();
  const abertos = ((checkins ?? []) as unknown as {
    id: string;
    group_id: string;
    groups: { starts_at: string | null; ends_at: string | null };
  }[]).filter(
    (c) => (!c.groups.starts_at || c.groups.starts_at <= hoje) && (!c.groups.ends_at || c.groups.ends_at >= hoje),
  );
  if (abertos.length === 0) return [];

  await supabase
    .from("challenge_checkins")
    .update({ finished_item_id: terminado ? itemId : null })
    .in(
      "id",
      abertos.map((c) => c.id),
    );
  return [...new Set(abertos.map((c) => c.group_id))];
}

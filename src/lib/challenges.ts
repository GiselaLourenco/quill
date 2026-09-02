import type { SupabaseClient } from "@supabase/supabase-js";

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
  const today = new Date().toISOString().slice(0, 10);
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
  { value: "check_ins", label: "Check-ins" },
  { value: "chapters", label: "Capítulos" },
  { value: "minutes", label: "Minutos" },
];

export const SCORING_METRIC_UNIT: Record<ScoringMetric, string> = {
  pages: "pág",
  active_days: "dias",
  check_ins: "check-ins",
  chapters: "cap",
  minutes: "min",
};

export type CheckinForScoring = {
  user_id: string;
  session: {
    started_at: string;
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
): Map<string, number> {
  const scores = new Map<string, number>();
  const daysByUser = new Map<string, Set<string>>();

  for (const c of checkins) {
    if (!c.session) continue;
    const uid = c.user_id;

    if (metric === "active_days") {
      const day = c.session.started_at.slice(0, 10);
      if (!daysByUser.has(uid)) daysByUser.set(uid, new Set());
      daysByUser.get(uid)!.add(day);
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
    } else if (metric === "check_ins") {
      delta = 1;
    }
    scores.set(uid, (scores.get(uid) ?? 0) + delta);
  }

  if (metric === "active_days") {
    for (const [uid, days] of daysByUser) scores.set(uid, days.size);
  }

  for (const [uid, val] of scores) scores.set(uid, Math.round(val));
  return scores;
}

export function daysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const today = new Date().toISOString().slice(0, 10);
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
  const today = new Date().toISOString().slice(0, 10);
  const total = +new Date(`${endsAt}T00:00:00Z`) - +new Date(`${startsAt}T00:00:00Z`);
  if (total <= 0) return 100;
  const elapsed = +new Date(`${today}T00:00:00Z`) - +new Date(`${startsAt}T00:00:00Z`);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

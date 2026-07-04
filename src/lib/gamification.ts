export type SessionRow = {
  started_at: string;
  duration_seconds: number | null;
  unit_start: number | null;
  unit_end: number | null;
  chapter_start: number | null;
  chapter_end: number | null;
  quality_tags: string[] | null;
  item_id: string | null;
};

const POSITIVE_TAGS = ["flowed", "no_distractions"];

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

// Segunda-feira da semana daquela data, como chave YYYY-MM-DD.
function weekKey(iso: string): string {
  const d = new Date(`${dateKey(iso)}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = domingo
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

function uniqueSortedDays(sessions: SessionRow[]): string[] {
  return [...new Set(sessions.map((s) => dateKey(s.started_at)))].sort();
}

function uniqueSortedWeeks(sessions: SessionRow[]): string[] {
  return [...new Set(sessions.map((s) => weekKey(s.started_at)))].sort();
}

export function computeStreak(sessions: SessionRow[]): {
  current: number;
  record: number;
} {
  const days = uniqueSortedDays(sessions);
  if (days.length === 0) return { current: 0, record: 0 };

  const daySet = new Set(days);
  let record = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`);
    const cur = new Date(`${days[i]}T00:00:00Z`);
    const diffDays = Math.round((+cur - +prev) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    record = Math.max(record, run);
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let anchor: string | null = null;
  if (daySet.has(today)) anchor = today;
  else if (daySet.has(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor) {
    current = 1;
    let cursor = new Date(`${anchor}T00:00:00Z`);
    for (;;) {
      cursor = new Date(+cursor - 86_400_000);
      const key = cursor.toISOString().slice(0, 10);
      if (daySet.has(key)) current++;
      else break;
    }
  }

  return { current, record };
}

export function computeConsecutiveWeeks(sessions: SessionRow[]): number {
  const weeks = uniqueSortedWeeks(sessions);
  if (weeks.length === 0) return 0;
  const weekSet = new Set(weeks);

  const currentWeek = weekKey(new Date().toISOString());
  if (!weekSet.has(currentWeek)) return 0;

  let count = 1;
  let cursor = new Date(`${currentWeek}T00:00:00Z`);
  for (;;) {
    cursor = new Date(+cursor - 7 * 86_400_000);
    const key = cursor.toISOString().slice(0, 10);
    if (weekSet.has(key)) count++;
    else break;
  }
  return count;
}

// Minutos lidos por dia, só dentro do intervalo [startDate, endDate] (inclusive, YYYY-MM-DD).
export function computeDailyMinutes(
  sessions: SessionRow[],
  startDate: string,
  endDate: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dateKey(s.started_at);
    if (key < startDate || key > endDate) continue;
    map.set(key, (map.get(key) ?? 0) + (s.duration_seconds ?? 0) / 60);
  }
  return map;
}

export function computePagesPerDay(sessions: SessionRow[]): number {
  const totalPages = sessions.reduce((sum, s) => {
    if (s.item_id && s.unit_start != null && s.unit_end != null) {
      return sum + Math.max(0, s.unit_end - s.unit_start);
    }
    return sum;
  }, 0);
  const daysRead = uniqueSortedDays(sessions).length;
  return daysRead > 0 ? Math.round(totalPages / daysRead) : 0;
}

export function computeMinutesPerDay(sessions: SessionRow[]): number {
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0) / 60,
    0,
  );
  const daysRead = uniqueSortedDays(sessions).length;
  return daysRead > 0 ? Math.round(totalMinutes / daysRead) : 0;
}

// % de sessões marcadas (com pelo menos 1 tag) que incluem uma tag positiva
// ("a leitura fluiu" / "sem distrações"). Sessão com tag positiva E negativa
// ainda conta como positiva — é uma simplificação proposital.
export function computeFocusRate(sessions: SessionRow[]): number {
  const tagged = sessions.filter((s) => (s.quality_tags?.length ?? 0) > 0);
  if (tagged.length === 0) return 0;
  const positive = tagged.filter((s) =>
    s.quality_tags!.some((t) => POSITIVE_TAGS.includes(t)),
  );
  return Math.round((positive.length / tagged.length) * 100);
}

export function computeChaptersPerWeek(sessions: SessionRow[]): number {
  const totalChapters = sessions.reduce((sum, s) => {
    if (s.item_id && s.chapter_start != null && s.chapter_end != null) {
      return sum + Math.max(0, s.chapter_end - s.chapter_start);
    }
    return sum;
  }, 0);
  const weeksRead = uniqueSortedWeeks(sessions).length;
  return weeksRead > 0 ? Math.round((totalChapters / weeksRead) * 10) / 10 : 0;
}

export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(+cursor + 86_400_000);
  }
  return dates;
}

export type Goal = {
  id: string;
  type: string;
  target_value: number;
  period_start: string | null;
};

export const GOAL_TYPES = [
  { value: "books_per_year", label: "Livros / ano" },
  { value: "pages_per_day", label: "Páginas / dia" },
  { value: "minutes_per_day", label: "Minutos / dia" },
] as const;

export function goalProgress(
  goal: Goal,
  ctx: { pagesPerDay: number; minutesPerDay: number; finishedThisYear: number },
): { current: number; percent: number; label: string } {
  let current = 0;
  let label = goal.type;

  if (goal.type === "books_per_year") {
    current = ctx.finishedThisYear;
    const year = goal.period_start
      ? new Date(goal.period_start).getUTCFullYear()
      : new Date().getFullYear();
    label = `${goal.target_value} livros em ${year}`;
  } else if (goal.type === "pages_per_day") {
    current = ctx.pagesPerDay;
    label = `${goal.target_value} páginas / dia`;
  } else if (goal.type === "minutes_per_day") {
    current = ctx.minutesPerDay;
    label = `${goal.target_value} minutos / dia`;
  }

  const percent =
    goal.target_value > 0
      ? Math.min(100, Math.round((current / goal.target_value) * 100))
      : 0;

  return { current, percent, label };
}

export const TAG_LABELS: Record<string, string> = {
  flowed: "a leitura fluiu",
  no_distractions: "sem distrações",
  phone: "olhei o celular",
  hard: "foi difícil",
};

export function mostCommonTag(sessions: SessionRow[]): string | null {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    for (const t of s.quality_tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [tag, count] of counts) {
    if (count > bestCount) {
      best = tag;
      bestCount = count;
    }
  }
  return best;
}

const TIME_BUCKETS = [
  { label: "madrugada", from: 0, to: 5 },
  { label: "manhã", from: 6, to: 11 },
  { label: "tarde", from: 12, to: 17 },
  { label: "noite", from: 18, to: 23 },
];

// Assume o fuso horário de quem roda o servidor — sem timezone do usuário
// salvo em lugar nenhum ainda, então é uma aproximação por enquanto.
export function computeBestTimeOfDay(sessions: SessionRow[]): string | null {
  if (sessions.length === 0) return null;
  const totals = TIME_BUCKETS.map(() => 0);
  for (const s of sessions) {
    const hour = new Date(s.started_at).getHours();
    const idx = TIME_BUCKETS.findIndex((b) => hour >= b.from && hour <= b.to);
    if (idx >= 0) totals[idx] += s.duration_seconds ?? 0;
  }
  const maxIdx = totals.indexOf(Math.max(...totals));
  return totals[maxIdx] > 0 ? TIME_BUCKETS[maxIdx].label : null;
}

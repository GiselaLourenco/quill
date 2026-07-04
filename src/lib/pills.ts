export const PILL_CATALOG = [
  { key: "streak", label: "Sequência de dias" },
  { key: "pages_per_day", label: "Páginas / dia" },
  { key: "minutes_per_day", label: "Minutos / dia" },
  { key: "books_finished", label: "Livros terminados" },
  { key: "focus_rate", label: "Taxa de foco" },
  { key: "chapters_per_week", label: "Capítulos / semana" },
  { key: "best_time", label: "Melhor horário de leitura" },
  { key: "speed_pages_per_hour", label: "Velocidade (pág/hora)" },
  { key: "max_session_pages", label: "Recorde de páginas numa sessão" },
  { key: "longest_streak_ever", label: "Maior sequência histórica" },
] as const;

export type PillKey = (typeof PILL_CATALOG)[number]["key"];

export const DEFAULT_PILLS: PillKey[] = [
  "streak",
  "pages_per_day",
  "books_finished",
  "focus_rate",
];

export function isPillKey(value: string): value is PillKey {
  return PILL_CATALOG.some((p) => p.key === value);
}

export type PillStats = {
  streak: { current: number; record: number };
  pagesPerDay: number;
  minutesPerDay: number;
  booksFinished: number;
  focusRate: number;
  chaptersPerWeek: number;
  bestTime: string | null;
  speedPagesPerHour: number;
  maxSessionPages: number;
};

export function pillDisplay(
  key: PillKey,
  stats: PillStats,
): { value: string; label: string } {
  switch (key) {
    case "streak":
      return {
        value: `${stats.streak.current} ${stats.streak.current === 1 ? "dia" : "dias"}`,
        label: "sequência atual",
      };
    case "pages_per_day":
      return { value: String(stats.pagesPerDay), label: "pág. / dia" };
    case "minutes_per_day":
      return { value: String(stats.minutesPerDay), label: "min. / dia" };
    case "books_finished":
      return { value: String(stats.booksFinished), label: "livros terminados" };
    case "focus_rate":
      return { value: `${stats.focusRate}%`, label: "taxa de foco" };
    case "chapters_per_week":
      return { value: String(stats.chaptersPerWeek), label: "cap. / semana" };
    case "best_time":
      return { value: stats.bestTime ?? "—", label: "melhor horário" };
    case "speed_pages_per_hour":
      return { value: String(stats.speedPagesPerHour), label: "pág. / hora" };
    case "max_session_pages":
      return { value: String(stats.maxSessionPages), label: "recorde numa sessão" };
    case "longest_streak_ever":
      return {
        value: `${stats.streak.record} ${stats.streak.record === 1 ? "dia" : "dias"}`,
        label: "maior sequência",
      };
  }
}

/**
 * Pílulas do painel — os números que aparecem na home.
 *
 * O catálogo é deliberadamente pequeno e espelha o que a pessoa já acompanha
 * em Metas (livros no ano, horas no mês, dias seguidos), mais três recordes que
 * saem dos registros do app. Como são exatamente seis, escolher todas é o
 * máximo permitido — `MAX_PILLS` existe pra deixar isso explícito e continuar
 * valendo se o catálogo crescer.
 */
export const PILL_CATALOG = [
  { key: "books_per_year", label: "Livros no ano" },
  { key: "hours_per_month", label: "Horas no mês" },
  { key: "streak_days", label: "Dias seguidos" },
  { key: "chapters_per_week", label: "Capítulos / semana" },
  { key: "max_session_pages", label: "Recorde de páginas numa sessão" },
  { key: "longest_streak_ever", label: "Maior sequência histórica" },
] as const;

export type PillKey = (typeof PILL_CATALOG)[number]["key"];

export const MAX_PILLS = 6;

export const DEFAULT_PILLS: PillKey[] = [
  "books_per_year",
  "hours_per_month",
  "streak_days",
  "chapters_per_week",
];

export function isPillKey(value: string): value is PillKey {
  return PILL_CATALOG.some((p) => p.key === value);
}

/** Preferência salva → lista válida. Cai no padrão quando não há escolha. */
export function pillsEscolhidas(bruto: unknown): PillKey[] {
  const lista = Array.isArray(bruto) ? bruto.filter((v): v is string => typeof v === "string") : [];
  const validas = lista.filter(isPillKey);
  return validas.length > 0 ? validas.slice(0, MAX_PILLS) : DEFAULT_PILLS;
}

export type PillStats = {
  booksPerYear: number;
  hoursPerMonth: number;
  streakDays: number;
  chaptersPerWeek: number;
  maxSessionPages: number;
  longestStreakEver: number;
};

export type PillTone = "coral" | "paper" | "mustard" | "moss" | "navy" | "ink";

/** Cada pílula tem cor fixa: a mesma métrica não muda de cor ao reordenar. */
const TOM: Record<PillKey, PillTone> = {
  books_per_year: "coral",
  hours_per_month: "navy",
  streak_days: "moss",
  chapters_per_week: "mustard",
  max_session_pages: "paper",
  longest_streak_ever: "ink",
};

export function pillDisplay(
  key: PillKey,
  stats: PillStats,
): { id: string; label: string; valor: string; unidade: string; tone: PillTone } {
  const base = { id: key, tone: TOM[key] };
  switch (key) {
    case "books_per_year":
      return { ...base, label: "Livros", valor: String(stats.booksPerYear), unidade: "no ano" };
    case "hours_per_month":
      return { ...base, label: "Horas", valor: String(stats.hoursPerMonth), unidade: "no mês" };
    case "streak_days":
      return { ...base, label: "Sequência", valor: String(stats.streakDays), unidade: "dias" };
    case "chapters_per_week":
      return {
        ...base,
        label: "Capítulos",
        valor: String(stats.chaptersPerWeek),
        unidade: "por semana",
      };
    case "max_session_pages":
      return {
        ...base,
        label: "Recorde",
        valor: String(stats.maxSessionPages),
        unidade: "pág. numa sessão",
      };
    case "longest_streak_ever":
      return {
        ...base,
        label: "Maior sequência",
        valor: String(stats.longestStreakEver),
        unidade: "dias",
      };
  }
}

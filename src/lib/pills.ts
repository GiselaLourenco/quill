/**
 * Pílulas do painel — os números de "Seus números", na home.
 *
 * As seis primeiras são as que a home sempre mostrou e seguem sendo o padrão
 * de quem nunca personalizou. As cinco de baixo entram pela tela de
 * personalizar: três vêm das metas de /metas e duas são recordes.
 *
 * `streak` cobre "dias seguidos" das metas — é o mesmo número, então não
 * aparece duas vezes no catálogo com nomes diferentes.
 */
export const PILL_CATALOG = [
  { key: "streak", label: "Sequência atual" },
  { key: "pages_per_day", label: "Média de páginas / dia" },
  { key: "speed_pages_per_hour", label: "Velocidade (pág / hora)" },
  { key: "minutes_this_week", label: "Tempo lido na semana" },
  { key: "books_this_month", label: "Livros no mês" },
  { key: "best_time", label: "Melhor horário de leitura" },
  { key: "books_per_year", label: "Livros no ano" },
  { key: "hours_per_month", label: "Horas no mês" },
  { key: "chapters_per_week", label: "Capítulos / semana" },
  { key: "max_session_pages", label: "Recorde de páginas numa sessão" },
  { key: "longest_streak_ever", label: "Maior sequência histórica" },
] as const;

export type PillKey = (typeof PILL_CATALOG)[number]["key"];

/** Cabem seis no painel — é o que a grade da home comporta sem virar lista. */
export const MAX_PILLS = 6;

/** As seis que a home mostrava antes de existir personalização. */
export const DEFAULT_PILLS: PillKey[] = [
  "streak",
  "pages_per_day",
  "speed_pages_per_hour",
  "minutes_this_week",
  "books_this_month",
  "best_time",
];

export function isPillKey(value: string): value is PillKey {
  return PILL_CATALOG.some((p) => p.key === value);
}

export function rotuloDaPill(key: PillKey): string {
  return PILL_CATALOG.find((p) => p.key === key)!.label;
}

/** Preferência salva → lista válida. Sem escolha, cai nas seis padrão. */
export function pillsEscolhidas(bruto: unknown): PillKey[] {
  const lista = Array.isArray(bruto) ? bruto.filter((v): v is string => typeof v === "string") : [];
  const validas = lista.filter(isPillKey);
  return validas.length > 0 ? validas.slice(0, MAX_PILLS) : DEFAULT_PILLS;
}

export type PillStats = {
  streak: number;
  pagesPerDay: number;
  speedPagesPerHour: number;
  /** Já formatado ("2h30", "45min") — a unidade muda conforme o total. */
  minutesThisWeek: string;
  booksThisMonth: number;
  /** Mês corrente abreviado, para a unidade de "Livros no mês". */
  mesCurto: string;
  bestTime: string | null;
  booksPerYear: number;
  hoursPerMonth: number;
  chaptersPerWeek: number;
  maxSessionPages: number;
  longestStreakEver: number;
};

export type PillTone = "coral" | "paper" | "mustard" | "moss" | "navy" | "ink";

/** Cor fixa por métrica: a mesma pílula não muda de cor ao trocar a seleção. */
const TOM: Record<PillKey, PillTone> = {
  streak: "moss",
  pages_per_day: "paper",
  speed_pages_per_hour: "navy",
  minutes_this_week: "ink",
  books_this_month: "mustard",
  best_time: "coral",
  books_per_year: "coral",
  hours_per_month: "navy",
  chapters_per_week: "mustard",
  max_session_pages: "paper",
  longest_streak_ever: "ink",
};

export type PillView = {
  id: string;
  label: string;
  valor: string;
  unidade: string;
  tone: PillTone;
};

export function pillDisplay(key: PillKey, s: PillStats): PillView {
  const base = { id: key, tone: TOM[key] };
  switch (key) {
    case "streak":
      return { ...base, label: "Sequência", valor: String(s.streak), unidade: "dias" };
    case "pages_per_day":
      return { ...base, label: "Média/dia", valor: String(s.pagesPerDay), unidade: "pág" };
    case "speed_pages_per_hour":
      return {
        ...base,
        label: "Velocidade",
        valor: String(s.speedPagesPerHour),
        unidade: "p/h",
      };
    case "minutes_this_week":
      return { ...base, label: "Semana", valor: s.minutesThisWeek, unidade: "lidas" };
    case "books_this_month":
      return {
        ...base,
        label: "Livros/mês",
        valor: String(s.booksThisMonth),
        unidade: `no ${s.mesCurto}`,
      };
    case "best_time":
      return { ...base, label: "Melhor hora", valor: s.bestTime ?? "—", unidade: "pico" };
    case "books_per_year":
      return { ...base, label: "Livros", valor: String(s.booksPerYear), unidade: "no ano" };
    case "hours_per_month":
      return { ...base, label: "Horas", valor: String(s.hoursPerMonth), unidade: "no mês" };
    case "chapters_per_week":
      return {
        ...base,
        label: "Capítulos",
        valor: String(s.chaptersPerWeek),
        unidade: "por semana",
      };
    case "max_session_pages":
      return {
        ...base,
        label: "Recorde",
        valor: String(s.maxSessionPages),
        unidade: "pág. numa sessão",
      };
    case "longest_streak_ever":
      return {
        ...base,
        label: "Maior sequência",
        valor: String(s.longestStreakEver),
        unidade: "dias",
      };
  }
}

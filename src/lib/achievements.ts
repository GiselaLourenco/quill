export type AchievementTier = "bronze" | "prata" | "ouro";

export type AchievementCriteria =
  | { type: "sessions_count"; target: number }
  | { type: "books_finished"; target: number }
  | { type: "streak_record"; target: number }
  | { type: "max_session_pages"; target: number };

export type Achievement = {
  key: string;
  name: string;
  description: string;
  tier: AchievementTier;
  criteria: AchievementCriteria;
};

/**
 * Ícone da conquista — escolhido pelo CRITÉRIO, não pelo nível.
 * Assim a arte diz o que a pessoa fez: caneca = tempo de sessão,
 * livro = livros terminados, mochila = sequência (a jornada),
 * símbolo = façanha de leitura numa sessão só.
 */
export const ACHIEVEMENT_ICON: Record<AchievementCriteria["type"], string> = {
  sessions_count: "/img/conquistas/caneca.webp",
  books_finished: "/img/conquistas/livro.webp",
  streak_record: "/img/conquistas/mochila.webp",
  max_session_pages: "/img/conquistas/simbolo.webp",
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_session",
    name: "Primeira sessão",
    description: "Registre sua primeira sessão de leitura.",
    tier: "bronze",
    criteria: { type: "sessions_count", target: 1 },
  },
  {
    key: "first_book",
    name: "Primeiro livro terminado",
    description: "Termine seu primeiro livro.",
    tier: "bronze",
    criteria: { type: "books_finished", target: 1 },
  },
  {
    key: "streak_3",
    name: "3 dias seguidos",
    description: "Leia 3 dias seguidos.",
    tier: "bronze",
    criteria: { type: "streak_record", target: 3 },
  },
  {
    key: "streak_7",
    name: "7 dias seguidos",
    description: "Leia 7 dias seguidos.",
    tier: "prata",
    criteria: { type: "streak_record", target: 7 },
  },
  {
    key: "books_5",
    name: "5 livros terminados",
    description: "Termine 5 livros.",
    tier: "prata",
    criteria: { type: "books_finished", target: 5 },
  },
  {
    key: "session_100_pages",
    name: "Maratona de 100 páginas",
    description: "Leia 100 ou mais páginas numa única sessão.",
    tier: "prata",
    criteria: { type: "max_session_pages", target: 100 },
  },
  {
    key: "streak_30",
    name: "30 dias seguidos",
    description: "Leia 30 dias seguidos.",
    tier: "ouro",
    criteria: { type: "streak_record", target: 30 },
  },
  {
    key: "books_10",
    name: "10 livros terminados",
    description: "Termine 10 livros.",
    tier: "ouro",
    criteria: { type: "books_finished", target: 10 },
  },
  {
    key: "sessions_50",
    name: "Leitor assíduo",
    description: "Registre 50 sessões de leitura.",
    tier: "ouro",
    criteria: { type: "sessions_count", target: 50 },
  },
];

export type AchievementContext = {
  sessionsCount: number;
  booksFinished: number;
  streakRecord: number;
  maxSessionPages: number;
};

export function currentProgress(
  criteria: AchievementCriteria,
  ctx: AchievementContext,
): number {
  switch (criteria.type) {
    case "sessions_count":
      return ctx.sessionsCount;
    case "books_finished":
      return ctx.booksFinished;
    case "streak_record":
      return ctx.streakRecord;
    case "max_session_pages":
      return ctx.maxSessionPages;
  }
}

export function evaluateAchievements(ctx: AchievementContext) {
  return ACHIEVEMENTS.map((achievement) => {
    const progress = currentProgress(achievement.criteria, ctx);
    return {
      achievement,
      progress,
      met: progress >= achievement.criteria.target,
    };
  });
}

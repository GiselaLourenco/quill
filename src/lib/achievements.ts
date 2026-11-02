export type AchievementTier = "bronze" | "prata" | "ouro";

export type AchievementCriteria =
  | { type: "sessions_count"; target: number }
  | { type: "books_finished"; target: number }
  | { type: "streak_record"; target: number }
  | { type: "max_session_pages"; target: number }
  /** Terminar um livro específico — `titles` são os começos de título aceitos. */
  | { type: "specific_book"; titles: string[]; target: 1 };

export type Achievement = {
  key: string;
  name: string;
  description: string;
  tier: AchievementTier;
  criteria: AchievementCriteria;
  /**
   * Foto de perfil que a conquista libera: nome do arquivo na pasta
   * `avatares/` do bucket `artes`. Enquanto bloqueada, ela aparece no seletor
   * com cadeado e `dica`, e o servidor recusa gravá-la.
   */
  avatar?: { arquivo: string; nome: string; dica: string };
};

/** Minúsculas e sem acento — "Trono de Vídro" e "trono de vidro" são o mesmo. */
function normalizarTitulo(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * O título é este livro? Não há ISBN nem id do Google Books em `media_items`,
 * então vale o título: precisa COMEÇAR com um dos aceitos — assim
 * "Coroa da meia-noite - Trono de vidro - vol. 2" (continuação) fica de fora
 * e "Trono de vidro - Trono de vidro - vol. 1 (Portuguese Edition)" (import do
 * Kindle) entra. Um volume explícito diferente de 1 também fica de fora.
 */
export function tituloEhLivro(titulo: string, aceitos: string[]): boolean {
  const t = normalizarTitulo(titulo);
  // Depois do começo aceito vem fim, espaço ou pontuação — nunca o meio de
  // outra palavra.
  const casou = aceitos.some((a) => {
    const prefixo = normalizarTitulo(a);
    if (!t.startsWith(prefixo)) return false;
    const resto = t.slice(prefixo.length);
    // "Trono de vidro 2" é continuação, não o livro.
    return !/^[a-z0-9]/.test(resto) && !/^[\s:\-–—#]*[2-9]/.test(resto);
  });
  if (!casou) return false;
  const volume = t.match(/\bvol(?:ume)?\.?\s*(\d+(?:[.,]\d+)?)/);
  return !volume || volume[1] === "1";
}

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
  specific_book: "/img/conquistas/livro.webp",
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
  {
    key: "trono_de_vidro",
    name: "Trono de Vidro",
    description: "Termine Trono de Vidro e ganhe a foto do guardião.",
    tier: "prata",
    criteria: { type: "specific_book", titles: ["Trono de Vidro", "Throne of Glass"], target: 1 },
    avatar: {
      arquivo: "chibi-guardiao-botanico-com-capa-dourada-mvzlfgii.png",
      nome: "Guardião de Trono de Vidro",
      dica: "Termine Trono de Vidro",
    },
  },
];

/** As conquistas que liberam foto de perfil. */
export const ACHIEVEMENTS_COM_AVATAR = ACHIEVEMENTS.filter(
  (a): a is Achievement & { avatar: NonNullable<Achievement["avatar"]> } => Boolean(a.avatar),
);

/** Conquistas de livro específico que este título completa. */
export function conquistasDoTitulo(titulo: string): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => a.criteria.type === "specific_book" && tituloEhLivro(titulo, a.criteria.titles),
  );
}

export type AchievementContext = {
  sessionsCount: number;
  booksFinished: number;
  streakRecord: number;
  maxSessionPages: number;
  /** Títulos de tudo que está como "terminei" — para `specific_book`. */
  finishedTitles: string[];
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
    case "specific_book": {
      const { titles } = criteria;
      return ctx.finishedTitles.some((t) => tituloEhLivro(t, titles)) ? 1 : 0;
    }
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

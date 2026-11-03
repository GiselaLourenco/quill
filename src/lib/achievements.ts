export type AchievementTier = "bronze" | "prata" | "ouro";

/**
 * Número "da vida" que uma conquista acompanha. Todos saem de
 * `loadAchievementData` — critério novo que precise de outro dado entra lá.
 */
export type Metrica = Exclude<keyof AchievementContext, "finishedTitles">;

export type AchievementCriteria =
  | { type: "metric"; metric: Metrica; target: number }
  /**
   * Terminar um livro específico — `titles` são os começos de título aceitos;
   * `exactTitles` só valem como título inteiro (quando o começo sozinho
   * também abre as continuações, como "Mistborn: O Poço da Ascensão").
   * `volume` é o número do livro na série (padrão 1) — um volume explícito
   * diferente dele no título fica de fora.
   */
  | {
      type: "specific_book";
      titles: string[];
      exactTitles?: string[];
      volume?: number;
      target: 1;
    };

export type Achievement = {
  key: string;
  name: string;
  description: string;
  tier: AchievementTier;
  criteria: AchievementCriteria;
  /** Arte da conquista em /public. Quem dá foto de perfil mostra a foto. */
  icon?: string;
  /** Como o progresso aparece ("5/7 dias"). */
  unit?: string;
  /**
   * Foto de perfil que a conquista libera: nome do arquivo na pasta
   * `avatares/` do bucket `artes`. Enquanto bloqueada, ela aparece no seletor
   * com cadeado e `dica`, e o servidor recusa gravá-la.
   */
  avatar?: { arquivo: string; nome: string; dica: string };
};

/**
 * Minúsculas e sem acento — "Trono de Vídro" e "trono de vidro" são o mesmo.
 * Dois-pontos e travessões viram um separador só: "Mistborn - O Império
 * Final" e "Mistborn: O Império Final" também. Apóstrofo curvo vira reto
 * ("Philosopher’s Stone").
 */
function normalizarTitulo(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s*[:–—]\s*|\s+-\s+/g, ": ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O título é este livro? Não há ISBN nem id do Google Books em `media_items`,
 * então vale o título: precisa COMEÇAR com um dos aceitos — assim
 * "Coroa da meia-noite - Trono de vidro - vol. 2" (continuação) fica de fora
 * e "Trono de vidro - Trono de vidro - vol. 1 (Portuguese Edition)" (import do
 * Kindle) entra. Um volume explícito diferente de `volume` também fica de fora.
 */
export function tituloEhLivro(
  titulo: string,
  aceitos: string[],
  exatos: string[] = [],
  volume = 1,
): boolean {
  const t = normalizarTitulo(titulo);
  // Título inteiro, tirando um "(Portuguese Edition)" do fim.
  const semEdicao = t.replace(/\s*\([^)]*\)$/, "");
  if (exatos.some((e) => normalizarTitulo(e) === semEdicao)) return true;
  // Depois do começo aceito vem fim, espaço ou pontuação — nunca o meio de
  // outra palavra.
  const casou = aceitos.some((a) => {
    const prefixo = normalizarTitulo(a);
    if (!t.startsWith(prefixo)) return false;
    const resto = t.slice(prefixo.length);
    // "Trono de vidro 2" é continuação, não o livro.
    const numero = resto.match(/^[\s:\-–—#]*(\d+)/);
    return !/^[a-z0-9]/.test(resto) && (!numero || numero[1] === String(volume));
  });
  if (!casou) return false;
  const vol = t.match(/\bvol(?:ume)?\.?\s*(\d+(?:[.,]\d+)?)/);
  return !vol || vol[1] === String(volume);
}

/** Arte da conquista — recortada da coleção em assets-src/conquistas. */
const icone = (key: string) => `/img/conquistas/${key}.webp`;

/**
 * As chaves antigas continuam as mesmas (`streak_7`, `books_10`…) mesmo
 * quando o nome mudou: é por elas que `user_achievements` guarda a data.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_session",
    name: "Primeira sessão",
    description: "Registre sua primeira sessão de leitura.",
    tier: "bronze",
    criteria: { type: "metric", metric: "sessionsCount", target: 1 },
    icon: icone("first_session"),
    unit: "sessão",
  },
  {
    key: "first_book",
    name: "Primeiro livro terminado",
    description: "Termine seu primeiro livro.",
    tier: "bronze",
    criteria: { type: "metric", metric: "booksFinished", target: 1 },
    icon: icone("first_book"),
    unit: "livro",
  },
  {
    key: "streak_3",
    name: "3 dias seguidos",
    description: "Leia 3 dias seguidos.",
    tier: "bronze",
    criteria: { type: "metric", metric: "streakRecord", target: 3 },
    icon: icone("streak_3"),
    unit: "dias",
  },
  {
    key: "min_5",
    name: "Sempre há tempo",
    description: "Faça uma sessão de pelo menos 5 minutos.",
    tier: "bronze",
    criteria: { type: "metric", metric: "longestSessionMinutes", target: 5 },
    icon: icone("min_5"),
    unit: "min",
  },
  {
    key: "total_60",
    name: "Hora encantada",
    description: "Some 60 minutos de leitura.",
    tier: "bronze",
    criteria: { type: "metric", metric: "totalMinutes", target: 60 },
    icon: icone("total_60"),
    unit: "min",
  },
  {
    key: "pages_50",
    name: "Além da primeira página",
    description: "Leia 50 páginas no total.",
    tier: "bronze",
    criteria: { type: "metric", metric: "totalPages", target: 50 },
    icon: icone("pages_50"),
    unit: "págs",
  },
  {
    key: "morning",
    name: "Leitor matinal",
    description: "Leia antes das 8h da manhã.",
    tier: "bronze",
    criteria: { type: "metric", metric: "morningSessions", target: 1 },
    icon: icone("morning"),
    unit: "sessão",
  },
  {
    key: "night_owl",
    name: "Coruja literária",
    description: "Leia depois das 23h.",
    tier: "bronze",
    criteria: { type: "metric", metric: "lateSessions", target: 1 },
    icon: icone("night_owl"),
    unit: "sessão",
  },
  {
    key: "new_author",
    name: "Uma nova voz",
    description: "Termine livros de 2 autores diferentes.",
    tier: "bronze",
    criteria: { type: "metric", metric: "distinctAuthors", target: 2 },
    icon: icone("new_author"),
    unit: "autores",
  },
  {
    key: "new_genre",
    name: "Fora da zona de conforto",
    description: "Termine livros de 2 gêneros diferentes.",
    tier: "bronze",
    criteria: { type: "metric", metric: "distinctGenres", target: 2 },
    icon: icone("new_genre"),
    unit: "gêneros",
  },
  {
    key: "five_stars",
    name: "Coração quentinho",
    description: "Dê 5 estrelas para um livro.",
    tier: "bronze",
    criteria: { type: "metric", metric: "fiveStarRatings", target: 1 },
    icon: icone("five_stars"),
    unit: "livro",
  },
  {
    key: "one_more",
    name: "Só mais um capítulo",
    description: "Leia 30 minutos ou mais numa sessão começada depois das 22h.",
    tier: "bronze",
    criteria: { type: "metric", metric: "lateLongSessions", target: 1 },
    icon: icone("one_more"),
    unit: "sessão",
  },
  {
    key: "streak_7",
    name: "Ritual de leitura",
    description: "Leia 7 dias seguidos.",
    tier: "prata",
    criteria: { type: "metric", metric: "streakRecord", target: 7 },
    icon: icone("streak_7"),
    unit: "dias",
  },
  {
    key: "week_5",
    name: "Uma semana de histórias",
    description: "Leia em 5 dias diferentes da mesma semana.",
    tier: "prata",
    criteria: { type: "metric", metric: "maxDaysInWeek", target: 5 },
    icon: icone("week_5"),
    unit: "dias",
  },
  {
    key: "books_5",
    name: "5 livros terminados",
    description: "Termine 5 livros.",
    tier: "prata",
    criteria: { type: "metric", metric: "booksFinished", target: 5 },
    icon: icone("books_5"),
    unit: "livros",
  },
  {
    key: "session_100_pages",
    name: "Maratona de 100 páginas",
    description: "Leia 100 ou mais páginas numa única sessão.",
    tier: "prata",
    criteria: { type: "metric", metric: "maxSessionPages", target: 100 },
    icon: icone("session_100_pages"),
    unit: "págs",
  },
  {
    key: "hours_10",
    name: "Imersão literária",
    description: "Some 10 horas de leitura.",
    tier: "prata",
    criteria: { type: "metric", metric: "totalHours", target: 10 },
    icon: icone("hours_10"),
    unit: "h",
  },
  {
    key: "pages_1000",
    name: "Mar de palavras",
    description: "Leia 1.000 páginas no total.",
    tier: "prata",
    criteria: { type: "metric", metric: "totalPages", target: 1000 },
    icon: icone("pages_1000"),
    unit: "págs",
  },
  {
    key: "genres_3",
    name: "Novos mundos",
    description: "Termine livros de 3 gêneros diferentes.",
    tier: "prata",
    criteria: { type: "metric", metric: "distinctGenres", target: 3 },
    icon: icone("genres_3"),
    unit: "gêneros",
  },
  {
    key: "authors_5",
    name: "Colecionador de histórias",
    description: "Termine livros de 5 autores diferentes.",
    tier: "prata",
    criteria: { type: "metric", metric: "distinctAuthors", target: 5 },
    icon: icone("authors_5"),
    unit: "autores",
  },
  {
    key: "day_2h",
    name: "Noite em claro",
    description: "Leia 2 horas ou mais num mesmo dia.",
    tier: "prata",
    criteria: { type: "metric", metric: "maxDayMinutes", target: 120 },
    icon: icone("day_2h"),
    unit: "min",
  },
  {
    key: "small_10",
    name: "Pequenos progressos",
    description: "Faça 10 sessões de 10 minutos ou mais.",
    tier: "prata",
    criteria: { type: "metric", metric: "sessions10min", target: 10 },
    icon: icone("small_10"),
    unit: "sessões",
  },
  {
    key: "started_5",
    name: "O colecionador de começos",
    description: "Comece 5 livros.",
    tier: "prata",
    criteria: { type: "metric", metric: "booksStarted", target: 5 },
    icon: icone("started_5"),
    unit: "livros",
  },
  {
    key: "between",
    name: "Entre mundos",
    description: "Termine um livro e comece outro no mesmo dia.",
    tier: "prata",
    criteria: { type: "metric", metric: "finishThenStart", target: 1 },
    icon: icone("between"),
    unit: "vez",
  },
  {
    key: "trono_de_vidro",
    name: "Trono de Vidro",
    description: "Termine Trono de Vidro e ganhe a foto do guardião.",
    tier: "prata",
    criteria: { type: "specific_book", titles: ["Trono de Vidro", "Throne of Glass"], target: 1 },
    unit: "livro",
    avatar: {
      arquivo: "chibi-guardiao-botanico-com-capa-dourada-mvzlfgii.png",
      nome: "Guardião de Trono de Vidro",
      dica: "Termine Trono de Vidro",
    },
  },
  {
    key: "mistborn",
    name: "Mistborn",
    description: "Termine Mistborn: O Império Final e ganhe a foto do nascido da bruma.",
    tier: "prata",
    criteria: {
      type: "specific_book",
      // Só o volume 1. "Mistborn" sozinho é como o Google Books grava o
      // livro, mas como começo pegaria a série toda — por isso é exato.
      titles: ["Mistborn: O Império Final", "Mistborn: The Final Empire", "O Império Final", "The Final Empire", "Nascidos da Bruma: O Império Final"],
      exactTitles: ["Mistborn"],
      target: 1,
    },
    unit: "livro",
    avatar: {
      arquivo: "quill-nascido-da-bruma-v2.png",
      nome: "Nascido da Bruma",
      dica: "Termine Mistborn",
    },
  },
  {
    key: "calice_de_fogo",
    name: "Cálice de Fogo",
    description: "Termine Harry Potter e o Cálice de Fogo e ganhe a foto da Luna Lovegood.",
    tier: "prata",
    criteria: {
      type: "specific_book",
      // Qualquer edição, em qualquer idioma — é o 4º livro da série.
      titles: [
        "Harry Potter e o Cálice de Fogo",
        "Harry Potter and the Goblet of Fire",
        "Harry Potter y el Cáliz de Fuego",
        "Harry Potter et la Coupe de Feu",
        "Harry Potter e il Calice di Fuoco",
        "Harry Potter und der Feuerkelch",
        "Harry Potter en de Vuurbeker",
        "Harry Potter i Czara Ognia",
        "O Cálice de Fogo",
        "The Goblet of Fire",
      ],
      volume: 4,
      target: 1,
    },
    unit: "livro",
    avatar: {
      arquivo: "quill-luna-lovegood.png",
      nome: "Luna Lovegood",
      dica: "Termine Harry Potter e o Cálice de Fogo",
    },
  },
  {
    key: "pedra_filosofal",
    name: "Pedra Filosofal",
    description: "Termine Harry Potter e a Pedra Filosofal e ganhe a foto do Harry.",
    tier: "bronze",
    criteria: {
      type: "specific_book",
      // Qualquer edição, em qualquer idioma — e também "Harry Potter 1".
      titles: [
        "Harry Potter e a Pedra Filosofal",
        "Harry Potter and the Philosopher's Stone",
        "Harry Potter and the Sorcerer's Stone",
        "Harry Potter y la Piedra Filosofal",
        "Harry Potter à l'École des Sorciers",
        "Harry Potter e la Pietra Filosofale",
        "Harry Potter und der Stein der Weisen",
        "Harry Potter en de Steen der Wijzen",
        "Harry Potter i Kamień Filozoficzny",
        "A Pedra Filosofal",
        "The Philosopher's Stone",
        "The Sorcerer's Stone",
        "Harry Potter 1",
        "Harry Potter #1",
        "Harry Potter vol. 1",
        "Harry Potter, vol. 1",
        "Harry Potter volume 1",
        "Harry Potter: Livro 1",
        "Harry Potter Livro 1",
        "Harry Potter: Book 1",
        "Harry Potter Book 1",
      ],
      volume: 1,
      target: 1,
    },
    unit: "livro",
    avatar: {
      arquivo: "quill-harry-e-a-pedra-v2.png",
      nome: "Harry e a pedra",
      dica: "Termine Harry Potter e a Pedra Filosofal",
    },
  },
  {
    key: "camara_secreta",
    name: "Câmara Secreta",
    description: "Termine Harry Potter e a Câmara Secreta e ganhe a foto do Harry.",
    tier: "bronze",
    criteria: {
      type: "specific_book",
      // Qualquer edição, em qualquer idioma — e também "Harry Potter 2".
      titles: [
        "Harry Potter e a Câmara Secreta",
        "Harry Potter and the Chamber of Secrets",
        "Harry Potter y la Cámara Secreta",
        "Harry Potter et la Chambre des Secrets",
        "Harry Potter e la Camera dei Segreti",
        "Harry Potter und die Kammer des Schreckens",
        "Harry Potter en de Geheime Kamer",
        "Harry Potter i Komnata Tajemnic",
        "A Câmara Secreta",
        "The Chamber of Secrets",
        "Harry Potter 2",
        "Harry Potter #2",
        "Harry Potter vol. 2",
        "Harry Potter, vol. 2",
        "Harry Potter volume 2",
        "Harry Potter: Livro 2",
        "Harry Potter Livro 2",
        "Harry Potter: Book 2",
        "Harry Potter Book 2",
      ],
      volume: 2,
      target: 1,
    },
    unit: "livro",
    avatar: {
      arquivo: "quill-harry-e-a-camara-v2.png",
      nome: "Harry e a câmara",
      dica: "Termine Harry Potter e a Câmara Secreta",
    },
  },
  {
    key: "prisioneiro_de_azkaban",
    name: "Prisioneiro de Azkaban",
    description: "Termine Harry Potter e o Prisioneiro de Azkaban e ganhe a foto do Sirius.",
    tier: "bronze",
    criteria: {
      type: "specific_book",
      // Qualquer edição, em qualquer idioma — e também "Harry Potter 3".
      titles: [
        "Harry Potter e o Prisioneiro de Azkaban",
        "Harry Potter and the Prisoner of Azkaban",
        "Harry Potter y el Prisionero de Azkaban",
        "Harry Potter et le Prisonnier d'Azkaban",
        "Harry Potter e il Prigioniero di Azkaban",
        "Harry Potter und der Gefangene von Askaban",
        "Harry Potter en de Gevangene van Azkaban",
        "Harry Potter i Więzień Azkabanu",
        "O Prisioneiro de Azkaban",
        "The Prisoner of Azkaban",
        "Harry Potter 3",
        "Harry Potter #3",
        "Harry Potter vol. 3",
        "Harry Potter, vol. 3",
        "Harry Potter volume 3",
        "Harry Potter: Livro 3",
        "Harry Potter Livro 3",
        "Harry Potter: Book 3",
        "Harry Potter Book 3",
      ],
      volume: 3,
      target: 1,
    },
    unit: "livro",
    avatar: {
      arquivo: "quill-sirius-v2.png",
      nome: "Sirius",
      dica: "Termine Harry Potter e o Prisioneiro de Azkaban",
    },
  },
  {
    key: "streak_30",
    name: "30 dias seguidos",
    description: "Leia 30 dias seguidos.",
    tier: "ouro",
    criteria: { type: "metric", metric: "streakRecord", target: 30 },
    icon: icone("streak_30"),
    unit: "dias",
  },
  {
    key: "month_20",
    name: "Um mês de histórias",
    description: "Leia em 20 dias diferentes do mesmo mês.",
    tier: "ouro",
    criteria: { type: "metric", metric: "maxDaysInMonth", target: 20 },
    icon: icone("month_20"),
    unit: "dias",
  },
  {
    key: "days_100",
    name: "Constância silenciosa",
    description: "Leia em 100 dias diferentes.",
    tier: "ouro",
    criteria: { type: "metric", metric: "daysRead", target: 100 },
    icon: icone("days_100"),
    unit: "dias",
  },
  {
    key: "books_10",
    name: "Biblioteca particular",
    description: "Termine 10 livros.",
    tier: "ouro",
    criteria: { type: "metric", metric: "booksFinished", target: 10 },
    icon: icone("books_10"),
    unit: "livros",
  },
  {
    key: "sessions_50",
    name: "Leitor assíduo",
    description: "Registre 50 sessões de leitura.",
    tier: "ouro",
    criteria: { type: "metric", metric: "sessionsCount", target: 50 },
    icon: icone("sessions_50"),
    unit: "sessões",
  },
  {
    key: "big_book",
    name: "Devagar também é longe",
    description: "Termine um livro com mais de 500 páginas.",
    tier: "ouro",
    criteria: { type: "metric", metric: "bigBooksFinished", target: 1 },
    icon: icone("big_book"),
    unit: "livro",
  },
  {
    key: "month_3",
    name: "Uma pilha de histórias",
    description: "Termine 3 livros no mesmo mês.",
    tier: "ouro",
    criteria: { type: "metric", metric: "maxFinishedInMonth", target: 3 },
    icon: icone("month_3"),
    unit: "livros",
  },
  {
    key: "genres_10",
    name: "Pequeno explorador",
    description: "Termine livros de 10 gêneros diferentes.",
    tier: "ouro",
    criteria: { type: "metric", metric: "distinctGenres", target: 10 },
    icon: icone("genres_10"),
    unit: "gêneros",
  },
  {
    key: "marathon_2h",
    name: "Não consegui parar",
    description: "Leia 2 horas ou mais numa única sessão.",
    tier: "ouro",
    criteria: { type: "metric", metric: "longestSessionMinutes", target: 120 },
    icon: icone("marathon_2h"),
    unit: "min",
  },
];

/** As conquistas que liberam foto de perfil. */
export const ACHIEVEMENTS_COM_AVATAR = ACHIEVEMENTS.filter(
  (a): a is Achievement & { avatar: NonNullable<Achievement["avatar"]> } => Boolean(a.avatar),
);

/** Conquistas de livro específico que este título completa. */
export function conquistasDoTitulo(titulo: string): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) =>
      a.criteria.type === "specific_book" &&
      tituloEhLivro(titulo, a.criteria.titles, a.criteria.exactTitles, a.criteria.volume),
  );
}

export type AchievementContext = {
  sessionsCount: number;
  booksFinished: number;
  streakRecord: number;
  maxSessionPages: number;
  totalMinutes: number;
  totalHours: number;
  totalPages: number;
  /** Sessões começadas entre 4h e 8h. */
  morningSessions: number;
  /** Sessões começadas das 23h às 4h. */
  lateSessions: number;
  /** Sessões de 30+ min começadas das 22h às 4h. */
  lateLongSessions: number;
  longestSessionMinutes: number;
  maxDayMinutes: number;
  sessions10min: number;
  maxDaysInWeek: number;
  maxDaysInMonth: number;
  daysRead: number;
  maxFinishedInMonth: number;
  booksStarted: number;
  finishThenStart: number;
  distinctGenres: number;
  distinctAuthors: number;
  bigBooksFinished: number;
  fiveStarRatings: number;
  /** Títulos de tudo que está como "terminei" — para `specific_book`. */
  finishedTitles: string[];
};

/** Contexto zerado — quem só precisa de um pedaço preenche o resto com isto. */
export const CONTEXTO_VAZIO: AchievementContext = {
  sessionsCount: 0,
  booksFinished: 0,
  streakRecord: 0,
  maxSessionPages: 0,
  totalMinutes: 0,
  totalHours: 0,
  totalPages: 0,
  morningSessions: 0,
  lateSessions: 0,
  lateLongSessions: 0,
  longestSessionMinutes: 0,
  maxDayMinutes: 0,
  sessions10min: 0,
  maxDaysInWeek: 0,
  maxDaysInMonth: 0,
  daysRead: 0,
  maxFinishedInMonth: 0,
  booksStarted: 0,
  finishThenStart: 0,
  distinctGenres: 0,
  distinctAuthors: 0,
  bigBooksFinished: 0,
  fiveStarRatings: 0,
  finishedTitles: [],
};

export function currentProgress(
  criteria: AchievementCriteria,
  ctx: AchievementContext,
): number {
  switch (criteria.type) {
    case "metric":
      return ctx[criteria.metric];
    case "specific_book": {
      const { titles, exactTitles, volume } = criteria;
      return ctx.finishedTitles.some((t) => tituloEhLivro(t, titles, exactTitles, volume)) ? 1 : 0;
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

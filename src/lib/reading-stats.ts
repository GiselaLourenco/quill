import { localDateKey } from "@/lib/date-br";

export type SessionForStats = {
  started_at: string;
  duration_seconds: number | null;
  unit_end: number | null;
  created_at: string;
};

export type ReadingStats = {
  totalSeconds: number;
  daysRead: number;
  currentPage: number;
  pagesPerDay: number;
  pagesPerHour: number;
};

export type PositionSession = {
  item_id?: string;
  unit_end: number | null;
  chapter_end?: number | null;
  created_at: string;
};

/**
 * Posição mais recente (página/capítulo) a partir das sessões de UM livro —
 * "mais recente" por `created_at`, não o maior valor já visto. Página e
 * capítulo são rastreados de forma independente: uma sessão normalmente só
 * preenche um dos dois, e a correção manual (editor de posição) não pode
 * "contaminar" o outro.
 *
 * O maior valor já visto quebrava a correção pra baixo: se alguém já tinha
 * registrado a pág. 418 por engano e corrige pra 31, o maior valor continua
 * sendo 418 pra sempre — a posição "atual" trava no erro em vez de aceitar o
 * conserto.
 */
export function posicaoAtual(sessions: PositionSession[]): {
  paginas: number;
  capitulos: number;
} {
  let paginas = 0;
  let paginasAt = "";
  let capitulos = 0;
  let capitulosAt = "";
  for (const s of sessions) {
    if (s.unit_end != null && s.created_at > paginasAt) {
      paginas = s.unit_end;
      paginasAt = s.created_at;
    }
    if (s.chapter_end != null && s.created_at > capitulosAt) {
      capitulos = s.chapter_end;
      capitulosAt = s.created_at;
    }
  }
  return { paginas, capitulos };
}

/** Mesma ideia que `posicaoAtual`, para sessões de vários livros de uma vez
 * (estante, amigos) — separa por `item_id` e aplica a mesma lógica a cada um. */
export function posicaoAtualPorItem(
  sessions: (PositionSession & { item_id: string })[],
): Map<string, { paginas: number; capitulos: number }> {
  const porItem = new Map<string, PositionSession[]>();
  for (const s of sessions) {
    const lista = porItem.get(s.item_id);
    if (lista) lista.push(s);
    else porItem.set(s.item_id, [s]);
  }
  const out = new Map<string, { paginas: number; capitulos: number }>();
  for (const [itemId, lista] of porItem) out.set(itemId, posicaoAtual(lista));
  return out;
}

export function computeReadingStats(sessions: SessionForStats[]): ReadingStats {
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0,
  );

  const days = new Set(
    sessions.map((s) => localDateKey(s.started_at)), // YYYY-MM-DD, fuso do Brasil
  );

  const currentPage = posicaoAtual(sessions).paginas;

  const daysRead = days.size;
  const pagesPerDay = daysRead > 0 ? Math.round(currentPage / daysRead) : 0;
  const pagesPerHour =
    totalSeconds > 0 ? Math.round((currentPage / totalSeconds) * 3600) : 0;

  return { totalSeconds, daysRead, currentPage, pagesPerDay, pagesPerHour };
}

// "Nesse ritmo, você termina em ~X dias (dd/mm)" — usa o ritmo médio do
// livro (não só os últimos dias, por simplicidade) e as páginas restantes.
export function predictFinish(
  stats: ReadingStats,
  totalUnits: number | null,
): { daysRemaining: number; dateLabel: string } | null {
  if (!totalUnits) return null;
  const pagesRemaining = totalUnits - stats.currentPage;
  if (pagesRemaining <= 0 || stats.pagesPerDay <= 0) return null;

  const daysRemaining = Math.ceil(pagesRemaining / stats.pagesPerDay);
  const target = new Date(Date.now() + daysRemaining * 86_400_000);
  const dateLabel = `${String(target.getDate()).padStart(2, "0")}/${String(
    target.getMonth() + 1,
  ).padStart(2, "0")}`;

  return { daysRemaining, dateLabel };
}

export type GlobalStats = { totalSeconds: number; daysRead: number };

// Estatísticas globais (aba "Quill") — não dependem de um livro específico,
// então não fazem sentido páginas/dia ou posição atual.
export function computeGlobalStats(
  sessions: { started_at: string; duration_seconds: number | null }[],
): GlobalStats {
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0,
  );
  const days = new Set(sessions.map((s) => localDateKey(s.started_at)));
  return { totalSeconds, daysRead: days.size };
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

export function formatTimer(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export type SessionForStats = {
  started_at: string;
  duration_seconds: number | null;
  unit_end: number | null;
};

export type ReadingStats = {
  totalSeconds: number;
  daysRead: number;
  currentPage: number;
  pagesPerDay: number;
  pagesPerHour: number;
};

export function computeReadingStats(sessions: SessionForStats[]): ReadingStats {
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0,
  );

  const days = new Set(
    sessions.map((s) => s.started_at.slice(0, 10)), // YYYY-MM-DD
  );

  const currentPage = sessions.reduce(
    (max, s) => Math.max(max, s.unit_end ?? 0),
    0,
  );

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
  const days = new Set(sessions.map((s) => s.started_at.slice(0, 10)));
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

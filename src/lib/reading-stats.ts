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

  return { totalSeconds, daysRead, currentPage, pagesPerDay };
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

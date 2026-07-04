import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import {
  computeStreak,
  mostCommonTag,
  weekKey,
  TAG_LABELS,
  type SessionRow,
} from "@/lib/gamification";
import { formatDuration } from "@/lib/reading-stats";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthRange(ref: string) {
  const [y, m] = ref.split("-").map(Number);
  const start = `${y}-${pad(m)}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function summarize(sessions: SessionRow[], start: string, end: string) {
  const inRange = sessions.filter((s) => {
    const key = s.started_at.slice(0, 10);
    return key >= start && key <= end;
  });
  const totalSeconds = inRange.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
  const pagesRead = inRange.reduce((sum, s) => {
    if (s.item_id && s.unit_start != null && s.unit_end != null) {
      return sum + Math.max(0, s.unit_end - s.unit_start);
    }
    return sum;
  }, 0);
  const daysRead = new Set(inRange.map((s) => s.started_at.slice(0, 10))).size;
  return { inRange, totalSeconds, pagesRead, daysRead };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function RetrospectivaPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; ref?: string }>;
}) {
  await requireUserId();
  const { period: periodParam, ref: refParam } = await searchParams;
  const period = periodParam === "week" ? "week" : "month";
  const today = new Date().toISOString().slice(0, 10);
  const ref = refParam ?? today;

  const { start, end, label } =
    period === "week"
      ? (() => {
          const s = weekKey(ref);
          const e = addDays(s, 6);
          return { start: s, end: e, label: `${s.slice(8, 10)}/${s.slice(5, 7)} – ${e.slice(8, 10)}/${e.slice(5, 7)}` };
        })()
      : (() => {
          const { start: s, end: e } = monthRange(ref);
          const monthIdx = Number(ref.split("-")[1]) - 1;
          return { start: s, end: e, label: `${MONTH_NAMES[monthIdx]} ${ref.slice(0, 4)}` };
        })();

  const periodLengthDays =
    Math.round((+new Date(`${end}T00:00:00Z`) - +new Date(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(periodLengthDays - 1));

  const prevRef = period === "week" ? addDays(ref, -7) : (() => {
    const [y, m] = ref.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.toISOString().slice(0, 10);
  })();
  const nextRef = period === "week" ? addDays(ref, 7) : (() => {
    const [y, m] = ref.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return d.toISOString().slice(0, 10);
  })();

  const supabase = await createClient();
  const [{ data: sessions }, { count: booksFinished }] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id")
      .gte("started_at", `${prevStart}T00:00:00`)
      .lte("started_at", `${end}T23:59:59`),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("finished_at", start)
      .lte("finished_at", end),
  ]);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const current = summarize(sessionRows, start, end);
  const previous = summarize(sessionRows, prevStart, prevEnd);
  const longestStreak = computeStreak(current.inRange).record;
  const topTag = mostCommonTag(current.inRange);

  const timeChange = percentChange(current.totalSeconds, previous.totalSeconds);
  const pagesChange = percentChange(current.pagesRead, previous.pagesRead);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Retrospectiva</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="mb-3 flex overflow-hidden rounded-md border-2 border-ink">
          <Link
            href={`/retrospectiva?period=week&ref=${today}`}
            className={`flex-1 py-1.5 text-center text-xs font-medium ${
              period === "week" ? "bg-moss-dark text-paper" : "bg-white text-ink"
            }`}
          >
            Semana
          </Link>
          <Link
            href={`/retrospectiva?period=month&ref=${today}`}
            className={`flex-1 py-1.5 text-center text-xs font-medium ${
              period === "month" ? "bg-moss-dark text-paper" : "bg-white text-ink"
            }`}
          >
            Mês
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/retrospectiva?period=${period}&ref=${prevRef}`}
            aria-label="Período anterior"
            className="px-2 text-lg"
          >
            ‹
          </Link>
          <span className="text-sm font-medium">{label}</span>
          <Link
            href={`/retrospectiva?period=${period}&ref=${nextRef}`}
            aria-label="Próximo período"
            className="px-2 text-lg"
          >
            ›
          </Link>
        </div>

        <div className="rounded-xl border-2 border-ink bg-navy p-5 text-center text-paper">
          <div className="font-serif text-2xl font-semibold">
            {booksFinished ?? 0} {booksFinished === 1 ? "livro" : "livros"}
          </div>
          <div className="mb-4 text-[11px] opacity-75">terminados no período</div>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div>
              <div className="font-serif text-lg font-semibold">
                {formatDuration(current.totalSeconds)}
              </div>
              <div className="text-[10px] opacity-70">
                tempo lido
                {timeChange !== null && (
                  <> · {timeChange >= 0 ? "+" : ""}{timeChange}% vs. anterior</>
                )}
              </div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">{current.pagesRead} pág</div>
              <div className="text-[10px] opacity-70">
                páginas lidas
                {pagesChange !== null && (
                  <> · {pagesChange >= 0 ? "+" : ""}{pagesChange}% vs. anterior</>
                )}
              </div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">
                {current.daysRead} {current.daysRead === 1 ? "dia" : "dias"}
              </div>
              <div className="text-[10px] opacity-70">dias com leitura</div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">
                {longestStreak} {longestStreak === 1 ? "dia" : "dias"}
              </div>
              <div className="text-[10px] opacity-70">maior sequência</div>
            </div>
          </div>
          {topTag && (
            <div className="mt-3 border-t border-paper/20 pt-3 text-[11px] opacity-80">
              tag mais comum: &quot;{TAG_LABELS[topTag] ?? topTag}&quot;
            </div>
          )}
        </div>
      </main>
    </>
  );
}

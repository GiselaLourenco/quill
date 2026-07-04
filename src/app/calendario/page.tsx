import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { HeatmapGrid } from "@/components/heatmap-grid";
import {
  computeStreak,
  computeConsecutiveWeeks,
  computeDailyMinutes,
  dateRange,
  type SessionRow,
} from "@/lib/gamification";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  await requireUserId();
  const { y, m } = await searchParams;

  const now = new Date();
  const year = y ? Number(y) : now.getFullYear();
  const month = m ? Number(m) : now.getMonth() + 1; // 1-12

  const firstDay = `${year}-${pad(month)}-01`;
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  const lastDay = lastDayDate.toISOString().slice(0, 10);

  let prevYear = year, prevMonth = month - 1;
  if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
  let nextYear = year, nextMonth = month + 1;
  if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id");

  const sessionRows = (sessions ?? []) as SessionRow[];
  const streak = computeStreak(sessionRows);
  const consecutiveWeeks = computeConsecutiveWeeks(sessionRows);

  const dailyMinutes = computeDailyMinutes(sessionRows, firstDay, lastDay);
  const days = dateRange(firstDay, lastDay).map((date) => ({
    date,
    minutes: dailyMinutes.get(date) ?? 0,
  }));

  const firstWeekday = new Date(`${firstDay}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Calendário</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/calendario?y=${prevYear}&m=${prevMonth}`}
            aria-label="Mês anterior"
            className="px-2 text-lg"
          >
            ‹
          </Link>
          <span className="text-sm font-medium">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Link
            href={`/calendario?y=${nextYear}&m=${nextMonth}`}
            aria-label="Próximo mês"
            className="px-2 text-lg"
          >
            ›
          </Link>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] text-ink/55">
          <span>D</span><span>S</span><span>T</span><span>Q</span>
          <span>Q</span><span>S</span><span>S</span>
        </div>
        <HeatmapGrid days={days} todayKey={today} leadingBlanks={firstWeekday} />

        <div className="mt-5 flex gap-2">
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">{streak.current}</div>
            <div className="text-[10px] text-ink/65">seq. atual</div>
          </div>
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">{streak.record}</div>
            <div className="text-[10px] text-ink/65">recorde</div>
          </div>
          <div className="flex-1 rounded-md border-2 border-cover-border py-2 text-center">
            <div className="font-serif text-base font-semibold">{consecutiveWeeks}</div>
            <div className="text-[10px] text-ink/65">sem. seguidas</div>
          </div>
        </div>
      </main>
    </>
  );
}

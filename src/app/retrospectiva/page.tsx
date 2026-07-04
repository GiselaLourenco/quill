import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import {
  computeStreak,
  mostCommonTag,
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

export default async function RetrospectivaPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  await requireUserId();
  const { y, m } = await searchParams;

  const now = new Date();
  const year = y ? Number(y) : now.getFullYear();
  const month = m ? Number(m) : now.getMonth() + 1;

  const firstDay = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  let prevYear = year, prevMonth = month - 1;
  if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
  let nextYear = year, nextMonth = month + 1;
  if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

  const supabase = await createClient();
  const [{ data: sessions }, { count: booksFinished }] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id")
      .gte("started_at", `${firstDay}T00:00:00`)
      .lte("started_at", `${lastDay}T23:59:59`),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("finished_at", firstDay)
      .lte("finished_at", lastDay),
  ]);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const totalSeconds = sessionRows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  const daysRead = new Set(sessionRows.map((s) => s.started_at.slice(0, 10))).size;
  const longestStreak = computeStreak(sessionRows).record;
  const topTag = mostCommonTag(sessionRows);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Retrospectiva</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/retrospectiva?y=${prevYear}&m=${prevMonth}`}
            aria-label="Mês anterior"
            className="px-2 text-lg"
          >
            ‹
          </Link>
          <span className="text-sm font-medium">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Link
            href={`/retrospectiva?y=${nextYear}&m=${nextMonth}`}
            aria-label="Próximo mês"
            className="px-2 text-lg"
          >
            ›
          </Link>
        </div>

        <div className="rounded-xl border-2 border-ink bg-navy p-5 text-center text-paper">
          <div className="font-serif text-2xl font-semibold">
            {booksFinished ?? 0} {booksFinished === 1 ? "livro" : "livros"}
          </div>
          <div className="mb-4 text-[11px] opacity-75">
            terminados em {MONTH_NAMES[month - 1].toLowerCase()}
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div>
              <div className="font-serif text-lg font-semibold">
                {formatDuration(totalSeconds)}
              </div>
              <div className="text-[10px] opacity-70">tempo lido</div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">
                {daysRead} {daysRead === 1 ? "dia" : "dias"}
              </div>
              <div className="text-[10px] opacity-70">dias com leitura</div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">
                {longestStreak} {longestStreak === 1 ? "dia" : "dias"}
              </div>
              <div className="text-[10px] opacity-70">maior sequência</div>
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">
                {topTag ? `"${TAG_LABELS[topTag] ?? topTag}"` : "—"}
              </div>
              <div className="text-[10px] opacity-70">tag mais comum</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

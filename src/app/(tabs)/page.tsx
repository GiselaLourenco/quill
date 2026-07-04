import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { SiteHeader } from "@/components/site-header";
import { HeatmapGrid } from "@/components/heatmap-grid";
import {
  computeStreak,
  computePagesPerDay,
  computeMinutesPerDay,
  computeFocusRate,
  computeChaptersPerWeek,
  computeBestTimeOfDay,
  computeDailyMinutes,
  dateRange,
  goalProgress,
  type SessionRow,
} from "@/lib/gamification";
import { DEFAULT_PILLS, isPillKey, pillDisplay, type PillStats } from "@/lib/pills";

export default async function QuillHomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(now.getTime() - 13 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const year = now.getFullYear();

  const [
    { data: profile },
    { data: sessions },
    { count: booksFinished },
    { count: finishedThisYear },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, metrics_prefs")
      .eq("id", userId)
      .single(),
    supabase
      .from("sessions")
      .select(
        "started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id",
      ),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished"),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("finished_at", `${year}-01-01`)
      .lte("finished_at", `${year}-12-31`),
    supabase.from("goals").select("id, type, target_value, period_start").limit(2),
  ]);

  const sessionRows = (sessions ?? []) as SessionRow[];

  const stats: PillStats = {
    streak: computeStreak(sessionRows),
    pagesPerDay: computePagesPerDay(sessionRows),
    minutesPerDay: computeMinutesPerDay(sessionRows),
    booksFinished: booksFinished ?? 0,
    focusRate: computeFocusRate(sessionRows),
    chaptersPerWeek: computeChaptersPerWeek(sessionRows),
    bestTime: computeBestTimeOfDay(sessionRows),
  };

  const rawPrefs = Array.isArray(profile?.metrics_prefs)
    ? (profile!.metrics_prefs as string[])
    : [];
  const selectedPills = (rawPrefs.filter(isPillKey).length > 0
    ? rawPrefs.filter(isPillKey)
    : DEFAULT_PILLS
  ) as (typeof DEFAULT_PILLS)[number][];

  const dailyMinutes = computeDailyMinutes(sessionRows, fourteenDaysAgo, today);
  const heatDays = dateRange(fourteenDaysAgo, today).map((date) => ({
    date,
    minutes: dailyMinutes.get(date) ?? 0,
  }));

  const goalCtx = {
    pagesPerDay: stats.pagesPerDay,
    minutesPerDay: stats.minutesPerDay,
    finishedThisYear: finishedThisYear ?? 0,
  };

  return (
    <>
      <SiteHeader displayName={profile?.display_name ?? null} />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-ink/65">Seu progresso de leitura</span>
          <Link
            href="/personalizar"
            className="text-[11.5px] font-medium text-moss-dark"
          >
            Personalizar
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {selectedPills.map((key) => {
            const { value, label } = pillDisplay(key, stats);
            return (
              <div
                key={key}
                className="rounded-md border-2 border-cover-border py-3 text-center"
              >
                <div className="font-serif text-lg font-semibold">{value}</div>
                <div className="text-[10.5px] text-ink/65">{label}</div>
              </div>
            );
          })}
        </div>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Calendário</span>
            <Link href="/calendario" className="text-[11.5px] font-medium text-moss-dark">
              ver completo
            </Link>
          </div>
          <HeatmapGrid days={heatDays} todayKey={today} />
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Metas</span>
            <Link href="/metas" className="text-[11.5px] font-medium text-moss-dark">
              ver todas
            </Link>
          </div>
          {goals && goals.length > 0 ? (
            <div className="flex flex-col gap-2">
              {goals.map((g) => {
                const progress = goalProgress(g, goalCtx);
                return (
                  <div
                    key={g.id}
                    className="rounded-md border-2 border-cover-border px-3 py-2.5"
                  >
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span>{progress.label}</span>
                      <span className="text-ink/65">
                        {progress.current} / {g.target_value}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full border border-cover-border bg-white">
                      <div
                        className="h-full bg-moss-dark"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Link
              href="/metas"
              className="block rounded-md border-2 border-dashed border-cover-border px-3 py-3 text-center text-xs text-ink/65"
            >
              Criar sua primeira meta
            </Link>
          )}
        </section>

        <section className="mt-5">
          <Link
            href="/retrospectiva"
            className="block rounded-md border-2 border-ink bg-navy px-4 py-3 text-center font-display text-sm text-paper shadow-hard-sm"
          >
            Ver retrospectiva
          </Link>
        </section>
      </main>
    </>
  );
}
